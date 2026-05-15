<div align="center">

# ☀️ SolarArchitect

**Enterprise-grade solar energy design platform**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Django](https://img.shields.io/badge/Django-5-092E20?logo=django)](https://djangoproject.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Redux](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?logo=redux)](https://redux-toolkit.js.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/tests-166_passing-22c55e?logo=pytest)](/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

*From GPS coordinates to a fully modelled 25-year solar investment — in one workflow.*

</div>

---

## Screenshots

### Dashboard — Project Pipeline & Global Metrics

![Dashboard](docs/screenshots/dashboard.png)

> Overview of all active projects, global generation metrics, and the project creation wizard.

---

### Site Analysis — Google Maps + LiDAR Integration

![Site Analysis](docs/screenshots/site-analysis.png)

> Click any rooftop on the satellite map to set coordinates, then trigger the LiDAR pipeline to extract roof segments, slope, and shading obstacles automatically.

---

### ROI Calculator — 25-Year Financial Model

![ROI Calculator](docs/screenshots/roi-calculator.png)

> Slide parameters (system cost, utility rate, loan term, ITC) and watch NPV, IRR, LCOE, and the 25-year cumulative cash-flow chart update in real time.

---

### Configuration — Panel Layout & System Design

![Configuration](docs/screenshots/configuration.png)

> Select panel and inverter specs from the shared catalog, set tilt/azimuth, and compose the panel grid layout.

---

### Reports — Energy Generation Analytics

![Reports](docs/screenshots/reports.png)

> Monthly generation vs. consumption charts powered by Recharts. Export annual summaries as PDF.

---

## Features

| Feature | Description |
|---------|-------------|
| **Site Analysis Wizard** | 3-step wizard: location → roof geometry → utility economics. Backed by Google Maps satellite view with click-to-pin coordinates. |
| **LiDAR Pipeline** | Downloads Alberta Open Data `.laz` point clouds, rasterises to DSM, fits roof planes with RANSAC, calculates solar access, and clusters obstacles with DBSCAN. |
| **25-Year ROI Model** | Per-year NPV / IRR / LCOE / payback period with panel degradation, loan amortisation, ITC incentives, and utility inflation. |
| **Shade Analysis** | Monthly shade profiles per roof segment; sun-path simulation at 53 °N. |
| **Roof Measurement** | SVG polygon tool for tracing and measuring arbitrary roof areas from satellite imagery. |
| **Energy Reports** | Annual generation summaries with monthly breakdown, CO₂ offset, and savings calculations. |
| **JWT Auth** | Access tokens (12 h) + rotated refresh tokens (7 d) with proactive pre-expiry refresh and a reactive 401-queue Axios interceptor. |
| **Role-Based Access** | Shared product catalogs (panels, inverters) are read-only for engineers; only staff accounts can modify them. |

---

## Tech Stack

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, RSC) |
| Language | TypeScript 5 |
| State | Redux Toolkit 2 + redux-persist |
| Styling | Tailwind CSS 3 — Material Design 3 palette |
| Charts | Recharts 2 |
| HTTP | Axios with interceptor-based auto-refresh |
| Testing | Jest 30 + ts-jest + axios-mock-adapter (46 tests) |

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | Django 5 + Django REST Framework 3 |
| Auth | `djangorestframework-simplejwt` (JWT, rotation, blacklist) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Async | Celery + Redis (LiDAR pipeline) |
| LiDAR | numpy · scipy · open3d · rasterio · pyproj |
| Testing | Django `APITestCase` (120 tests) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Next.js 14 (App Router)          :3000               │  │
│  │  ┌──────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │ AuthGuard│  │ Redux Store │  │  Axios (api.ts) │  │  │
│  │  │ proactive│  │  authSlice  │  │  ┌─────────────┐ │  │  │
│  │  │ refresh  │  │  projects   │  │  │ req: Bearer │ │  │  │
│  │  │ isRef ref│  │  ui / lidar │  │  │ res: 401→Q  │ │  │  │
│  │  └──────────┘  └─────────────┘  │  │    refresh  │ │  │  │
│  │                                 │  └─────────────┘ │  │  │
│  │                                 └────────┬────────┘  │  │
│  └──────────────────────────────────────────┼───────────┘  │
│                                             │ /api/*        │
│                              Next.js rewrite proxy          │
└─────────────────────────────────────────────┼───────────────┘
                                              │
┌─────────────────────────────────────────────▼───────────────┐
│  Django 5 REST API                        :8000             │
│                                                             │
│  /api/auth/        JWT login · refresh · register           │
│  /api/projects/    CRUD · stats · global metrics            │
│  /api/sites/       Wizard · shade profiles · advance step   │
│  /api/configs/     Panel/inverter catalog · system design   │
│  /api/reports/     Annual reports · monthly generation      │
│  /api/roi/         25-yr model · quick estimate · IRR       │
│  /api/lidar/       Scan trigger · status poll · DSM grid    │
│                                                             │
│  ┌────────────────────────────────────┐                     │
│  │  Celery Worker (optional)          │  ← Redis            │
│  │  LiDAR: download→DSM→RANSAC        │                     │
│  │        →shading→DBSCAN             │                     │
│  └────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) Redis — only needed for async LiDAR processing

### 1 — Backend

```bash
cd backend

# Fast setup — no heavy geospatial stack (auth, projects, ROI, reports work immediately)
pip install -r requirements-core.txt

# Full setup — includes LiDAR processing (numpy, scipy, open3d, rasterio)
pip install -r requirements.txt

cp .env.example .env          # Edit SECRET_KEY at minimum
python manage.py migrate
python manage.py seed_data    # Creates demo users + sample projects
python manage.py runserver    # → http://localhost:8000
```

### 2 — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # Set NEXT_PUBLIC_API_URL if needed
npm run dev                         # → http://localhost:3000
```

Visit **http://localhost:3000** — you'll be redirected to the login page.

### 3 — (Optional) Async LiDAR worker

```bash
# In a separate terminal, from the backend directory:
celery -A solararchitect worker --loglevel=info
```

Without Celery the pipeline runs synchronously in a daemon thread (fine for development).

---

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Superuser · can manage panel/inverter catalog |
| `engineer` | `engineer123` | Regular engineer · read-only catalog |

---

## Environment Variables

### Backend — `backend/.env`

```env
SECRET_KEY=your-long-random-secret-key        # Required
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GOOGLE_MAPS_API_KEY=AIza...                   # Optional — satellite map view
REDIS_URL=redis://localhost:6379/0            # Optional — defaults to this value
DATABASE_URL=                                 # Optional — defaults to SQLite
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...       # Optional — live satellite tiles
```

---

## Project Structure

```
solar-architect/
├── backend/
│   ├── authentication/      ← JWT auth, UserProfile, password reset
│   ├── projects/            ← Project CRUD, GlobalMetrics, dashboard stats
│   ├── sites/               ← SiteAnalysis wizard, ShadeProfile
│   ├── configurations/      ← PanelSpec, InverterSpec, SystemConfiguration
│   ├── reports/             ← EnergyReport, MonthlyGeneration
│   ├── lidar/               ← LiDAR scan, DSM, RoofSegment, ShadingObstacle
│   ├── roi/                 ← ROIAnalysis, YearlyProjection, calculator engine
│   └── solararchitect/      ← Django settings, root URLs, Celery config
│
└── frontend/
    └── src/
        ├── app/
        │   ├── auth/            login · register · forgot-password
        │   ├── dashboard/       project pipeline · global metrics
        │   ├── site-analysis/   maps wizard · LiDAR trigger
        │   ├── configuration/   DSM viewer · panel grid editor
        │   ├── reports/         Recharts generation analytics
        │   ├── roi-calculator/  25-year cash flow model
        │   ├── roof-measure/    SVG polygon area tool
        │   ├── shade-analysis/  sky dome · irradiance heatmap
        │   ├── profile/         engineer profile · live project data
        │   ├── settings/        password change · profile edit
        │   └── support/         docs hub · ticket form
        ├── components/
        │   ├── auth/            AuthGuard (route guard + token refresh)
        │   ├── layout/          AppShell · Sidebar · TopBar
        │   ├── lidar/           DSMViewer (Canvas 3D roof segmentation)
        │   ├── maps/            GoogleMapView (satellite + SVG fallback)
        │   └── ui/              NotificationToast · ProjectModal · StatusBadge
        ├── store/
        │   ├── slices/          authSlice · projectsSlice · uiSlice · lidarSlice
        │   ├── index.ts         configureStore + redux-persist
        │   └── ReduxProvider    EventBridge (window events → Redux actions)
        └── lib/
            ├── api.ts           Axios instance + typed API helpers
            └── config.ts        Shared constants (API_BASE)
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/token/` | — | Login → `{ access, refresh, user }` |
| `POST` | `/api/auth/token/refresh/` | — | Rotate refresh token |
| `POST` | `/api/auth/register/` | — | Register + auto-login |
| `GET` | `/api/auth/me/` | Bearer | Current user profile |
| `PATCH` | `/api/auth/me/` | Bearer | Update profile |
| `POST` | `/api/auth/change-password/` | Bearer | Change password → new tokens |
| `POST` | `/api/auth/logout/` | Bearer | Blacklist refresh token |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/` | List user's projects (filterable by status/search) |
| `POST` | `/api/projects/` | Create project |
| `GET/PATCH/DELETE` | `/api/projects/{id}/` | Project detail |
| `GET` | `/api/projects/stats/` | Dashboard aggregates for current user |
| `GET` | `/api/projects/global-metrics/latest/` | Platform-wide snapshot |

### LiDAR

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/lidar/scans/` | Create scan + trigger pipeline |
| `GET` | `/api/lidar/scans/{id}/status/` | Poll processing progress |
| `POST` | `/api/lidar/scans/{id}/reprocess/` | Re-run failed scan |
| `GET` | `/api/lidar/scans/{id}/segments/` | Roof segments + suitability scores |
| `GET` | `/api/lidar/scans/{id}/obstacles/` | Detected shading obstacles |
| `GET` | `/api/lidar/scans/{id}/dsm_grid/` | Elevation grid for 3D visualisation |
| `GET` | `/api/lidar/scans/google_maps_key/` | Whether a Maps key is configured |

### ROI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/roi/analyses/` | List / create analyses |
| `POST` | `/api/roi/analyses/{id}/recalculate/` | Re-run with overridden params |
| `POST` | `/api/roi/analyses/quick_estimate/` | Ephemeral calculation (no DB write) |

---

## LiDAR Processing Pipeline

```
POST /api/lidar/scans/  { project, latitude, longitude, source }
         │
         ├─ Stage 1  Download Alberta Open Data .laz tile
         │           (synthetic point cloud fallback if unavailable)
         │
         ├─ Stage 2  Rasterise → DSM GeoTIFF (0.5 m/px resolution)
         │
         ├─ Stage 3  RANSAC plane fitting → RoofSegment records
         │           (slope °, azimuth °, area m², suitability score /100)
         │
         ├─ Stage 4  Sun-path shading simulation @ 53 °N latitude
         │           → solar_access_pct per segment
         │
         └─ Stage 5  DBSCAN obstacle clustering → ShadingObstacle records
                     (label, height_m, footprint)

Poll:   GET /api/lidar/scans/{id}/status/   → { status, progress_pct }
Result: GET /api/lidar/scans/{id}/          → full scan with segments + obstacles
```

---

## Security

This codebase implements the following security controls:

| Control | Detail |
|---------|--------|
| **Row-level isolation** | Every ViewSet filters queries to `owner=request.user` — no IDOR possible |
| **Staff-only catalog writes** | `PanelSpec` / `InverterSpec` are read-only for regular users |
| **API key protection** | Google Maps key never sent to the client; response returns only `available: bool` |
| **Input validation** | `MinValueValidator` / `MaxValueValidator` on all numeric model fields; `advance_step` validates integer range |
| **HTTP security headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy` |
| **JWT rotation + blacklist** | Refresh tokens are rotated on every use and blacklisted on logout |
| **Token refresh deduplication** | `isRefreshingRef` in `AuthGuard` prevents concurrent refresh races |

---

## Testing

```bash
# Backend — 120 tests across all 7 Django apps
cd backend
python manage.py test --verbosity=2

# Frontend — 46 tests (API helpers + Axios interceptor structure)
cd frontend
npm test
```

### What's covered

**Backend**
- Authentication: register, login, refresh, logout, password change, profile update
- CRUD for every resource (projects, sites, configurations, reports, ROI, LiDAR)
- Custom actions: `advance_step`, `add_shade_profile`, `add_monthly_data`, `recalculate`, `quick_estimate`
- Role-based access: staff vs. regular user for catalog mutations
- Unauthenticated access blocked (401) on all protected endpoints

**Frontend**
- All 20+ typed API helper functions in `lib/api.ts`
- 200 / 400 / 401 / 404 / 500 response handling
- Axios interceptor presence checks

---

## Production Deployment

### Backend

```bash
export SECRET_KEY="$(openssl rand -hex 32)"
export DEBUG=False
export ALLOWED_HOSTS=yourdomain.com
export DATABASE_URL=postgres://user:pass@host/dbname

python manage.py migrate
python manage.py collectstatic --noinput
gunicorn solararchitect.wsgi:application --workers 4
```

### Frontend

```bash
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com
npm run build
npm start
# or deploy the .next/ output to Vercel / Netlify / your CDN
```

### Celery Worker

```bash
celery -A solararchitect worker --loglevel=info --concurrency=2
```

---

## Contributing

1. Fork the repository and create a feature branch from `main`
2. Run the full test suite before opening a PR:
   ```bash
   cd backend && python manage.py test
   cd frontend && npm test
   ```
3. Follow the existing code style — no inline comments unless the *why* is non-obvious
4. Open a pull request with a clear description of what changed and why

---

<div align="center">

Built with ☀️ by the SolarArchitect team.

</div>
