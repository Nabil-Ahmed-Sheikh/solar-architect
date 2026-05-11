import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  read: boolean;
}

export type ModalKey =
  | "createProject"
  | "deleteProject"
  | "editProject"
  | "confirmLogout"
  | null;

export interface UIState {
  notifications: Notification[];
  activeModal: ModalKey;
  modalData: Record<string, unknown>;
  sidebarCollapsed: boolean;
  globalSearchQuery: string;
  isGeneratingDesign: boolean;
  theme: "light" | "dark";
}

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: UIState = {
  notifications: [],
  activeModal: null,
  modalData: {},
  sidebarCollapsed: false,
  globalSearchQuery: "",
  isGeneratingDesign: false,
  theme: "light",
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Notifications
    pushNotification(state, action: PayloadAction<Omit<Notification, "id" | "read">>) {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.notifications.unshift({ ...action.payload, id, read: false });
      // Cap at 20 notifications
      if (state.notifications.length > 20) {
        state.notifications = state.notifications.slice(0, 20);
      }
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find((n) => n.id === action.payload);
      if (n) n.read = true;
    },
    markAllRead(state) {
      state.notifications.forEach((n) => (n.read = true));
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearAllNotifications(state) {
      state.notifications = [];
    },

    // Modals
    openModal(state, action: PayloadAction<{ key: ModalKey; data?: Record<string, unknown> }>) {
      state.activeModal = action.payload.key;
      state.modalData = action.payload.data ?? {};
    },
    closeModal(state) {
      state.activeModal = null;
      state.modalData = {};
    },

    // Layout
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },

    // Search
    setGlobalSearch(state, action: PayloadAction<string>) {
      state.globalSearchQuery = action.payload;
    },

    // Design
    setGeneratingDesign(state, action: PayloadAction<boolean>) {
      state.isGeneratingDesign = action.payload;
    },

    // Theme
    toggleTheme(state) {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
  },
});

export const {
  pushNotification,
  markNotificationRead,
  markAllRead,
  dismissNotification,
  clearAllNotifications,
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarCollapsed,
  setGlobalSearch,
  setGeneratingDesign,
  toggleTheme,
} = uiSlice.actions;

export default uiSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectUnreadCount = (state: { ui: UIState }) =>
  state.ui.notifications.filter((n) => !n.read).length;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectModalData = (state: { ui: UIState }) => state.ui.modalData;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectGlobalSearch = (state: { ui: UIState }) => state.ui.globalSearchQuery;
export const selectIsGeneratingDesign = (state: { ui: UIState }) => state.ui.isGeneratingDesign;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
