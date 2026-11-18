from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Manhole(Base):
    __tablename__ = "manholes"
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(150))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    manhole_id: Mapped[str] = mapped_column(
        ForeignKey("manholes.id"), index=True
    )

    recorded_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    mq4_response_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    mq136_response_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    gas_status: Mapped[str] = mapped_column(String(20), default="UNKNOWN")
    worker_motion: Mapped[str] = mapped_column(String(20), default="UNKNOWN")
    sos_active: Mapped[bool] = mapped_column(Boolean, default=False)

    fan_on: Mapped[bool] = mapped_column(Boolean, default=False)
    buzzer_status: Mapped[bool] = mapped_column(Boolean, default=False)
    red_led_status: Mapped[bool] = mapped_column(Boolean, default=False)
    green_led_status: Mapped[bool] = mapped_column(Boolean, default=False)

    sensor_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    fault_message: Mapped[str | None] = mapped_column(Text, nullable=True)

class NodeHealth(Base):
    __tablename__ = "node_health"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    manhole_id: Mapped[str] = mapped_column(ForeignKey("manholes.id"), index=True)
    node_type: Mapped[str] = mapped_column(String(20))
    connected: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class WorkerEvent(Base):
    __tablename__ = "worker_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    manhole_id: Mapped[str] = mapped_column(ForeignKey("manholes.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(30))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    manhole_id: Mapped[str] = mapped_column(ForeignKey("manholes.id"), index=True)
    severity: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(Text)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
