"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, selectUserInitials, selectDisplayName, updateProfile } from "@/store/slices/authSlice";
import { pushNotification } from "@/store/slices/uiSlice";
import { selectProjects } from "@/store/slices/projectsSlice";
import type { ProjectStatus } from "@/lib/api";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const initials = useAppSelector(selectUserInitials);
  const displayName = useAppSelector(selectDisplayName);
  const projects = useAppSelector(selectProjects);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    title: "", organization: "", bio: "", phone: "",
  });
  const [visibility, setVisibility] = useState({ publicDirectory: true, metricSharing: true });

  // Sync form with user from Redux
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        title: user.profile?.title || "",
        organization: user.profile?.organization || "",
        bio: user.profile?.bio || "",
        phone: user.profile?.phone || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const result = await dispatch(updateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      profile: { title: form.title, organization: form.organization, bio: form.bio, phone: form.phone },
    }));
    setSaving(false);
    if (updateProfile.fulfilled.match(result)) {
      dispatch(pushNotification({ type: "success", title: "Profile saved" }));
      setEditing(false);
    } else {
      dispatch(pushNotification({ type: "error", title: "Save failed", message: "Please try again." }));
    }
  };

  const CERTIFICATIONS = ["P.E. (Professional Engineer)", "SEI Certified Solar PV Installer", "NABCEP Board Certified"];

  const recentProjects = projects.slice(0, 5);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">Engineer Profile</h1>
          <p className="text-sm text-[#40484c] mt-1">Your technical credentials and project impact</p>
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5] transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary px-5 py-2 text-sm disabled:opacity-60 flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Save Profile
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5] transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: identity */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-white rounded-xl p-6 text-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#19667d] to-[#8dd0e9] flex items-center justify-center text-white text-3xl font-bold font-headline mx-auto mb-4">
              {initials}
            </div>

            {editing ? (
              <div className="space-y-3 text-left">
                {[
                  { label: "First Name", key: "first_name" },
                  { label: "Last Name", key: "last_name" },
                  { label: "Email", key: "email", type: "email" },
                  { label: "Job Title", key: "title" },
                  { label: "Organization", key: "organization" },
                  { label: "Phone", key: "phone" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] block mb-1">{f.label}</label>
                    <input
                      type={f.type ?? "text"}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30 focus:bg-white"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] block mb-1">Bio</label>
                  <textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30 focus:bg-white resize-none" />
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-headline font-bold text-xl text-[#191c1d]">{displayName || user?.username}</h2>
                <p className="text-sm text-[#40484c] mt-1">{form.title || "Solar Engineer"}</p>
                <p className="text-[10px] text-[#70787d] uppercase tracking-widest mt-0.5">{form.organization}</p>
                {form.bio && <p className="text-xs text-[#40484c] mt-3 leading-relaxed">{form.bio}</p>}
                <div className="mt-4 space-y-1">
                  {form.email && <p className="text-xs text-[#40484c] flex items-center gap-1.5 justify-center">
                    <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 14 }}>email</span>{form.email}
                  </p>}
                  {form.phone && <p className="text-xs text-[#40484c] flex items-center gap-1.5 justify-center">
                    <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 14 }}>phone</span>{form.phone}
                  </p>}
                  {user?.is_staff && (
                    <p className="text-[10px] text-[#19667d] font-bold uppercase tracking-widest mt-2">Admin</p>
                  )}
                </div>
              </>
            )}

            {/* Certifications */}
            <div className="mt-5 pt-4 border-t border-[#f2f4f5]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">Certifications</p>
              {CERTIFICATIONS.map((cert) => (
                <div key={cert} className="flex items-center gap-2 text-xs text-[#40484c] mb-1.5">
                  <span className="material-symbols-outlined text-[#166534]" style={{ fontSize: 14 }}>verified</span>
                  {cert}
                </div>
              ))}
            </div>
          </div>

          {/* Lifetime impact */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#ffba20]" style={{ fontSize: 20 }}>solar_power</span>
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Lifetime Impact</h2>
            </div>
            <div className="text-center mb-4">
              <div className="font-headline font-bold text-4xl text-[#191c1d]">
                {user?.profile?.total_mw_designed?.toFixed(1) ?? "0.0"}
              </div>
              <div className="text-xs text-[#40484c] uppercase tracking-wider">Total Megawatts Designed</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "assignment_turned_in", label: "Completed", value: String(projects.filter((p) => p.status === "COMPLETED").length) },
                { icon: "pending", label: "Active", value: String(projects.filter((p) => p.status === "ACTIVE").length) },
                { icon: "folder_open", label: "Total Projects", value: String(projects.length) },
                { icon: "home", label: "Homes Powered", value: "4,820" },
              ].map((m) => (
                <div key={m.label} className="bg-[#f2f4f5] rounded-xl p-3 text-center">
                  <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 20 }}>{m.icon}</span>
                  <div className="font-headline font-bold text-lg text-[#191c1d]">{m.value}</div>
                  <div className="text-[10px] text-[#40484c] uppercase tracking-wide">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Profile Visibility</h2>
            {[
              { key: "publicDirectory", label: "Public Directory", desc: "Visible to other engineers" },
              { key: "metricSharing", label: "Metric Sharing", desc: "Allow MW impact ranking" },
            ].map((v) => (
              <div key={v.key} className="flex items-center justify-between mb-3 last:mb-0">
                <div>
                  <p className="text-xs font-bold text-[#191c1d]">{v.label}</p>
                  <p className="text-[10px] text-[#40484c]">{v.desc}</p>
                </div>
                <button
                  onClick={() => setVisibility((p) => ({ ...p, [v.key]: !p[v.key as keyof typeof p] }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${visibility[v.key as keyof typeof visibility] ? "bg-[#19667d]" : "bg-[#bfc8cc]"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${visibility[v.key as keyof typeof visibility] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: activity + projects */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {/* Activity heatmap */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Project Activity</h2>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(52, 1fr)" }}>
              {Array.from({ length: 52 * 7 }, (_, i) => {
                const intensity = Math.random();
                return (
                  <div key={i} className="aspect-square rounded-sm" style={{
                    backgroundColor: intensity > 0.85 ? "#19667d" : intensity > 0.75 ? "#8dd0e9" : intensity > 0.65 ? "#a1e4fe" : "#f2f4f5",
                  }} />
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <span className="text-[10px] text-[#70787d]">Less</span>
              {["#f2f4f5", "#a1e4fe", "#8dd0e9", "#19667d"].map((c) => (
                <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[10px] text-[#70787d]">More</span>
            </div>
          </div>

          {/* Recent projects */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f2f4f5] flex items-center justify-between">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Recent Projects</h2>
              <span className="text-xs text-[#40484c]">{projects.length} total</span>
            </div>
            {recentProjects.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-[#70787d]">No projects yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f2f4f5]/50">
                    {["Project Name", "Status", "Roof Area", "Updated"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[#40484c]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p, i) => (
                    <tr key={p.id} className={`hover:bg-[#f2f4f5]/60 transition-colors ${i % 2 === 1 ? "bg-[#f2f4f5]/30" : ""}`}>
                      <td className="px-6 py-3 text-sm font-medium text-[#191c1d]">{p.name}</td>
                      <td className="px-6 py-3"><StatusBadge status={p.status as ProjectStatus} /></td>
                      <td className="px-6 py-3 text-xs text-[#40484c]">{p.roof_area.toLocaleString()} m²</td>
                      <td className="px-6 py-3 text-xs text-[#40484c]">
                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Technical Expertise</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { skill: "LiDAR Analysis", level: 95 },
                { skill: "Shading Modelling", level: 92 },
                { skill: "Structural Engineering", level: 78 },
                { skill: "Electrical Design", level: 88 },
                { skill: "Financial Modelling", level: 82 },
                { skill: "CAD & BIM", level: 74 },
              ].map((s) => (
                <div key={s.skill}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#40484c]">{s.skill}</span>
                    <span className="font-bold text-[#191c1d]">{s.level}%</span>
                  </div>
                  <div className="h-1.5 bg-[#f2f4f5] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#19667d] to-[#8dd0e9] rounded-full" style={{ width: `${s.level}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
