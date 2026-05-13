import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE as API } from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  title: string;
  organization: string;
  bio: string;
  phone: string;
  total_mw_designed: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  profile: UserProfile | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenExpiry: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseExpiry(token: string): number | null {
  try {
    return JSON.parse(atob(token.split(".")[1])).exp * 1000;
  } catch {
    return null;
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  "auth/login",
  async (creds: { username: string; password: string }, { rejectWithValue }) => {
    try {
      // Custom token view returns { access, refresh, user }
      const res = await axios.post(`${API}/api/auth/token/`, creds);
      return res.data as { access: string; refresh: string; user: User };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        const msg = d?.detail || d?.non_field_errors?.[0] || "Invalid credentials.";
        return rejectWithValue(msg);
      }
      return rejectWithValue("Cannot connect to server.");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    data: { username: string; email: string; password: string; password2: string; first_name: string; last_name: string },
    { rejectWithValue }
  ) => {
    try {
      // Returns { access, refresh, user }
      const res = await axios.post(`${API}/api/auth/register/`, data);
      return res.data as { access: string; refresh: string; user: User };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        const msg =
          d?.username?.[0] || d?.email?.[0] || d?.password?.[0] ||
          d?.non_field_errors?.[0] || d?.detail || "Registration failed.";
        return rejectWithValue(msg);
      }
      return rejectWithValue("Cannot connect to server.");
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  "auth/refresh",
  async (_, { getState, rejectWithValue }) => {
    // Prefer localStorage — the Axios interceptor writes rotated tokens there immediately,
    // while Redux state may lag behind by one async dispatch cycle.
    let refreshToken: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const persisted = localStorage.getItem("persist:solararchitect:auth");
        if (persisted) {
          const parsed = JSON.parse(persisted);
          refreshToken = JSON.parse(parsed.refreshToken ?? "null");
        }
      } catch { /* ignore parse errors */ }
    }
    if (!refreshToken) {
      const { auth } = getState() as { auth: AuthState };
      refreshToken = auth.refreshToken;
    }
    if (!refreshToken) return rejectWithValue("No refresh token");
    try {
      const res = await axios.post(`${API}/api/auth/token/refresh/`, { refresh: refreshToken });
      return { access: res.data.access, refresh: res.data.refresh ?? refreshToken };
    } catch {
      return rejectWithValue("Session expired");
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchMe",
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: AuthState };
    if (!auth.accessToken) return rejectWithValue("No token");
    try {
      const res = await axios.get(`${API}/api/auth/me/`, { headers: authHeaders(auth.accessToken) });
      return res.data as User;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401)
        return rejectWithValue("unauthorized");
      return rejectWithValue("Failed to load profile");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data: Partial<User & { profile: Partial<UserProfile> }>, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: AuthState };
    try {
      const res = await axios.patch(`${API}/api/auth/me/`, data, { headers: authHeaders(auth.accessToken!) });
      return res.data as User;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) return rejectWithValue(err.response?.data?.detail || "Update failed");
      return rejectWithValue("Network error");
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (data: { current_password: string; new_password: string }, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: AuthState };
    try {
      const res = await axios.post(`${API}/api/auth/change-password/`, data, {
        headers: authHeaders(auth.accessToken!),
      });
      return res.data as { access: string; refresh: string };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        return rejectWithValue(d?.current_password?.[0] || d?.detail || "Password change failed");
      }
      return rejectWithValue("Network error");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { getState }) => {
    const { auth } = getState() as { auth: AuthState };
    try {
      if (auth.accessToken && auth.refreshToken) {
        await axios.post(
          `${API}/api/auth/logout/`,
          { refresh: auth.refreshToken },
          { headers: authHeaders(auth.accessToken) }
        );
      }
    } catch { /* silently fail */ }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null, accessToken: null, refreshToken: null,
  isAuthenticated: false, isLoading: false, error: null, tokenExpiry: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      Object.assign(state, initialState);
    },
    clearError(state) {
      state.error = null;
    },
    // Called by ReduxProvider's EventBridge when api.ts refreshes tokens
    setTokens(state, action: PayloadAction<{ access: string; refresh: string }>) {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      state.tokenExpiry = parseExpiry(action.payload.access);
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    // ── login ──
    builder
      .addCase(login.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(login.fulfilled, (s, { payload }) => {
        s.isLoading = false;
        s.accessToken = payload.access;
        s.refreshToken = payload.refresh;
        s.user = payload.user;
        s.isAuthenticated = true;
        s.tokenExpiry = parseExpiry(payload.access);
      })
      .addCase(login.rejected, (s, { payload }) => {
        s.isLoading = false;
        s.error = payload as string;
      });

    // ── register ──
    builder
      .addCase(register.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(register.fulfilled, (s, { payload }) => {
        s.isLoading = false;
        s.accessToken = payload.access;
        s.refreshToken = payload.refresh;
        s.user = payload.user;
        s.isAuthenticated = true;
        s.tokenExpiry = parseExpiry(payload.access);
      })
      .addCase(register.rejected, (s, { payload }) => {
        s.isLoading = false;
        s.error = payload as string;
      });

    // ── refresh ──
    builder
      .addCase(refreshAccessToken.fulfilled, (s, { payload }) => {
        s.accessToken = payload.access;
        s.refreshToken = payload.refresh;
        s.tokenExpiry = parseExpiry(payload.access);
      })
      .addCase(refreshAccessToken.rejected, (s) => {
        Object.assign(s, initialState);
      });

    // ── fetchMe ──
    builder
      .addCase(fetchCurrentUser.fulfilled, (s, { payload }) => { s.user = payload; s.isAuthenticated = true; })
      .addCase(fetchCurrentUser.rejected, (s, { payload }) => {
        if (payload === "unauthorized") Object.assign(s, initialState);
      });

    // ── updateProfile ──
    builder.addCase(updateProfile.fulfilled, (s, { payload }) => { s.user = payload; });

    // ── changePassword — update tokens ──
    builder.addCase(changePassword.fulfilled, (s, { payload }) => {
      s.accessToken = payload.access;
      s.refreshToken = payload.refresh;
      s.tokenExpiry = parseExpiry(payload.access);
    });

    // ── logoutUser ──
    builder.addCase(logoutUser.fulfilled, (s) => { Object.assign(s, initialState); });
    builder.addCase(logoutUser.rejected, (s) => { Object.assign(s, initialState); });
  },
});

export const { logout, clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectUser = (s: { auth: AuthState }) => s.auth.user;
export const selectIsAuthenticated = (s: { auth: AuthState }) => s.auth.isAuthenticated;
export const selectAuthLoading = (s: { auth: AuthState }) => s.auth.isLoading;
export const selectAuthError = (s: { auth: AuthState }) => s.auth.error;
export const selectAccessToken = (s: { auth: AuthState }) => s.auth.accessToken;
export const selectTokenExpiry = (s: { auth: AuthState }) => s.auth.tokenExpiry;
export const selectUserInitials = (s: { auth: AuthState }) => {
  const u = s.auth.user;
  if (!u) return "?";
  return u.first_name && u.last_name
    ? `${u.first_name[0]}${u.last_name[0]}`.toUpperCase()
    : u.username.slice(0, 2).toUpperCase();
};
export const selectDisplayName = (s: { auth: AuthState }) => {
  const u = s.auth.user;
  if (!u) return "";
  return u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username;
};
