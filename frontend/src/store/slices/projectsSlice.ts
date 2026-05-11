import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, type Project, type ProjectStats, type GlobalMetrics, type PaginatedResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProjectsState {
  items: Project[];
  total: number;
  stats: ProjectStats | null;
  globalMetrics: GlobalMetrics | null;
  selectedProjectId: number | null;
  filters: {
    status: string;
    search: string;
    page: number;
  };
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  lastFetched: number | null;
}

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: ProjectsState = {
  items: [],
  total: 0,
  stats: null,
  globalMetrics: null,
  selectedProjectId: null,
  filters: { status: "", search: "", page: 1 },
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  lastFetched: null,
};

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchProjects = createAsyncThunk(
  "projects/fetchAll",
  async (params: { status?: string; search?: string; page?: number } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get<PaginatedResponse<Project>>("/projects/", { params });
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue("Failed to load projects");
    }
  }
);

export const fetchProjectStats = createAsyncThunk(
  "projects/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const [statsRes, metricsRes] = await Promise.all([
        api.get<ProjectStats>("/projects/stats/"),
        api.get<GlobalMetrics>("/projects/metrics/global/latest/"),
      ]);
      return { stats: statsRes.data, metrics: metricsRes.data };
    } catch {
      return rejectWithValue("Failed to load stats");
    }
  }
);

export const createProject = createAsyncThunk(
  "projects/create",
  async (data: Partial<Project>, { rejectWithValue }) => {
    try {
      const res = await api.post<Project>("/projects/", data);
      return res.data;
    } catch (err: unknown) {
      if ((err as { response?: { data?: { name?: string[] } } }).response?.data?.name) {
        return rejectWithValue("A project with that name already exists.");
      }
      return rejectWithValue("Failed to create project");
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async ({ id, data }: { id: number; data: Partial<Project> }, { rejectWithValue }) => {
    try {
      const res = await api.patch<Project>(`/projects/${id}/`, data);
      return res.data;
    } catch {
      return rejectWithValue("Failed to update project");
    }
  }
);

export const deleteProject = createAsyncThunk(
  "projects/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/projects/${id}/`);
      return id;
    } catch {
      return rejectWithValue("Failed to delete project");
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setSelectedProject(state, action: PayloadAction<number | null>) {
      state.selectedProjectId = action.payload;
    },
    setFilter(state, action: PayloadAction<Partial<ProjectsState["filters"]>>) {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    resetProjects: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.results;
        state.total = action.payload.count;
        state.lastFetched = Date.now();
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchProjectStats.fulfilled, (state, action) => {
      state.stats = action.payload.stats;
      state.globalMetrics = action.payload.metrics;
    });

    builder
      .addCase(createProject.pending, (state) => { state.isCreating = true; state.error = null; })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateProject.pending, (state) => { state.isUpdating = true; })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.isUpdating = false;
        const idx = state.items.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    builder.addCase(deleteProject.fulfilled, (state, action) => {
      state.items = state.items.filter((p) => p.id !== action.payload);
      state.total -= 1;
      if (state.selectedProjectId === action.payload) state.selectedProjectId = null;
    });
  },
});

export const { setSelectedProject, setFilter, setPage, clearError, resetProjects } = projectsSlice.actions;
export default projectsSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectProjects = (state: { projects: ProjectsState }) => state.projects.items;
export const selectProjectsLoading = (state: { projects: ProjectsState }) => state.projects.isLoading;
export const selectProjectStats = (state: { projects: ProjectsState }) => state.projects.stats;
export const selectGlobalMetrics = (state: { projects: ProjectsState }) => state.projects.globalMetrics;
export const selectSelectedProjectId = (state: { projects: ProjectsState }) => state.projects.selectedProjectId;
export const selectProjectFilters = (state: { projects: ProjectsState }) => state.projects.filters;
export const selectProjectsError = (state: { projects: ProjectsState }) => state.projects.error;
export const selectProjectById = (id: number) => (state: { projects: ProjectsState }) =>
  state.projects.items.find((p) => p.id === id);
