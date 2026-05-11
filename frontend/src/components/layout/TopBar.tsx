"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser, selectDisplayName, selectUserInitials, selectUser } from "@/store/slices/authSlice";
import {
  selectNotifications, selectUnreadCount,
  markAllRead, dismissNotification, setGlobalSearch,
  type Notification,
} from "@/store/slices/uiSlice";
import { clsx } from "clsx";

interface TopBarProps {
  onGenerateDesign?: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  success: "text-[#166534]",
  error: "text-[#ba1a1a]",
  warning: "text-[#854d0e]",
  info: "text-[#19667d]",
};
const TYPE_ICON: Record<string, string> = {
  success: "check_circle", error: "error", warning: "warning", info: "info",
};

function NotificationPanel({
  notifications, onMarkAll, onDismiss, onClose,
}: {
  notifications: Notification[];
  onMarkAll: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-[#eceeef] z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f2f4f5]">
        <h3 className="font-headline font-bold text-sm text-[#191c1d]">Notifications</h3>
        <button onClick={onMarkAll} className="text-[10px] font-bold text-[#19667d] hover:opacity-75">
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-[#bfc8cc]" style={{ fontSize: 32 }}>
              notifications_none
            </span>
            <p className="text-xs text-[#70787d] mt-2">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={clsx(
                "flex items-start gap-3 px-4 py-3 border-b border-[#f2f4f5] last:border-0 transition-colors",
                !n.read && "bg-[#a1e4fe]/10"
              )}
            >
              <span
                className={clsx("material-symbols-outlined mt-0.5 flex-shrink-0", TYPE_COLOR[n.type])}
                style={{ fontSize: 18 }}
              >
                {TYPE_ICON[n.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#191c1d]">{n.title}</p>
                {n.message && <p className="text-[10px] text-[#40484c] mt-0.5 leading-relaxed">{n.message}</p>}
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="text-[#bfc8cc] hover:text-[#40484c] transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-[#f2f4f5] flex justify-end">
        <button onClick={onClose} className="text-[10px] text-[#40484c] hover:text-[#19667d]">
          Close
        </button>
      </div>
    </div>
  );
}

function UserMenu({
  displayName, initials, user, onLogout, onClose,
}: {
  displayName: string;
  initials: string;
  user: ReturnType<typeof selectUser>;
  onLogout: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-[#eceeef] z-50 overflow-hidden">
      <div className="px-4 py-4 bg-[#f2f4f5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#a1e4fe] flex items-center justify-center text-[#19667d] font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#191c1d] truncate">{displayName}</p>
            <p className="text-[10px] text-[#70787d] truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="py-1">
        {[
          { href: "/profile", icon: "account_circle", label: "My Profile" },
          { href: "/settings", icon: "settings", label: "Settings" },
          { href: "/support", icon: "help_center", label: "Support" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#40484c] hover:bg-[#f2f4f5] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {user?.is_staff && (
          <Link
            href="/admin"
            target="_blank"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#40484c] hover:bg-[#f2f4f5] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>admin_panel_settings</span>
            Admin Panel
          </Link>
        )}
      </div>

      <div className="border-t border-[#f2f4f5] py-1">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function TopBar({ onGenerateDesign }: TopBarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const displayName = useAppSelector(selectDisplayName);
  const initials = useAppSelector(selectUserInitials);
  const user = useAppSelector(selectUser);
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [search, setSearch] = useState("");

  const notifsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    dispatch(setGlobalSearch(v));
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await dispatch(logoutUser());
    router.push("/auth/login");
  };

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/90 backdrop-blur-xl border-b border-[#bfc8cc]/30 flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex items-center gap-6 flex-1">
        <div className="relative w-full max-w-sm">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#70787d]"
            style={{ fontSize: 18 }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search projects or coordinates…"
            className="w-full bg-[#f2f4f5] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ffba20]/30 placeholder:text-[#70787d] transition-all"
          />
        </div>
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/support" className="text-[#40484c] hover:text-[#ffba20] text-sm font-medium transition-colors">
            Documentation
          </Link>
          <Link href="/dashboard" className="text-[#40484c] hover:text-[#ffba20] text-sm font-medium transition-colors">
            Global Metrics
          </Link>
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => { setShowNotifs((p) => !p); setShowUserMenu(false); }}
            className="p-2 text-[#40484c] hover:bg-[#eceeef] rounded-full transition-colors relative"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[#ba1a1a] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <NotificationPanel
              notifications={notifications}
              onMarkAll={() => dispatch(markAllRead())}
              onDismiss={(id) => dispatch(dismissNotification(id))}
              onClose={() => setShowNotifs(false)}
            />
          )}
        </div>

        <div className="h-6 w-px bg-[#bfc8cc]/50" />

        {/* Generate design CTA */}
        <button onClick={onGenerateDesign} className="btn-primary px-5 py-2 text-sm">
          Generate Design
        </button>

        {/* User avatar + menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setShowUserMenu((p) => !p); setShowNotifs(false); }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#191c1d] leading-tight">{displayName || "Loading…"}</p>
              <p className="text-[10px] text-[#40484c] leading-tight">
                {user?.profile?.title || user?.is_staff ? "Admin" : "Engineer"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#a1e4fe] flex items-center justify-center text-[#19667d] font-bold text-sm border-2 border-[#f2f4f5] flex-shrink-0">
              {initials}
            </div>
          </button>
          {showUserMenu && (
            <UserMenu
              displayName={displayName}
              initials={initials}
              user={user}
              onLogout={handleLogout}
              onClose={() => setShowUserMenu(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
