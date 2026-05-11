"use client";
import { useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchProjects, fetchProjectStats, deleteProject,
  setFilter, setSelectedProject,
  selectProjects, selectProjectsLoading, selectProjectStats,
  selectGlobalMetrics, selectProjectFilters, selectProjectsError,
} from "@/store/slices/projectsSlice";
import { openModal, pushNotification, selectGlobalSearch } from "@/store/slices/uiSlice";
import { selectUser } from "@/store/slices/authSlice";
import type { Project } from "@/lib/api";

export default function DashboardPage() {
  const dispatch = useAppDispatch();

  const projects = useAppSelector(selectProjects);
  const loading = useAppSelector(selectProjectsLoading);
  const stats = useAppSelector(selectProjectStats);
  const metrics = useAppSelector(selectGlobalMetrics);
  const filters = useAppSelector(selectProjectFilters);
  const error = useAppSelector(selectProjectsError);
  const globalSearch = useAppSelector(selectGlobalSearch);
  const user = useAppSelector(selectUser);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchProjectStats());
  }, [dispatch]);

  // Re-filter when global search changes
  useEffect(() => {
    if (globalSearch !== filters.search) {
      dispatch(setFilter({ search: globalSearch }));
      dispatch(fetchProjects({ search: globalSearch, status: filters.status }));
    }
  }, [globalSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusFilter = (status: string) => {
    dispatch(setFilter({ status }));
    dispatch(fetchProjects({ status, search: filters.search }));
  };

  const handleNewProject = () => dispatch(openModal({ key: "createProject" }));

  const handleEditProject = (p: Project) => {
    dispatch(openModal({ key: "editProject", data: { id: p.id, name: p.name, location: p.location, status: p.status, roof_area: p.roof_area, estimated_generation: p.estimated_generation } }));
  };

  const handleDeleteProject = (p: Project) => {
    dispatch(openModal({ key: "deleteProject", data: { id: p.id, name: p.name } }));
  };

  const handleSelectProject = (id: number) => dispatch(setSelectedProject(id));

  const metricFallback = { total_generation_gwh: 1.42, generation_change_pct: 12.4, active_installations: 342, estimated_savings_usd: 84200 };
  const m = metrics ?? metricFallback;

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">
            {user?.first_name ? `Welcome back, ${user.first_name}` : "Project Dashboard"}
          </h1>
          <p className="text-sm text-[#40484c] mt-1">
            {stats?.total_projects ?? projects.length} projects ·{" "}
            {stats?.active_installations ?? m.active_installations} active installations
          </p>
        </div>
        <button
          onClick={handleNewProject}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Project
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-[#ffdad6] rounded-xl px-4 py-3 mb-6 text-sm text-[#ba1a1a]">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
          {error}
          <button
            className="ml-auto text-[10px] font-bold underline"
            onClick={() => { dispatch(fetchProjects()); dispatch(fetchProjectStats()); }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <MetricCard
          icon="wb_sunny" iconColor="#ffba20"
          label="Global Generation Yield"
          value={m.total_generation_gwh.toFixed(2)} unit="GWh"
          trend={`+${m.generation_change_pct}% vs last month`} trendUp
          subLabel="Daily Cap"
        />
        <MetricCard
          icon="bolt" iconColor="#19667d"
          label="Active Installations"
          value={m.active_installations.toString()}
          subLabel="Across all projects"
        />
        <MetricCard
          icon="payments" iconColor="#166534"
          label="Estimated Savings"
          value={`$${(m.estimated_savings_usd / 1000).toFixed(1)}k`}
          subLabel="YTD Performance"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Projects table */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl overflow-hidden">
            {/* Table header + filter */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f2f4f5]">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">Project Pipeline</h2>
              <div className="flex items-center gap-2">
                {/* Status filter pills */}
                {["", "ACTIVE", "PENDING", "COMPLETED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      filters.status === s
                        ? "bg-[#19667d] text-white"
                        : "bg-[#f2f4f5] text-[#40484c] hover:bg-[#eceeef]"
                    }`}
                  >
                    {s || "All"}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="w-6 h-6 border-2 border-[#19667d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#40484c]">Loading projects…</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {["Project Name", "Status", "Roof Area", "Est. Generation", ""].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[#40484c] border-b border-[#f2f4f5]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, i) => (
                    <tr
                      key={project.id}
                      className={`hover:bg-[#f2f4f5]/60 transition-colors group cursor-pointer ${i % 2 === 1 ? "bg-[#f2f4f5]/40" : ""}`}
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/site-analysis?project=${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block"
                        >
                          <div className="font-medium text-sm text-[#191c1d] group-hover:text-[#19667d] transition-colors">
                            {project.name}
                          </div>
                          <div className="text-xs text-[#70787d] mt-0.5">{project.location}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-[#40484c]">
                        {project.roof_area.toLocaleString()} m²
                      </td>
                      <td className="px-6 py-4 font-headline font-bold text-[#19667d] text-sm">
                        {project.estimated_generation} MWh
                      </td>
                      {/* Row actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                            className="w-7 h-7 rounded-lg bg-[#f2f4f5] hover:bg-[#eceeef] flex items-center justify-center text-[#40484c] transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                            className="w-7 h-7 rounded-lg bg-[#f2f4f5] hover:bg-[#ffdad6] flex items-center justify-center text-[#40484c] hover:text-[#ba1a1a] transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#70787d]">
                        {filters.search || filters.status
                          ? "No projects match your filters."
                          : "No projects yet. Create your first project!"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Geospatial card */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f2f4f5]">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Geospatial View</h2>
            </div>
            <div className="relative h-48 bg-[#eceeef] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#a1e4fe]/20 to-[#19667d]/10" />
              <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full opacity-30">
                <defs>
                  <pattern id="dg" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(141,208,233,0.4)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="400" height="200" fill="url(#dg)"/>
                {projects.map((p, i) => p.latitude && (
                  <circle key={p.id} cx={((p.longitude ?? 0) + 125) * 1.8} cy={(90 - (p.latitude ?? 0)) * 2.5}
                    r={6} fill={p.status === "ACTIVE" ? "#ffba20" : "#8dd0e9"} stroke="#fff" strokeWidth={1.5} opacity={0.9}/>
                ))}
              </svg>
              <div className="relative z-10 text-center">
                <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 28 }}>map</span>
                <p className="text-xs text-[#40484c] mt-1">{projects.length} sites mapped</p>
              </div>
              {/* Floating controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {["add","remove","layers"].map((icon) => (
                  <button key={icon} className="w-7 h-7 rounded-full bg-white/80 backdrop-blur shadow flex items-center justify-center text-[#40484c] hover:bg-white transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="absolute bottom-3 left-3 text-[10px] text-[#40484c] bg-white/80 backdrop-blur rounded-lg px-2 py-1.5 space-y-1">
                {[["#ffba20","Active"],["#8dd0e9","Other"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick tools */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Recommended Tools</h2>
            <div className="space-y-2.5">
              {[
                { icon: "straighten", label: "Roof Measure",    desc: "Calculate usable area",     href: "/roof-measure" },
                { icon: "wb_shade",   label: "Shade Profile",   desc: "Analyze shading losses",    href: "/shade-analysis" },
                { icon: "calculate",  label: "ROI Calculator",  desc: "Financial projections",     href: "/roi-calculator" },
              ].map((t) => (
                <Link key={t.label} href={t.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#f2f4f5] hover:bg-[#eceeef] transition-colors">
                  <span className="material-symbols-outlined text-[#ffba20]" style={{ fontSize: 20 }}>{t.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-[#191c1d]">{t.label}</div>
                    <div className="text-[11px] text-[#40484c]">{t.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pipeline status breakdown */}
          {stats && (
            <div className="bg-white rounded-xl p-5">
              <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Pipeline Status</h2>
              <div className="space-y-3">
                {stats.by_status.map((s) => {
                  const pct = Math.round((s.count / (stats.total_projects || 1)) * 100);
                  const colors: Record<string, string> = { ACTIVE:"#19667d", PENDING:"#ffba20", COMPLETED:"#166534", ARCHIVED:"#70787d" };
                  return (
                    <button key={s.status} onClick={() => handleStatusFilter(s.status)} className="w-full text-left">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#40484c] capitalize">{s.status.toLowerCase()}</span>
                        <span className="font-bold text-[#191c1d]">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#f2f4f5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[s.status] ?? "#70787d" }}/>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
