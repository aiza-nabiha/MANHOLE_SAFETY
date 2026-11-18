# Manhole Guard — FastAPI + PostgreSQL backend

This backend is a **demo/integration starter**, not a certified gas-safety system. MQ-4 and MQ-136 values are relative sensor response increases (%) only, not ppm or LEL. The NORMAL/MEDIUM/HIGH labels are demo classifications.

## 1. Create the PostgreSQL database
Install PostgreSQL, then create a database named `manhole_guard` (pgAdmin or psql):
```sql
CREATE DATABASE manhole_guard;
```
Copy `.env.example` to `.env` and replace `YOUR_PASSWORD` with your PostgreSQL password.

## 2. Install and run (Windows PowerShell)
Open terminal in this folder:
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```
If PowerShell blocks activation, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\activate
```

## 3. Test
Open http://127.0.0.1:8000/docs (Swagger UI).
- `GET /api/health`
- `GET /api/manholes`
- `GET /api/manholes/MH-03`
- `GET /api/manholes/MH-03/history`
- `GET /api/alerts`
- `POST /api/readings` — use the JSON in `sample_reading.json`

## Tables created
`manholes`, `sensor_readings`, `node_health`, `worker_events`, `alerts`.

## Data flow
Probe + Worker ESP32 nodes --ESP-NOW--> Surface ESP32 --Wi-Fi/HTTP POST--> FastAPI --> PostgreSQL --> website.

The Surface Node will later POST the same JSON shape to `/api/readings`. The browser website should call the GET endpoints. Update CORS `allow_origins` in `app/main.py` to your website origin before deployment.

## Important notes
- `MH-06` is deliberately seeded as offline. Offline/unknown is not treated as NORMAL.
- `POST /api/readings` stores a reading and updates node-health records; it creates alerts for MEDIUM/HIGH, SOS and sensor faults.
- This starter uses SQLAlchemy `create_all` for initial tables. For a production project, add Alembic migrations, authentication, input rate limits, and stricter CORS.
