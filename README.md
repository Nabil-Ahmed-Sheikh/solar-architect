# SolarArchitect v2

Full-stack solar design platform — **Next.js 14** + **Django 5** + **Redux Toolkit** + **JWT Auth**.

---

## Quick Start (5 minutes)

### 1. Backend

```bash
cd backend

# Option A: Core only (fast, no LiDAR)
pip install -r requirements-core.txt

# Option B: Full (includes LiDAR processing)
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_data      # Creates users + sample projects
python manage.py runserver      # → http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                     # → http://localhost:3000
```

Open **http://localhost:3000** — you'll be redirected to the login page.

---

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Superuser (Staff) |
| `engineer` | `engineer123` | Regular user |

---

## Authentication Flow

```
/auth/login  →  POST /api/auth/token/
             ←  { access, refresh, user }
                     │
                     ↓ stored in Redux (persisted via redux-persist → localStorage)
                     
All API calls →  Authorization: Bearer <access>
             
Token expiring? →  Auto-refresh (5 min before expiry via AuthGuard timer)
                →  POST /api/auth/token/refresh/
                ←  { access, refresh }  (rotated)
                
401 on any request  →  Axios interceptor queues requests
                    →  Refresh token → retry all queued requests
                    →  If refresh fails → dispatch logout → redirect /auth/login

Logout  →  POST /api/auth/logout/  (blacklists refresh token)
        →  Clears Redux store + persisted localStorage
        →  Redirect /auth/login
```

---

## Auth API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/token/` | None | Login → `{ access, refresh, user }` |
| `POST` | `/api/auth/token/refresh/` | None | Refresh token (rotates refresh) |
| `POST` | `/api/auth/register/` | None | Register → auto-login `{ access, refresh, user }` |
| `GET` | `/api/auth/me/` | Bearer | Current user profile |
| `PATCH` | `/api/auth/me/` | Bearer | Update profile + nested UserProfile |
| `POST` | `/api/auth/change-password/` | Bearer | Change password → new tokens |
| `POST` | `/api/auth/logout/` | Bearer | Blacklist refresh token |
| `POST` | `/api/auth/password-reset/` | None | Initiate email reset |

---

## Redux Store

```
store/
├── slices/
│   ├── authSlice.ts      — user, tokens, isAuthenticated (persisted)
│   ├── projectsSlice.ts  — projects CRUD, filters, stats
│   ├── uiSlice.ts        — notifications, modals, global search
│   └── lidarSlice.ts     — LiDAR scans, segments, polling
├── index.ts              — configureStore + redux-persist
├── hooks.ts              — useAppDispatch, useAppSelector
└── ReduxProvider.tsx     — <Provider> + <PersistGate> + EventBridge
```

**Persistence:** Only `auth` slice is persisted (access/refresh tokens + user). Everything else re-fetches on load.

**Token refresh:** The `EventBridge` component listens for `token:refreshed` and `auth:logout` window events emitted by the Axios interceptor, keeping the Redux store in sync without circular imports.

---

## Frontend Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/auth/login` | Public | Login form with demo credentials |
| `/auth/register` | Public | Registration with password strength |
| `/auth/forgot-password` | Public | Email reset (anti-enumeration) |
| `/dashboard` | Protected | Redux-driven project pipeline + metrics |
| `/site-analysis` | Protected | Google Maps + LiDAR scan trigger |
| `/configuration` | Protected | LiDAR DSM viewer + panel grid editor |
| `/reports` | Protected | Recharts generation charts |
| `/roi-calculator` | Protected | 25-year NPV/IRR/LCOE model |
| `/roof-measure` | Protected | SVG polygon area tool |
| `/shade-analysis` | Protected | Sky dome + irradiance heatmap |
| `/settings` | Protected | Profile edit + real password change |
| `/profile` | Protected | Engineer profile + live project data |
| `/support` | Protected | Doc hub + ticket form |

---

## Environment Variables

### Backend `.env`
```env
SECRET_KEY=your-long-random-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GOOGLE_MAPS_API_KEY=AIza...          # Optional — enables live satellite view
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Project Structure

```
solararchitect_v2/
├── backend/
│   ├── authentication/     ← JWT auth, UserProfile, all auth endpoints
│   ├── projects/           ← Project CRUD, GlobalMetrics, stats
│   ├── sites/              ← SiteAnalysis, ShadeProfile, wizard steps
│   ├── configurations/     ← PanelSpec, InverterSpec, SystemConfiguration
│   ├── reports/            ← EnergyReport, MonthlyGeneration
│   ├── lidar/              ← LiDAR pipeline: download→DSM→RANSAC→shading
│   └── roi/                ← 25-year ROI calculator (NPV/IRR/LCOE)
│
└── frontend/
    └── src/
        ├── app/            ← 13 Next.js pages (App Router)
        ├── components/
        │   ├── auth/       ← AuthGuard (route protection + token refresh)
        │   ├── layout/     ← AppShell, Sidebar, TopBar (Redux-connected)
        │   ├── lidar/      ← DSMViewer (Canvas 3D roof segmentation)
        │   ├── maps/       ← GoogleMapView (satellite + fallback SVG)
        │   └── ui/         ← NotificationToast, ProjectModal, StatusBadge
        ├── store/          ← Redux Toolkit store (4 slices + persist)
        └── lib/api.ts      ← Axios client with auto-refresh interceptor
```

---

## LiDAR Pipeline

```
POST /api/lidar/scans/  { project, latitude, longitude }
         │
         ├─ Stage 1: Download Alberta Open Data .laz tile
         │           (falls back to synthetic point cloud)
         ├─ Stage 2: Rasterize → DSM GeoTIFF (0.5m resolution)
         ├─ Stage 3: RANSAC plane fitting → RoofSegment objects
         │           (slope, azimuth, area, suitability score)
         ├─ Stage 4: Sun-path shading @ 53°N → solar access %
         └─ Stage 5: DBSCAN obstacle detection → ShadingObstacle objects

Poll:   GET /api/lidar/scans/{id}/status/
Result: GET /api/lidar/scans/{id}/  (segments + obstacles + DSM grid)
```

---

## Running in Production

```bash
# Backend
SECRET_KEY=<long-random-string>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com
python manage.py collectstatic
gunicorn solararchitect.wsgi:application

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
npm run build && npm start
```
