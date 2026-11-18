
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class GasData(BaseModel):
    mq4_response_pct: float | None = Field(default=None, ge=0)
    mq136_response_pct: float | None = Field(default=None, ge=0)
    status: Literal["NORMAL", "MEDIUM", "HIGH", "UNKNOWN"]


class EnvironmentData(BaseModel):
    temperature_c: float | None = None
    humidity_pct: float | None = Field(default=None, ge=0, le=100)


class WorkerData(BaseModel):
    movement_detected: bool
    no_movement_alert: bool = False
    sos_pressed: bool = False
    sensor_valid: bool = True


class SensorData(BaseModel):
    mq4_valid: bool
    mq136_valid: bool
    dht11_valid: bool


class NodeData(BaseModel):
    probe_online: bool
    worker_online: bool
    surface_online: bool


class ActuatorData(BaseModel):
    fan_status: bool
    buzzer_status: bool
    red_led_status: bool
    green_led_status: bool


class ReadingIn(BaseModel):
    schema_version: str = "1.0"
    manhole_id: str
    timestamp: datetime | None = None
    data_source: Literal["demo", "hardware"] = "demo"

    gas: GasData
    environment: EnvironmentData
    worker: WorkerData
    sensors: SensorData
    nodes: NodeData
    actuators: ActuatorData


class ReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    manhole_id: str
    recorded_at: datetime
    mq4_response_pct: float | None
    mq136_response_pct: float | None
    temperature_c: float | None
    humidity_pct: float | None
    gas_status: str
    worker_motion: str
    sos_active: bool
    fan_on: bool
    sensor_valid: bool
    fault_message: str | None
