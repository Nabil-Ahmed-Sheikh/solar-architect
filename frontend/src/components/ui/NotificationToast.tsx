"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectNotifications, dismissNotification, type Notification } from "@/store/slices/uiSlice";

const COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "bg-[#dcfce7]", border: "border-[#166534]/20", icon: "check_circle", text: "text-[#166534]" },
  error:   { bg: "bg-[#ffdad6]", border: "border-[#ba1a1a]/20", icon: "error",         text: "text-[#ba1a1a]" },
  warning: { bg: "bg-[#fef9c3]", border: "border-[#854d0e]/20", icon: "warning",       text: "text-[#854d0e]" },
  info:    { bg: "bg-[#a1e4fe]/30", border: "border-[#19667d]/20", icon: "info",       text: "text-[#19667d]" },
};

function Toast({ n }: { n: Notification }) {
  const dispatch = useAppDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const c = COLORS[n.type] ?? COLORS.info;

  useEffect(() => {
    const duration = n.duration ?? 4000;
    if (duration === 0) return; // persistent
    timerRef.current = setTimeout(() => dispatch(dismissNotification(n.id)), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [n.id, n.duration, dispatch]);

  return (
    <div
      className={`flex items-start gap-3 w-80 px-4 py-3 rounded-xl border shadow-lg ${c.bg} ${c.border}
        animate-[slideIn_0.2s_ease-out]`}
      style={{ animation: "slideIn 0.2s ease-out" }}
    >
      <span className={`material-symbols-outlined flex-shrink-0 mt-0.5 ${c.text}`} style={{ fontSize: 18 }}>
        {c.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${c.text}`}>{n.title}</p>
        {n.message && <p className="text-xs text-[#40484c] mt-0.5 leading-relaxed">{n.message}</p>}
      </div>
      <button
        onClick={() => dispatch(dismissNotification(n.id))}
        className="text-[#bfc8cc] hover:text-[#40484c] transition-colors flex-shrink-0"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}

export default function NotificationToast() {
  const notifications = useAppSelector(selectNotifications);
  // Only show the 3 most recent unread toasts
  const visible = notifications.filter((n) => !n.read).slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end">
      {visible.map((n) => (
        <Toast key={n.id} n={n} />
      ))}
    </div>
  );
}
