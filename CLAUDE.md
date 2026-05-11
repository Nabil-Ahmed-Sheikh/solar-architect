# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SolarArchitect is a full-stack solar energy design platform. It is a **monorepo** with two completely separate runtimes:
- `frontend/` — Next.js 14 (App Router), TypeScript, Redux Toolkit, Tailwind CSS
- `backend/` — Django 5 REST API, JWT auth, Celery async tasks, optional LiDAR pipeline

## Commands

### Frontend (`frontend/`)

```bash
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

### Backend (`backend/`)

```bash
# Install dependencies (use requirements-core.txt to skip heavy LiDAR stack)
pip install -r requirements-core.txt   # fast setup — auth, projects, reports only
pip install -r requirements.txt        # full setup — includes numpy, scipy, open3d, rasterio, etc.

python manage.py migrate
python manage.py runserver             # Start API server on http://localhost:8000

# LiDAR async tasks require Redis + Celery worker
celery -A solararchitect worker --loglevel=info
```

### Demo accounts (seeded in DB)
- `admin` / `admin123`
- `engineer` / `engineer123`

## Environment Variables

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GOOGLE_MAPS_API_KEY=...        # optional, enables satellite map view
REDIS_URL=redis://localhost:6379/0  # optional, defaults to this value
DATABASE_URL=...                # optional, defaults to SQLite
```

## Architecture

### API Proxy
`frontend/next.config.js` rewrites `/api/*` → `NEXT_PUBLIC_API_URL/api/*`. Frontend code never constructs full backend URLs — all requests go through `/api/...`.

### Frontend State (Redux Toolkit)
`frontend/src/store/` has four slices:
- `authSlice` — user, tokens, expiry, async thunks for login/register/refresh/profile
- `projectsSlice` — project CRUD, filters, stats
- `uiSlice` — notifications, modals, global search
- `lidarSlice` — LiDAR scan state, segments, polling

Only `authSlice` is persisted to localStorage via `redux-persist`. The other three slices re-fetch fresh data on every page load.

### Auth Flow
JWT with rotation. Access tokens live 12 hours; refresh tokens 7 days (rotated and blacklisted on use).

1. **Proactive refresh**: `AuthGuard` schedules a token refresh 5 minutes before expiry on every navigation.
2. **Reactive refresh**: Axios response interceptor catches 401s, queues concurrent requests, refreshes once, then replays the queue.
3. **Decoupled sync**: `api.ts` (Axios interceptor) and the Redux store are decoupled via custom window events (`token:refreshed`, `auth:logout`) to avoid circular imports. `ReduxProvider.tsx` contains the `EventBridge` component that listens for these events and dispatches Redux actions.

### Backend Apps
Each Django app maps 1:1 to a domain:
- `authentication/` — JWT token endpoints, user profiles, password reset
- `projects/` — Project CRUD, global metrics
- `sites/` — Site analysis wizard (location, roof geometry, shade profiles)
- `configurations/` — Panel/inverter specs, system configurations
- `reports/` — Energy generation reports, monthly data
- `lidar/` — LiDAR pipeline (download → DSM → RANSAC → shading → DBSCAN segmentation); Celery-backed async
- `roi/` — 25-year NPV/IRR/LCOE financial model

All endpoints require authentication by default (`DEFAULT_PERMISSION_CLASSES: IsAuthenticated`).

### Frontend Pages (`frontend/src/app/`)
`/` redirects based on auth state. Protected routes are wrapped by `AuthGuard` (`frontend/src/components/auth/AuthGuard.tsx`), which blocks rendering and redirects to `/auth/login` if not authenticated.

### API Client (`frontend/src/lib/api.ts`)
Central Axios instance with typed helpers (`projectsApi`, `sitesApi`, `lidarApi`, `roiApi`, etc.) and 20+ TypeScript interfaces for domain models. Import from here — do not create new Axios instances.

## Key Constraints

- **LiDAR dependencies are heavy** — use `requirements-core.txt` unless working on `lidar/` features.
- **No test suite** — no Jest, Vitest, or Playwright configuration exists.
- **Tailwind theme** — custom Material Design 3 palette (solar amber/brown + teal accents), dark mode via `class` strategy, fonts: Space Grotesk (headings) + Inter (body). Extend from `tailwind.config.ts` rather than adding inline arbitrary values.
- **Path alias** — `@/*` maps to `frontend/src/*` in TypeScript.
