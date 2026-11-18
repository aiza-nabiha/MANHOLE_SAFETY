from sqlalchemy import select
from .database import Base, engine, SessionLocal
from . import models

SAMPLE = [
    ("MH-01", "Central Road", "Central Road", 14, 8, 29, 55, "NORMAL", "OUTSIDE", False, False, True),
    ("MH-02", "Market Area", "Market Area", 27, 18, 31, 62, "MEDIUM", "INSIDE", False, True, True),
    ("MH-03", "Bus Stand", "Bus Stand", 58, 53, 33, 70, "HIGH", "INSIDE", True, True, True),
    ("MH-04", "Hospital Road", "Hospital Road", 11, 9, 28, 50, "NORMAL", "OUTSIDE", False, False, True),
    ("MH-05", "Green Park", "Green Park", 34, 24, 30, 64, "MEDIUM", "OUTSIDE", False, True, True),
    ("MH-06", "College Area", "College Area", None, None, None, None, "UNKNOWN", "UNKNOWN", False, False, False),
]

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for row in SAMPLE:
            mid, name, location, mq4, mq136, temp, humidity, status, motion, sos, fan, online = row
            if not db.get(models.Manhole, mid):
                db.add(models.Manhole(id=mid, name=name, location=location))
                db.flush()
                db.add(models.SensorReading(
                    manhole_id=mid, mq4_response_pct=mq4, mq136_response_pct=mq136,
                    temperature_c=temp, humidity_pct=humidity, gas_status=status,
                    worker_motion=motion, sos_active=sos, fan_on=fan,
                    sensor_valid=online, fault_message=None if online else "Demo node offline"
                ))
                for node in ("PROBE", "WORKER", "SURFACE"):
                    db.add(models.NodeHealth(manhole_id=mid, node_type=node, connected=online))
                if sos:
                    db.add(models.WorkerEvent(manhole_id=mid, event_type="SOS", details="Demo SOS event"))
                    db.add(models.Alert(manhole_id=mid, severity="CRITICAL", message="Demo worker SOS activated"))
                elif status in ("HIGH", "MEDIUM"):
                    db.add(models.Alert(manhole_id=mid, severity=status, message=f"Demo gas response: {status}"))
                if not online:
                    db.add(models.Alert(manhole_id=mid, severity="FAULT", message="Demo node offline"))
        db.commit()
        print("Seed complete: MH-01 to MH-06")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
