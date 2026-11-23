import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models
from .schemas import ReadingIn, ReadingOut

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Manhole Guard API",
    version="1.1.0",
    description=(
        "Manhole monitoring API. MQ-4 and MQ-136 values are relative response "
        "increases (%), not ppm or LEL. Status thresholds are provisional demo classifications."
    ),
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

OFFLINE_AFTER_SECONDS = max(1, int(os.getenv("OFFLINE_AFTER_SECONDS", "30")))


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    expected = os.getenv("API_KEY", "")
    if not expected:
        # Fail closed: do not accept writes if the server secret was not configured.
        raise HTTPException(status_code=503, detail="API key authentication is not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def _latest_reading(db: Session, manhole_id: str):
    return db.scalar(
        select(models.SensorReading)
        .where(models.SensorReading.manhole_id == manhole_id)
        .order_by(desc(models.SensorReading.recorded_at), desc(models.SensorReading.id))
        .limit(1)
    )


def _latest_nodes(db: Session, manhole_id: str) -> dict[str, bool]:
    rows = db.scalars(
        select(models.NodeHealth)
        .where(models.NodeHealth.manhole_id == manhole_id)
        .order_by(desc(models.NodeHealth.checked_at), desc(models.NodeHealth.id))
    ).all()
    latest: dict[str, bool] = {}
    for row in rows:
        latest.setdefault(row.node_type, row.connected)
    return latest



def _manhole_payload(db: Session, manhole: models.Manhole) -> dict:
    latest = _latest_reading(db, manhole.id)
    is_online = False
    reading_payload = None

    if latest is not None:
        recorded_at = latest.recorded_at

        if recorded_at.tzinfo is None:
            recorded_at = recorded_at.replace(tzinfo=timezone.utc)

        is_online = (
            datetime.now(timezone.utc) - recorded_at
            <= timedelta(seconds=OFFLINE_AFTER_SECONDS)
        )

        reading_payload = ReadingOut.model_validate(
            latest
        ).model_dump(mode="json")

        if not is_online:
            reading_payload["gas_status"] = "UNKNOWN"

    # Overall manhole status priority
    if not is_online:
        overall_status = "OFFLINE"
    elif latest.sos_active:
        overall_status = "EMERGENCY"
    elif not latest.sensor_valid:
        overall_status = "FAULT"
    elif latest.gas_status == "HIGH":
        overall_status = "DANGER"
    elif latest.gas_status == "MEDIUM":
        overall_status = "WARNING"
    elif latest.gas_status == "NORMAL":
        overall_status = "SAFE"
    else:
        overall_status = "UNKNOWN"

    return {
        "id": manhole.id,
        "name": manhole.name,
        "location": manhole.location,
        "connection_status": "ONLINE" if is_online else "OFFLINE",
        "overall_status": overall_status,
        "latest_reading": reading_payload,
        "nodes": _latest_nodes(db, manhole.id),
    }


def _create_alert_if_needed(
    db: Session, manhole_id: str, severity: str, message: str
) -> None:
    existing = db.scalar(
        select(models.Alert.id)
        .where(
            models.Alert.manhole_id == manhole_id,
            models.Alert.severity == severity,
            models.Alert.message == message,
            models.Alert.acknowledged.is_(False),
        )
        .limit(1)
    )
    if existing is None:
        db.add(models.Alert(manhole_id=manhole_id, severity=severity, message=message))


@app.get("/")
def root():
    return {"message": "Manhole Guard API is running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/manholes")
def get_manholes(db: Session = Depends(get_db)):
    manholes = db.scalars(select(models.Manhole).order_by(models.Manhole.id)).all()
    
    return [_manhole_payload(db, manhole) for manhole in manholes]


@app.get("/api/manholes/{manhole_id}")
def get_manhole(manhole_id: str, db: Session = Depends(get_db)):
    manhole = db.get(models.Manhole, manhole_id)
    if not manhole:
        raise HTTPException(404, "Manhole not found")
    return _manhole_payload(db, manhole)


@app.get("/api/manholes/{manhole_id}/history", response_model=list[ReadingOut])
def get_history(
    manhole_id: str,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    if not db.get(models.Manhole, manhole_id):
        raise HTTPException(404, "Manhole not found")
    return db.scalars(
        select(models.SensorReading)
        .where(models.SensorReading.manhole_id == manhole_id)
        .order_by(desc(models.SensorReading.recorded_at), desc(models.SensorReading.id))
        .limit(limit)
    ).all()


@app.get("/api/alerts")
def get_alerts(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return db.scalars(
        select(models.Alert).order_by(desc(models.Alert.created_at), desc(models.Alert.id)).limit(limit)
    ).all()


@app.post("/api/readings", response_model=ReadingOut, status_code=201, dependencies=[Depends(require_api_key)])
def create_reading(payload: ReadingIn, db: Session = Depends(get_db)):
    if not db.get(models.Manhole, payload.manhole_id):
        raise HTTPException(404, "Unknown manhole_id. Run the seed step before accepting readings.")

    # Device timestamp is accepted for backwards compatibility but is never trusted.
    previous = _latest_reading(db, payload.manhole_id)
    reading_data = payload.model_dump(exclude={"timestamp"})
    node_values = {
        "PROBE": reading_data["probe_connected"],
        "WORKER": reading_data["worker_connected"],
        "SURFACE": reading_data["surface_connected"],
    }
    reading = models.SensorReading(
        **reading_data,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(reading)

    # Append-only health history is retained; reads consistently select the latest row.
    for node_type, connected in node_values.items():
        db.add(models.NodeHealth(manhole_id=payload.manhole_id, node_type=node_type, connected=connected))

    previous_gas_status = previous.gas_status if previous else None
    if payload.gas_status in ("MEDIUM", "HIGH") and previous_gas_status != payload.gas_status:
        _create_alert_if_needed(
            db, payload.manhole_id, payload.gas_status,
            f"Gas response status: {payload.gas_status}",
        )

    if payload.sos_active and not (previous and previous.sos_active):
        db.add(models.WorkerEvent(manhole_id=payload.manhole_id, event_type="SOS", details="SOS button activated"))
        _create_alert_if_needed(db, payload.manhole_id, "CRITICAL", "Worker SOS activated")

    if not payload.sensor_valid and (previous is None or previous.sensor_valid):
        _create_alert_if_needed(
            db, payload.manhole_id, "FAULT",
            payload.fault_message or "Sensor fault reported",
        )

    for node_type, connected in node_values.items():
        previously_connected = getattr(previous, {
            "PROBE": "probe_connected", "WORKER": "worker_connected",
            "SURFACE": "surface_connected",
        }[node_type], True) if previous else True
        if not connected and previously_connected:
            _create_alert_if_needed(
                db, payload.manhole_id, "OFFLINE", f"{node_type} node offline"
            )

    db.commit()
    db.refresh(reading)
    return reading
