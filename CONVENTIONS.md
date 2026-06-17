# Conventions

These repository rules are phase-spanning unless a later phase explicitly overrides them.

## Structure

- `frontend/` owns the Next.js App Router UI, local client state, and browser-side fetch helpers.
- `backend/` owns API routes, database access, data processing, and all Gemini calls when those phases arrive.
- Shared contracts are duplicated intentionally:
  - TypeScript types live in `frontend/types/`
  - Pydantic models live in `backend/app/schemas/`

## Runtime model

- Run the frontend and backend as two independent processes.
- The frontend calls the backend directly with `fetch`.
- The backend must keep CORS enabled for `http://localhost:3000`.

## Design system

- Treat the UI as a dark command center.
- Use the named status tokens from `frontend/tailwind.config.ts` such as `bg-status-healthy` and `bg-status-critical`.
- Do not reintroduce raw hex values for those status colors after Phase 1.

## Mock data

- Phase-specific mock helpers live in `frontend/lib/mock/` or `backend/app/mock/`.
- Keep mock helpers imported and replace them in place when the real implementation arrives.
