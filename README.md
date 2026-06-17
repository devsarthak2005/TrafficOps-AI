# TrafficOps AI

TrafficOps AI is a two-process full-stack app:

- `frontend/` is a Next.js 15 App Router app with TypeScript, Tailwind CSS, shadcn/ui, Zustand, and Mapbox support prepared for later phases.
- `backend/` is a FastAPI app backed by SQLite and ready for later phase-specific data and AI endpoints.

## Phase 1 runbook

Open two terminals from the repo root.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- http://localhost:3000

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend URL:

- http://localhost:8000

## Environment variables

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_placeholder
```

Create `backend/.env` or export variables in your shell if you want to override defaults later:

```bash
GEMINI_API_KEY=your_gemini_api_key_placeholder
```

Phase 1 does not call Gemini yet, but the placeholder is documented now so later phases can reuse the same env shape.

## Phase 1 checks

- `curl http://localhost:8000/health`
- Open http://localhost:3000 and confirm the page reports backend connectivity.
- Confirm `backend/data/trafficops.db` exists after the backend starts.

## Design tokens

The dark control-room palette is defined in `frontend/tailwind.config.ts` and exposed as:

- `bg-base`
- `bg-panel`
- `bg-elevated`
- `bg-status-healthy`
- `bg-status-moderate`
- `bg-status-watchlist`
- `bg-status-critical`

Use those tokens by name in later phases instead of hardcoding hex values.
