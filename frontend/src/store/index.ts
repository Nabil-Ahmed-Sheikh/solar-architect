import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage

import authReducer from "./slices/authSlice";
import projectsReducer from "./slices/projectsSlice";
import uiReducer from "./slices/uiSlice";
import lidarReducer from "./slices/lidarSlice";

// ── Persist config ────────────────────────────────────────────────────────────
// Only auth is persisted to localStorage — tokens survive page refresh.
// Projects/UI/LiDAR are re-fetched on load so they stay fresh.

const authPersistConfig = {
  key: "solararchitect:auth",
  storage,
  whitelist: ["accessToken", "refreshToken", "user", "isAuthenticated", "tokenExpiry"],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  projects: projectsReducer,
  ui: uiReducer,
  lidar: lidarReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions are non-serializable — ignore them
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);

// ── Types ─────────────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
