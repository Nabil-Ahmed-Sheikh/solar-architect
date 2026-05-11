import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── Request interceptor: attach stored token ──────────────────────────────────
// We read from localStorage (populated by redux-persist) instead of importing
// the store directly, which would create a circular dependency.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    try {
      const persisted = localStorage.getItem("persist:solararchitect:auth");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        const token = JSON.parse(parsed.accessToken ?? "null");
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch { /* ignore parse errors */ }
  }
  return config;
});

// ── Response interceptor: 401 → refresh → retry ──────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const flushQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers!.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const persisted = localStorage.getItem("persist:solararchitect:auth");
      const refreshToken = persisted ? JSON.parse(JSON.parse(persisted).refreshToken ?? "null") : null;
      if (!refreshToken) throw new Error("no refresh token");

      const res = await axios.post(`${API_BASE}/api/auth/token/refresh/`, { refresh: refreshToken });
      const newAccess: string = res.data.access;
      const newRefresh: string = res.data.refresh ?? refreshToken;

      // Persist new tokens back to localStorage so the interceptor finds them next time
      const raw = localStorage.getItem("persist:solararchitect:auth");
      if (raw) {
        const obj = JSON.parse(raw);
        obj.accessToken = JSON.stringify(newAccess);
        obj.refreshToken = JSON.stringify(newRefresh);
        localStorage.setItem("persist:solararchitect:auth", JSON.stringify(obj));
      }

      // Also update the Redux store via a custom event so the slice stays in sync
      window.dispatchEvent(new CustomEvent("token:refreshed", { detail: { access: newAccess, refresh: newRefresh } }));

      flushQueue(null, newAccess);
      original.headers!.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      // Signal logout
      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProjectStatus = "ACTIVE" | "PENDING" | "COMPLETED" | "ARCHIVED";
export type LiDARStatus = "pending" | "downloading" | "processing" | "analyzing" | "complete" | "failed";

export interface Project {
  id: number; name: string; location: string; status: ProjectStatus;
  owner: number | null; owner_name: string | null;
  roof_area: number; estimated_generation: number;
  latitude: number | null; longitude: number | null;
  created_at: string; updated_at: string;
}
export interface GlobalMetrics { total_generation_gwh: number; generation_change_pct: number; active_installations: number; estimated_savings_usd: number; }
export interface ProjectStats { total_projects: number; active_installations: number; total_estimated_generation_mwh: number; total_estimated_generation_gwh: number; total_roof_area_m2: number; by_status: { status: string; count: number }[]; }
export interface SiteAnalysis { id: number; project: number; address: string; latitude: number; longitude: number; peak_sun_hours: number; irradiance_zone: string; roof_type: string; roof_pitch_degrees: number; roof_orientation_degrees: number; usable_roof_area: number; total_roof_area: number; utility_provider: string; current_rate_kwh: number; annual_consumption_kwh: number; net_metering_available: boolean; feed_in_tariff: number; current_step: number; shade_profiles: { id: number; month: number; shading_factor: number }[]; created_at: string; updated_at: string; }
export interface PanelSpec { id: number; manufacturer: string; model_name: string; watt_peak: number; length_mm: number; width_mm: number; efficiency_pct: number; warranty_years: number; }
export interface InverterSpec { id: number; manufacturer: string; model_name: string; rated_power_kw: number; efficiency_pct: number; inverter_type: string; }
export interface SystemConfiguration { id: number; project: number; panel_spec: number | null; panel_spec_detail: PanelSpec | null; inverter_spec: number | null; inverter_spec_detail: InverterSpec | null; num_panels: number; num_strings: number; panels_per_string: number; system_size_kwp: number; tilt_angle: number; azimuth_angle: number; layout_data: Record<string, unknown>; created_at: string; updated_at: string; }
export interface MonthlyData { id: number; month: number; month_name: string; generation_kwh: number; consumption_kwh: number; irradiance_kwh_m2: number; peak_power_kw: number; }
export interface EnergyReport { id: number; project: number; project_name: string; report_year: number; total_generation_kwh: number; total_consumption_kwh: number; net_export_kwh: number; co2_avoided_kg: number; revenue_usd: number; savings_usd: number; performance_ratio: number; capacity_factor: number; monthly_data: MonthlyData[]; generated_at: string; }
export interface RoofSegment { id: number; segment_index: number; slope_degrees: number; azimuth_degrees: number; orientation_label: string; area_m2: number; usable_area_m2: number; plane_normal_x: number; plane_normal_y: number; plane_normal_z: number; plane_d: number; centroid_x: number; centroid_y: number; centroid_z: number; annual_shade_factor: number; solar_access_pct: number; peak_irradiance_kwh_m2: number; suitability_score: number; boundary: number[][]; }
export interface ShadingObstacle { id: number; obstacle_type: string; label: string; offset_x_m: number; offset_y_m: number; height_m: number; width_m: number; depth_m: number; affected_area_pct: number; peak_loss_kwh: number; }
export interface DSMTile { id: number; width_px: number; height_px: number; resolution_m: number; elevation_grid: number[][]; }
export interface LiDARScan { id: number; project: number; latitude: number; longitude: number; source: string; status: LiDARStatus; progress_pct: number; status_message: string; point_count: number | null; point_density: number | null; elevation_min: number | null; elevation_max: number | null; scan_resolution_m: number | null; dsm_tile: DSMTile | null; roof_segments: RoofSegment[]; obstacles: ShadingObstacle[]; created_at: string; completed_at: string | null; }
export interface YearlyProjection { year: number; utility_cost_usd: number; solar_payout_usd: number; net_savings_usd: number; cumulative_savings_usd: number; generation_kwh: number; utility_rate_kwh: number; }
export interface ROIAnalysis { id: number; project: number; project_name: string; name: string; system_size_kwp: number; system_cost_usd: number; annual_production_kwh: number; panel_degradation_pct: number; federal_itc_pct: number; provincial_rebate_usd: number; srec_revenue_annual_usd: number; loan_amount_usd: number; loan_interest_rate_pct: number; loan_term_years: number; current_utility_rate_kwh: number; utility_inflation_rate_pct: number; net_metering_rate_kwh: number; annual_om_cost_usd: number; net_system_cost_usd: number; payback_years: number; irr_pct: number; npv_usd: number; lcoe_per_kwh: number; lifetime_savings_usd: number; lifetime_utility_cost_usd: number; lifetime_solar_cost_usd: number; yearly_projections: YearlyProjection[]; created_at: string; updated_at: string; }
export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }

