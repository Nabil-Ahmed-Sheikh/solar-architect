import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { lidarApi, type LiDARScan, type RoofSegment } from "@/lib/api";

export interface LiDARState {
  scans: Record<number, LiDARScan>; // keyed by project id
  activeScanId: number | null;
  selectedSegment: RoofSegment | null;
  pollingIntervalId: number | null;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: LiDARState = {
  scans: {},
  activeScanId: null,
  selectedSegment: null,
  pollingIntervalId: null,
  isSubmitting: false,
  error: null,
};

export const triggerLiDARScan = createAsyncThunk(
  "lidar/trigger",
  async (
    payload: { project: number; latitude: number; longitude: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await lidarApi.create({ ...payload, source: "alberta_open" });
      return res.data;
    } catch {
      return rejectWithValue("Failed to start LiDAR scan");
    }
  }
);

export const pollLiDARStatus = createAsyncThunk(
  "lidar/pollStatus",
  async (scanId: number, { rejectWithValue }) => {
    try {
      const res = await lidarApi.pollStatus(scanId);
      // If complete, fetch full data
      if (res.data.status === "complete") {
        const full = await lidarApi.get(scanId);
        return full.data;
      }
      return res.data as unknown as LiDARScan;
    } catch {
      return rejectWithValue("Failed to poll status");
    }
  }
);

export const fetchLiDARForProject = createAsyncThunk(
  "lidar/fetchForProject",
  async (projectId: number, { rejectWithValue }) => {
    try {
      const res = await lidarApi.list(projectId);
      return { projectId, scans: res.data.results };
    } catch {
      return rejectWithValue("Failed to load LiDAR data");
    }
  }
);

const lidarSlice = createSlice({
  name: "lidar",
  initialState,
  reducers: {
    setActiveScan(state, action: PayloadAction<number | null>) {
      state.activeScanId = action.payload;
    },
    selectSegment(state, action: PayloadAction<RoofSegment | null>) {
      state.selectedSegment = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    updateScanInStore(state, action: PayloadAction<LiDARScan>) {
      const scan = action.payload;
      // Index by project id (overwrite with latest)
      state.scans[scan.project] = scan;
      if (state.activeScanId === null) state.activeScanId = scan.id;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(triggerLiDARScan.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(triggerLiDARScan.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.scans[action.payload.project] = action.payload;
        state.activeScanId = action.payload.id;
      })
      .addCase(triggerLiDARScan.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    builder.addCase(pollLiDARStatus.fulfilled, (state, action) => {
      const scan = action.payload;
      if (scan && scan.project) {
        state.scans[scan.project] = scan as LiDARScan;
      }
    });

    builder.addCase(fetchLiDARForProject.fulfilled, (state, action) => {
      const { projectId, scans } = action.payload;
      if (scans.length > 0) {
        state.scans[projectId] = scans[0]; // most recent
        state.activeScanId = scans[0].id;
      }
    });
  },
});

export const { setActiveScan, selectSegment, clearError, updateScanInStore } = lidarSlice.actions;
export default lidarSlice.reducer;

export const selectLiDARForProject = (projectId: number) => (state: { lidar: LiDARState }) =>
  state.lidar.scans[projectId] ?? null;
export const selectSelectedSegment = (state: { lidar: LiDARState }) => state.lidar.selectedSegment;
export const selectLiDARSubmitting = (state: { lidar: LiDARState }) => state.lidar.isSubmitting;
