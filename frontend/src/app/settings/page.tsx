"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { changePassword, updateProfile, selectUser, selectAuthLoading } from "@/store/slices/authSlice";
import { pushNotification } from "@/store/slices/uiSlice";
import { clsx } from "clsx";

type Tab = "defaults" | "notifications" | "account" | "api" | "storage";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "defaults",      icon: "grid_view",            label: "Project Defaults" },
  { id: "notifications", icon: "notifications_active",  label: "Notifications" },
  { id: "account",       icon: "lock_open",             label: "Account & Security" },
  { id: "api",           icon: "cloud_sync",            label: "API & Integrations" },
  { id: "storage",       icon: "storage",               label: "Storage Usage" },
];

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <button onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-[#19667d]" : "bg-[#bfc8cc]"}`}>
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const authLoading = useAppSelector(selectAuthLoading);
  const [activeTab, setActiveTab] = useState<Tab>("account");

  // Defaults state
  const [panelType, setPanelType] = useState("monocrystalline");
  const [utilityRate, setUtilityRate] = useState("0.18");
  const [inverterEff, setInverterEff] = useState("97");
  const [mounting, setMounting] = useState("fixed");

  // Notifications
  const [notifs, setNotifs] = useState({ reportReady: true, collision: true, dbSync: false });

  // Account – profile fields
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    title: user?.profile?.title ?? "",
    organization: user?.profile?.organization ?? "",
    phone: user?.profile?.phone ?? "",
  });

  // Account – password
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // API keys
  const [googleMapsKey, setGoogleMapsKey] = useState("");
  const [pvWattsKey, setPvWattsKey] = useState("");

  const notify = (type: "success" | "error", title: string, message?: string) =>
    dispatch(pushNotification({ type, title, message }));

  const handleSaveProfile = async () => {
    const result = await dispatch(updateProfile({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      email: profileForm.email,
      profile: { title: profileForm.title, organization: profileForm.organization, phone: profileForm.phone },
    }));
    if (updateProfile.fulfilled.match(result)) notify("success", "Profile updated");
    else notify("error", "Update failed", "Please try again.");
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current_password || !pwForm.new_password) { setPwError("All fields are required."); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    if (pwForm.new_password.length < 8) { setPwError("Password must be at least 8 characters."); return; }

    setPwLoading(true);
    const result = await dispatch(changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password }));
    setPwLoading(false);

    if (changePassword.fulfilled.match(result)) {
      notify("success", "Password updated", "You've been issued a new session token.");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } else {
      const msg = (result.payload as string) ?? "Password change failed.";
      setPwError(msg);
      notify("error", "Password change failed", msg);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">System Settings</h1>
          <p className="text-sm text-[#40484c] mt-1">Configure global parameters and technical preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Tab nav */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <nav className="bg-white rounded-xl overflow-hidden">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx("w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left transition-colors border-l-4",
                  activeTab === tab.id
                    ? "border-[#19667d] bg-[#a1e4fe]/10 text-[#19667d] font-bold"
                    : "border-transparent text-[#40484c] hover:bg-[#f2f4f5]"
                )}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="bg-white rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">Storage</p>
            <div className="h-2 bg-[#f2f4f5] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-[#19667d] to-[#ffba20] rounded-full" style={{ width: "64%" }} />
            </div>
            <p className="text-xs text-[#40484c]">12.8 GB of 20 GB used</p>
          </div>
        </div>

        {/* Tab content */}
        <div className="col-span-12 lg:col-span-9">

          {/* ── ACCOUNT ── */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* Profile info */}
              <div className="bg-white rounded-xl p-6">
                <h2 className="font-headline font-bold text-base text-[#191c1d] mb-5">Profile Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "First Name", key: "first_name" },
                    { label: "Last Name", key: "last_name" },
                    { label: "Email Address", key: "email" },
                    { label: "Job Title", key: "title" },
                    { label: "Organization", key: "organization" },
                    { label: "Phone", key: "phone" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">{f.label}</label>
                      <input
                        value={profileForm[f.key as keyof typeof profileForm]}
                        onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-[#f2f4f5]">
                  <button onClick={handleSaveProfile} disabled={authLoading}
                    className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60 flex items-center gap-2">
                    {authLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Save Profile
                  </button>
                </div>
              </div>

              {/* Change password */}
              <div className="bg-white rounded-xl p-6">
                <h2 className="font-headline font-bold text-base text-[#191c1d] mb-5">Change Password</h2>
                {pwError && (
                  <div className="flex items-center gap-2 bg-[#ffdad6] rounded-xl px-4 py-3 mb-4 text-sm text-[#ba1a1a]">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {pwError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Current Password", key: "current_password" },
                    { label: "", key: "" }, // spacer
                    { label: "New Password", key: "new_password" },
                    { label: "Confirm New Password", key: "confirm" },
                  ].map((f, i) =>
                    f.key ? (
                      <div key={f.key}>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">{f.label}</label>
                        <input
                          type="password"
                          value={pwForm[f.key as keyof typeof pwForm]}
                          onChange={(e) => setPwForm((p) => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white transition-all"
                        />
                      </div>
                    ) : <div key={i} />
                  )}
                </div>
                <div className="mt-5 pt-4 border-t border-[#f2f4f5]">
                  <button onClick={handleChangePassword} disabled={pwLoading}
                    className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60 flex items-center gap-2">
                    {pwLoading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Update Password
                  </button>
                </div>
              </div>

              {/* 2FA (UI only) */}
              <div className="bg-white rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 22 }}>verified_user</span>
                  <div>
                    <p className="text-sm font-bold text-[#191c1d]">Two-Factor Authentication</p>
                    <p className="text-xs text-[#40484c]">Protect your account with TOTP 2FA</p>
                  </div>
                </div>
                <Toggle value={false} onChange={() => notify("info", "2FA coming soon", "This feature is in development.")} />
              </div>
            </div>
          )}

          {/* ── DEFAULTS ── */}
          {activeTab === "defaults" && (
            <div className="bg-white rounded-xl p-6 space-y-5">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">Project Defaults</h2>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">Default Panel Type</label>
                <div className="space-y-2">
                  {[
                    { value: "monocrystalline", label: "Monocrystalline PERC – 400W" },
                    { value: "bifacial", label: "Bifacial High-Efficiency – 450W" },
                    { value: "thin_film", label: "Thin Film Flexible – 120W" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 bg-[#f2f4f5] rounded-xl cursor-pointer hover:bg-[#eceeef]">
                      <input type="radio" name="panel" value={opt.value} checked={panelType === opt.value} onChange={() => setPanelType(opt.value)} className="accent-[#19667d]" />
                      <span className="text-sm text-[#191c1d]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">Standard Utility Rate ($/kWh)</label>
                <input type="number" value={utilityRate} onChange={(e) => setUtilityRate(e.target.value)} step={0.01} min={0}
                  className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">Inverter Efficiency Target</label>
                <div className="flex gap-2">
                  {["90", "97", "99"].map((v) => (
                    <button key={v} onClick={() => setInverterEff(v)}
                      className={clsx("flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors",
                        inverterEff === v ? "bg-[#19667d] text-white border-[#19667d]" : "border-[#bfc8cc]/40 text-[#40484c] hover:bg-[#f2f4f5]")}>
                      {v}%{v === "97" ? " (Standard)" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">Mounting System</label>
                <div className="flex gap-2">
                  {["Fixed Tilt", "Single Axis", "Dual Axis"].map((opt) => {
                    const v = opt.toLowerCase().replace(" ", "_");
                    return (
                      <button key={v} onClick={() => setMounting(v)}
                        className={clsx("flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors",
                          mounting === v ? "bg-[#19667d] text-white border-[#19667d]" : "border-[#bfc8cc]/40 text-[#40484c] hover:bg-[#f2f4f5]")}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pt-2">
                <button onClick={() => notify("success", "Defaults saved")} className="btn-primary px-8 py-2.5 text-sm">
                  Save Defaults
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl p-6 space-y-4">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">Notification Preferences</h2>
              {[
                { key: "reportReady", icon: "description", label: "Report Readiness", desc: "Email alert when PDF analysis reports are generated." },
                { key: "collision", icon: "warning", label: "Design Collision Alerts", desc: "Real-time alerts for panel placement overlapping obstacles." },
                { key: "dbSync", icon: "sync", label: "Database Sync Updates", desc: "Weekly digest of solar irradiance data updates." },
              ].map((n) => (
                <div key={n.key} className="flex items-start gap-4 p-4 bg-[#f2f4f5] rounded-xl">
                  <span className="material-symbols-outlined text-[#19667d] mt-0.5" style={{ fontSize: 22 }}>{n.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#191c1d]">{n.label}</p>
                    <p className="text-xs text-[#40484c] mt-0.5">{n.desc}</p>
                  </div>
                  <Toggle value={notifs[n.key as keyof typeof notifs]}
                    onChange={() => setNotifs((p) => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))} />
                </div>
              ))}
              <div className="pt-2">
                <button onClick={() => notify("success", "Notification preferences saved")} className="btn-primary px-8 py-2.5 text-sm">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ── API ── */}
          {activeTab === "api" && (
            <div className="bg-white rounded-xl p-6 space-y-5">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">API & Integrations</h2>
              <p className="text-sm text-[#40484c]">Connect external services for live satellite imagery, irradiance data, and weather feeds.</p>
              <div className="space-y-4">
                {[
                  { label: "Google Maps API Key", value: googleMapsKey, set: setGoogleMapsKey, desc: "Enables satellite view in Site Analysis. Get key at console.cloud.google.com" },
                  { label: "PVWatts API Key (NREL)", value: pvWattsKey, set: setPvWattsKey, desc: "Live irradiance and energy production estimates from NREL." },
                ].map((f) => (
                  <div key={f.label} className="p-4 border border-[#eceeef] rounded-xl">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">{f.label}</label>
                    <input type="password" value={f.value} onChange={(e) => f.set(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#19667d]/30 focus:bg-white mb-2" />
                    <p className="text-[10px] text-[#40484c]">{f.desc}</p>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">LiDAR Data Source</label>
                <div className="space-y-2">
                  {[
                    { value: "alberta_open", label: "Alberta Open Data (Free — recommended for AB projects)" },
                    { value: "usgs_3dep", label: "USGS 3DEP (Free — USA coverage)" },
                    { value: "upload", label: "Manual Upload (.laz / .las)" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 bg-[#f2f4f5] rounded-xl cursor-pointer">
                      <input type="radio" name="lidar_source" value={opt.value} defaultChecked={opt.value === "alberta_open"} className="accent-[#19667d]" />
                      <span className="text-sm text-[#191c1d]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={() => notify("success", "API settings saved")} className="btn-primary px-8 py-2.5 text-sm">
                Save API Keys
              </button>
            </div>
          )}

          {/* ── STORAGE ── */}
          {activeTab === "storage" && (
            <div className="bg-white rounded-xl p-6 space-y-5">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">Storage Usage</h2>
              {[
                { label: "LiDAR Point Clouds", size: "8.2 GB", pct: 41, color: "#19667d" },
                { label: "DSM / GeoTIFF Tiles", size: "2.8 GB", pct: 14, color: "#ffba20" },
                { label: "Project Files & Reports", size: "1.2 GB", pct: 6, color: "#8dd0e9" },
                { label: "Media & Exports", size: "0.6 GB", pct: 3, color: "#bfc8cc" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#40484c]">{item.label}</span>
                    <span className="font-bold text-[#191c1d]">{item.size}</span>
                  </div>
                  <div className="h-2 bg-[#f2f4f5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct * 2.5}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <div className="p-4 bg-[#f2f4f5] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#191c1d]">12.8 GB of 20 GB used</p>
                  <p className="text-xs text-[#40484c] mt-0.5">7.2 GB remaining</p>
                </div>
                <button className="px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-white transition-colors">
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
