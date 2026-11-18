# Manhole Guard — Frontend Demo

## Run
1. Extract the ZIP.
2. Open `frontend` in VS Code.
3. Right-click `index.html` → **Open with Live Server**.
4. Demo works without a backend.

## Pages
Home, six individual manhole detail pages, Alerts, Analytics, Reports (CSV export), Settings, light/dark theme.

## Demo data
Six sample manholes are in `frontend/data.js`. `DataService` is the future API boundary. Replace its methods with FastAPI `fetch()` calls later. Suggested endpoints: `GET /api/manholes`, `GET /api/manholes/{id}`, `GET /api/manholes/{id}/history`, `GET /api/alerts`.

All map coordinates are illustrative only. MQ-4 and MQ-136 values are relative response increases (%), not ppm or LEL. The thresholds shown are prototype display thresholds, not certified safety limits. This prototype must not be used to authorize confined-space entry.
