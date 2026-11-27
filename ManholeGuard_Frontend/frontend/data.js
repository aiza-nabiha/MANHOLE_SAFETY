
const API_BASE = "https://manhole-safety-ace4.onrender.com";

let MANHOLES = [];
let ALERTS = [];

function formatTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function timeAgo(value) {
    if (!value) return "—";

    const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 1000)
    );

    if (!Number.isFinite(seconds)) return "—";
    if (seconds < 60) return `${seconds} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;

    return `${Math.floor(seconds / 3600)} hr ago`;
}

function normalizeManhole(item) {
    const reading = item.latest_reading || {};
    const nodes = item.nodes || {};

    const gasStatus = reading.gas_status;

    let status;

    if (["NORMAL", "MEDIUM", "HIGH"].includes(gasStatus)) {
        status = gasStatus;
    } else if (item.connection_status === "OFFLINE") {
        status = "OFFLINE";
    } else if (reading.sensor_valid === false) {
        status = "FAULT";
    } else {
        status = "UNKNOWN";
    }

    return {
        id: item.id,
        location: item.location || item.name || "Unknown location",
        status,

        mq4: reading.mq4_response_pct ?? null,
        mq136: reading.mq136_response_pct ?? null,

        temp: reading.temperature_c ?? null,
        humidity: reading.humidity_pct ?? null,

        worker: reading.worker_motion || "UNKNOWN",
        motion: reading.worker_motion === "INSIDE",

        sos: reading.sos_active === true,
        fan: reading.fan_on === true,

        probe: nodes.PROBE ? "ONLINE" : "OFFLINE",
        workerNode: nodes.WORKER ? "ONLINE" : "OFFLINE",
        surface: nodes.SURFACE ? "ONLINE" : "OFFLINE",

        recordedAt: reading.recorded_at || null,
        updated: timeAgo(reading.recorded_at),

        sensorValid: reading.sensor_valid,
        faultMessage: reading.fault_message || null,

        buzzer: reading.buzzer_status === true,
        redLed: reading.red_led_status === true,
        greenLed: reading.green_led_status === true,

        overallStatus: item.overall_status || null
    };
}

function normalizeAlert(item) {
    const message = item.message || "System event";
    const severity = item.severity || "UNKNOWN";

    let type = severity;

    if (severity === "CRITICAL") {
        type = message.toUpperCase().includes("SOS") ? "SOS" : "HIGH";
    }

    return {
        id: item.id,
        manholeId: item.manhole_id,
        type,
        title: message,
        desc: `Severity: ${severity}`,
        time: formatTime(item.created_at),
        active: !item.acknowledged
    };
}

async function fetchJSON(path) {
    const response = await fetch(`${API_BASE}${path}`);

    if (!response.ok) {
        throw new Error(`API error ${response.status}: ${path}`);
    }

    return response.json();
}

async function refreshData() {
    const [manholes, alerts] = await Promise.all([
        fetchJSON("/api/manholes"),
        fetchJSON("/api/alerts")
    ]);

    MANHOLES = manholes.map(normalizeManhole);
    ALERTS = alerts.map(normalizeAlert);

    return true;
}

async function getHistory(id) {
    const records = await fetchJSON(
        `/api/manholes/${encodeURIComponent(id)}/history`
    );

    const sorted = [...records].sort(
        (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
    );

    return {
        labels: sorted.map(r => formatTime(r.recorded_at)),
        mq4: sorted.map(r => r.mq4_response_pct ?? null),
        mq136: sorted.map(r => r.mq136_response_pct ?? null),
    };
}
