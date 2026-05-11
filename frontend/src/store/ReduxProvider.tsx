"use client";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store";
import { setTokens, logout } from "@/store/slices/authSlice";

function EventBridge() {
  useEffect(() => {
    const onRefresh = (e: Event) => {
      const { access, refresh } = (e as CustomEvent<{ access: string; refresh: string }>).detail;
      store.dispatch(setTokens({ access, refresh }));
    };
    const onLogout = () => store.dispatch(logout());

    window.addEventListener("token:refreshed", onRefresh);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      window.removeEventListener("token:refreshed", onRefresh);
      window.removeEventListener("auth:logout", onLogout);
    };
  }, []);
  return null;
}

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="min-h-screen flex items-center justify-center bg-[#f8fafb]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#19667d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#40484c]">Initialising SolarArchitect…</p>
            </div>
          </div>
        }
        persistor={persistor}
      >
        <EventBridge />
        {children}
      </PersistGate>
    </Provider>
  );
}
