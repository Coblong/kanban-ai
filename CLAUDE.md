# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Project Management MVP: a Kanban board with drag-and-drop, auth, and an AI chat sidebar. The frontend is Next.js, the backend is Python FastAPI, and everything runs in Docker. The FastAPI backend serves the statically-built Next.js frontend at `/`.

MVP constraints: single hardcoded user (`user` / `password`), one board per user, runs locally in Docker.

## Commands

### Running the app

```bash
./scripts/start.sh       # Mac/Linux — builds Docker image and starts on http://localhost:8000
./scripts/stop.sh        # Stop

# Local backend dev (without Docker):
cd backend && python -m uvicorn app.main:app --reload --port 8000
```

### Frontend development

```bash
cd frontend
npm run dev              # Dev server on http://localhost:3000
npm run build            # Production static build (outputs to frontend/out/)
npm run lint
```

### Testing

```bash
# Frontend unit tests (Vitest + React Testing Library)
cd frontend
npm run test:unit               # Run once
npm run test:unit:watch         # Watch mode
npx vitest run src/lib/kanban.test.ts   # Single test file

# Frontend E2E (Playwright)
npm run test:e2e

# All frontend tests
npm run test:all

# Backend tests (pytest)
cd backend
pytest                          # All tests
pytest app/tests/test_main.py   # Single file
```

### Backend environment

```bash
cd backend
uv pip install -e .     # Install/sync deps (uv is the package manager)
```

`.env` in project root is loaded by Docker Compose:
```
OPENROUTER_API_KEY=sk-or-v1-...
```

## Architecture

### Request flow

Browser → FastAPI (port 8000) → serves `frontend/out/` static files for all non-API routes.  
API routes: `/api/*` and `/health`.  
Auth token is stored in `localStorage` on the frontend; the backend currently uses a hardcoded dummy token (`"dummy-token"`).

### Frontend (`frontend/src/`)

- `app/layout.tsx` — root layout; wraps everything in `AuthProvider` (from `lib/auth/AuthContext.tsx`)
- `app/page.tsx` — redirects to `/login` if not authenticated; otherwise renders `KanbanBoard`
- `app/login/page.tsx` — login form; calls `POST /api/auth/login`, stores token via `AuthContext.login()`
- `lib/auth/AuthContext.tsx` — React Context managing `isLoggedIn` state, persisted to `localStorage`
- `lib/kanban.ts` — pure data types (`Card`, `Column`, `BoardData`) and board logic (`moveCard`)
- `components/KanbanBoard.tsx` — top-level client component; owns all board state and drag-drop handlers via `@dnd-kit`

Drag-and-drop uses `@dnd-kit` (core + sortable). Column order is fixed; cards are sortable within and across columns.

### Backend (`backend/app/`)

- `main.py` — FastAPI app; CORS middleware, global exception handler, auth endpoints, static file serving
- `db.py` — SQLite connection, `init_db()` called on startup (creates schema + seeds default user/board if absent)
- `schema.sql` — DDL (run via `init_db()`)
- `models.py` — Pydantic models
- Database file written to `backend/data/kanban.db` (outside the app package, created at runtime)

### Docker / build

Multi-stage `Dockerfile`: Node stage builds `frontend/out/`, Python stage copies that output and the backend code into the final image. `docker-compose.yml` volume-mounts `frontend/src/` and `backend/app/` so live edits auto-reload without rebuilding the image.

### Database schema

`users → kanban_boards → kanban_columns → kanban_cards` (cascade deletes). Card and column order is maintained with explicit `position` INTEGER fields (0-indexed). Card status is implicit from `column_id` (no status enum).

## Coding standards

- No over-engineering; no unnecessary defensive programming; no extra features
- No emojis anywhere
- Keep READMEs and docs minimal
- When hitting bugs: identify root cause before fixing — prove it with evidence, then fix
- Use latest idiomatic versions of all libraries

## AI integration (Parts 8–10, not yet implemented)

- Provider: OpenRouter (`OPENROUTER_API_KEY` in `.env`)
- Model: `openai/gpt-oss-120b`
- Pattern: `POST /api/ai/chat` with board context + conversation history → structured JSON response with optional card operations (create/edit/move)