// ── API helpers ───────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (p?: { status?: string; search?: string }) => api.get<PaginatedResponse<Project>>("/projects/", { params: p }),
  get: (id: number) => api.get<Project>(`/projects/${id}/`),
  create: (d: Partial<Project>) => api.post<Project>("/projects/", d),
  update: (id: number, d: Partial<Project>) => api.patch<Project>(`/projects/${id}/`, d),
  delete: (id: number) => api.delete(`/projects/${id}/`),
  stats: () => api.get<ProjectStats>("/projects/stats/"),
  globalMetricsLatest: () => api.get<GlobalMetrics>("/projects/metrics/global/latest/"),
};
export const sitesApi = {
  list: (pid?: number) => api.get<PaginatedResponse<SiteAnalysis>>("/sites/", { params: pid ? { project: pid } : {} }),
  get: (id: number) => api.get<SiteAnalysis>(`/sites/${id}/`),
  create: (d: Partial<SiteAnalysis>) => api.post<SiteAnalysis>("/sites/", d),
  update: (id: number, d: Partial<SiteAnalysis>) => api.patch<SiteAnalysis>(`/sites/${id}/`, d),
  advanceStep: (id: number, step: number) => api.post<SiteAnalysis>(`/sites/${id}/advance_step/`, { step }),
};
export const configurationsApi = {
  panels: () => api.get<PaginatedResponse<PanelSpec>>("/configurations/panels/"),
  inverters: () => api.get<PaginatedResponse<InverterSpec>>("/configurations/inverters/"),
  systems: (pid?: number) => api.get<PaginatedResponse<SystemConfiguration>>("/configurations/systems/", { params: pid ? { project: pid } : {} }),
  createSystem: (d: Partial<SystemConfiguration>) => api.post<SystemConfiguration>("/configurations/systems/", d),
  updateSystem: (id: number, d: Partial<SystemConfiguration>) => api.patch<SystemConfiguration>(`/configurations/systems/${id}/`, d),
};
export const reportsApi = {
  list: (pid?: number, year?: number) => api.get<PaginatedResponse<EnergyReport>>("/reports/", { params: { ...(pid && { project: pid }), ...(year && { year }) } }),
  get: (id: number) => api.get<EnergyReport>(`/reports/${id}/`),
  summary: () => api.get("/reports/summary/"),
};
export const lidarApi = {
  list: (pid?: number) => api.get<PaginatedResponse<LiDARScan>>("/lidar/scans/", { params: pid ? { project: pid } : {} }),
  get: (id: number) => api.get<LiDARScan>(`/lidar/scans/${id}/`),
  create: (d: { project: number; latitude: number; longitude: number; source?: string }) => api.post<LiDARScan>("/lidar/scans/", d),
  pollStatus: (id: number) => api.get<{ id: number; status: LiDARStatus; progress_pct: number; status_message: string; segment_count: number }>(`/lidar/scans/${id}/status/`),
  reprocess: (id: number) => api.post(`/lidar/scans/${id}/reprocess/`),
  segments: (id: number) => api.get<RoofSegment[]>(`/lidar/scans/${id}/segments/`),
  obstacles: (id: number) => api.get<ShadingObstacle[]>(`/lidar/scans/${id}/obstacles/`),
  dsmGrid: (id: number) => api.get<{ width: number; height: number; resolution_m: number; grid: number[][]; elevation_min: number; elevation_max: number }>(`/lidar/scans/${id}/dsm_grid/`),
  googleMapsKey: () => api.get<{ key: string; available: boolean }>("/lidar/scans/google_maps_key/"),
};
export const roiApi = {
  list: (pid?: number) => api.get<PaginatedResponse<ROIAnalysis>>("/roi/analyses/", { params: pid ? { project: pid } : {} }),
  get: (id: number) => api.get<ROIAnalysis>(`/roi/analyses/${id}/`),
  create: (d: Partial<ROIAnalysis>) => api.post<ROIAnalysis>("/roi/analyses/", d),
  update: (id: number, d: Partial<ROIAnalysis>) => api.patch<ROIAnalysis>(`/roi/analyses/${id}/`, d),
  recalculate: (id: number, p: Partial<ROIAnalysis>) => api.post<ROIAnalysis>(`/roi/analyses/${id}/recalculate/`, p),
  quickEstimate: (p: Partial<ROIAnalysis>) => api.post<ROIAnalysis & { yearly_projections: YearlyProjection[] }>("/roi/analyses/quick_estimate/", p),
};
