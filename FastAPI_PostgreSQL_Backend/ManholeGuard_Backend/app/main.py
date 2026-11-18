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
def create_reading(payload: ReadingIn, db: Session = Depends(get_db)):
    if not db.get(models.Manhole, payload.manhole_id):
        raise HTTPException(404, "Unknown manhole_id. Seed the six manholes first.")
    data = payload.model_dump()
    timestamp = data.pop("timestamp") or datetime.now(timezone.utc)
    nodes = {
        "PROBE": data.pop("probe_connected"),
        "WORKER": data.pop("worker_connected"),
        "SURFACE": data.pop("surface_connected"),
    }
    reading = models.SensorReading(**data, recorded_at=timestamp)
    db.add(reading)
    for node_type, connected in nodes.items():
        db.add(models.NodeHealth(manhole_id=payload.manhole_id, node_type=node_type, connected=connected))
    if payload.sos_active:
        db.add(models.WorkerEvent(manhole_id=payload.manhole_id, event_type="SOS", details="SOS button activated"))
        db.add(models.Alert(manhole_id=payload.manhole_id, severity="CRITICAL", message="Worker SOS activated"))
    elif payload.gas_status in ("HIGH", "MEDIUM"):
        db.add(models.Alert(manhole_id=payload.manhole_id, severity=payload.gas_status,
                             message=f"Gas response status: {payload.gas_status}"))
    if not payload.sensor_valid:
        db.add(models.Alert(manhole_id=payload.manhole_id, severity="FAULT",
                             message=payload.fault_message or "Sensor fault reported"))
    db.commit()
    db.refresh(reading)
    return reading
