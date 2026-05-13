"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectIsAuthenticated,
  selectAccessToken,
  selectTokenExpiry,
  fetchCurrentUser,
  refreshAccessToken,
  logout,
} from "@/store/slices/authSlice";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const accessToken = useAppSelector(selectAccessToken);
  const tokenExpiry = useAppSelector(selectTokenExpiry);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const doRefresh = () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    dispatch(refreshAccessToken()).then((result) => {
      isRefreshingRef.current = false;
      if (refreshAccessToken.rejected.match(result)) {
        dispatch(logout());
        router.replace("/auth/login");
      }
    });
  };

  // ── On every navigation: verify auth state ────────────────────────────────
  useEffect(() => {
    if (isPublic) {
      // Already logged in → go to dashboard
      if (isAuthenticated && accessToken) {
        router.replace("/dashboard");
      }
      return;
    }

    // Protected route with no token → redirect to login
    if (!accessToken) {
      dispatch(logout());
      router.replace("/auth/login");
      return;
    }

    // Token exists but may be expired — let the proactive timer handle refresh;
    // only force an immediate refresh if the token is already expired.
    const now = Date.now();
    if (tokenExpiry && tokenExpiry <= now) {
      doRefresh();
    } else if (!isAuthenticated) {
      // Rehydrated token but user not in store yet
      dispatch(fetchCurrentUser()).then((result) => {
        if (fetchCurrentUser.rejected.match(result)) {
          dispatch(logout());
          router.replace("/auth/login");
        }
      });
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Proactive refresh 5 min before expiry ─────────────────────────────────
  useEffect(() => {
    if (!tokenExpiry || isPublic) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    const FIVE_MIN = 5 * 60 * 1000;
    const delay = tokenExpiry - Date.now() - FIVE_MIN;

    if (delay <= 0) {
      doRefresh();
      return;
    }

    refreshTimer.current = setTimeout(doRefresh, delay);

    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [tokenExpiry, dispatch, isPublic]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render logic ──────────────────────────────────────────────────────────

  // On public pages just render (login / register)
  if (isPublic) return <>{children}</>;

  // Protected page: block render until authenticated to avoid flash
  if (!isAuthenticated || !accessToken) return null;

  return <>{children}</>;
}
