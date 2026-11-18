from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


class ReadingIn(BaseModel):
    manhole_id: str
    # Accepted for compatibility with existing ESP32 payloads, but the API
    # deliberately ignores it and records server receipt time instead.
    timestamp: datetime | None = None
    mq4_response_pct: float | None = Field(default=None, ge=0)
    mq136_response_pct: float | None = Field(default=None, ge=0)
    temperature_c: float | None = None
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    gas_status: Literal["NORMAL", "MEDIUM", "HIGH", "UNKNOWN"]
    worker_motion: Literal["INSIDE", "OUTSIDE", "UNKNOWN"] = "UNKNOWN"
    sos_active: bool = False
    fan_on: bool = False
    probe_connected: bool = True
    worker_connected: bool = True
    surface_connected: bool = True
    sensor_valid: bool = True
    fault_message: str | None = None
    buzzer_status: bool = False
    red_led_status: bool = False
    green_led_status: bool = False


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
    probe_connected: bool = True
    worker_connected: bool = True
    surface_connected: bool = True
    buzzer_status: bool = False
    red_led_status: bool = False
    green_led_status: bool = False
