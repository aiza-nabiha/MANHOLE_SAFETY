from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, select
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from . import models
from .schemas import ReadingIn, ReadingOut

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Manhole Guard API", version="1.0.0",
              description="Demo backend for six manholes. MQ values are relative response increases (%), not ppm or LEL.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root():
    return {"message": "Manhole Guard API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/manholes")
def get_manholes(db: Session = Depends(get_db)):
    result = []
    for m in db.scalars(select(models.Manhole).order_by(models.Manhole.id)).all():
        latest = db.scalar(select(models.SensorReading).where(
            models.SensorReading.manhole_id == m.id
        ).order_by(desc(models.SensorReading.recorded_at)).limit(1))
        nodes = db.scalars(select(models.NodeHealth).where(models.NodeHealth.manhole_id == m.id)).all()
        result.append({
            "id": m.id, "name": m.name, "location": m.location,
            "latest_reading": ReadingOut.model_validate(latest).model_dump(mode="json") if latest else None,
            "nodes": {n.node_type: n.connected for n in nodes}
        })
    return result

@app.get("/api/manholes/{manhole_id}")
def get_manhole(manhole_id: str, db: Session = Depends(get_db)):
    m = db.get(models.Manhole, manhole_id)
    if not m:
        raise HTTPException(404, "Manhole not found")
    latest = db.scalar(select(models.SensorReading).where(
        models.SensorReading.manhole_id == manhole_id
    ).order_by(desc(models.SensorReading.recorded_at)).limit(1))
    nodes = db.scalars(select(models.NodeHealth).where(models.NodeHealth.manhole_id == manhole_id)).all()
    return {"id": m.id, "name": m.name, "location": m.location,
            "latest_reading": ReadingOut.model_validate(latest).model_dump(mode="json") if latest else None,
            "nodes": {n.node_type: n.connected for n in nodes}}

@app.get("/api/manholes/{manhole_id}/history", response_model=list[ReadingOut])
def get_history(manhole_id: str, limit: int = Query(100, ge=1, le=1000), db: Session = Depends(get_db)):
    if not db.get(models.Manhole, manhole_id):
        raise HTTPException(404, "Manhole not found")
    return db.scalars(select(models.SensorReading).where(
        models.SensorReading.manhole_id == manhole_id
    ).order_by(desc(models.SensorReading.recorded_at)).limit(limit)).all()

@app.get("/api/alerts")
def get_alerts(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    return db.scalars(select(models.Alert).order_by(desc(models.Alert.created_at)).limit(limit)).all()

@app.post("/api/readings", response_model=ReadingOut, status_code=201)

@app.post("/api/readings", response_model=ReadingOut, status_code=201)
def create_reading(
    payload: ReadingIn,
    db: Session = Depends(get_db)
):
    if not db.get(models.Manhole, payload.manhole_id):
        raise HTTPException(status_code=404, detail="Manhole not found")

    # Convert nested JSON into database columns
    sensor_valid = (
        payload.worker.sensor_valid
        and payload.sensors.mq4_valid
        and payload.sensors.mq136_valid
        and payload.sensors.dht11_valid
    )

    worker_motion = (
        "ACTIVE" if payload.worker.movement_detected
        else "NO_MOVEMENT"
    )

    fault_parts = []
    if not payload.sensors.mq4_valid:
        fault_parts.append("MQ4 sensor fault")
    if not payload.sensors.mq136_valid:
        fault_parts.append("MQ136 sensor fault")
    if not payload.sensors.dht11_valid:
        fault_parts.append("DHT11 sensor fault")
    if not payload.worker.sensor_valid:
        fault_parts.append("Worker sensor fault")
    if payload.worker.no_movement_alert:
        fault_parts.append("Worker no-movement alert")

    reading = models.SensorReading(
        manhole_id=payload.manhole_id,
        recorded_at=payload.timestamp or datetime.now(timezone.utc),

        mq4_response_pct=payload.gas.mq4_response_pct,
        mq136_response_pct=payload.gas.mq136_response_pct,
        temperature_c=payload.environment.temperature_c,
        humidity_pct=payload.environment.humidity_pct,

        gas_status=payload.gas.status,
        worker_motion=worker_motion,
        sos_active=payload.worker.sos_pressed,

        fan_on=payload.actuators.fan_status,
        buzzer_status=payload.actuators.buzzer_status,
        red_led_status=payload.actuators.red_led_status,
        green_led_status=payload.actuators.green_led_status,

        sensor_valid=sensor_valid,
        fault_message="; ".join(fault_parts) if fault_parts else None
    )

    db.add(reading)

    # Save latest connectivity for all three nodes
    node_status = {
        "PROBE": payload.nodes.probe_online,
        "WORKER": payload.nodes.worker_online,
        "SURFACE": payload.nodes.surface_online
    }

    for node_type, connected in node_status.items():
        db.add(models.NodeHealth(
            manhole_id=payload.manhole_id,
            node_type=node_type,
            connected=connected
        ))

    # Save worker events and alerts
    if payload.worker.sos_pressed:
        db.add(models.WorkerEvent(
            manhole_id=payload.manhole_id,
            event_type="SOS",
            details="Worker SOS button activated"
        ))
        db.add(models.Alert(
            manhole_id=payload.manhole_id,
            severity="CRITICAL",
            message="Worker SOS activated"
        ))

    if payload.worker.no_movement_alert:
        db.add(models.WorkerEvent(
            manhole_id=payload.manhole_id,
            event_type="NO_MOVEMENT",
            details="Worker no-movement alert"
        ))
        db.add(models.Alert(
            manhole_id=payload.manhole_id,
            severity="WARNING",
            message="Worker no-movement alert"
        ))

    if payload.gas.status in ("HIGH", "MEDIUM"):
        db.add(models.Alert(
            manhole_id=payload.manhole_id,
            severity=payload.gas.status,
            message=f"Gas response status: {payload.gas.status}"
        ))

    if not sensor_valid:
        db.add(models.Alert(
            manhole_id=payload.manhole_id,
            severity="FAULT",
            message="; ".join(fault_parts) or "Sensor fault"
        ))

    if not all(node_status.values()):
        db.add(models.Alert(
            manhole_id=payload.manhole_id,
            severity="FAULT",
            message="One or more nodes are offline"
        ))

    db.commit()
    db.refresh(reading)

    return reading
