-- Additive migration for databases created with an earlier Manhole Guard schema.
-- Safe to run more than once; it does not delete or rewrite existing readings.
ALTER TABLE sensor_readings
    ADD COLUMN IF NOT EXISTS probe_connected BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS worker_connected BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS surface_connected BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS buzzer_status BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS red_led_status BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS green_led_status BOOLEAN NOT NULL DEFAULT FALSE;
