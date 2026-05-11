"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { reportsApi, projectsApi, type EnergyReport, type Project } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Fallback mock data
const MOCK_MONTHLY = MONTH_NAMES.map((name, i) => ({
  month: i + 1,
  month_name: name,
  generation_kwh: [38000, 42000, 51000, 58000, 64000, 72000, 75000, 71000, 62000, 53000, 41000, 36000][i],
  consumption_kwh: [45000, 43000, 40000, 37000, 36000, 35000, 34000, 34500, 36000, 40000, 44000, 47000][i],
  irradiance_kwh_m2: [2.8, 3.4, 4.5, 5.6, 6.2, 6.8, 7.1, 6.9, 5.8, 4.6, 3.2, 2.5][i],
  peak_power_kw: [237, 262, 318, 362, 400, 450, 468, 443, 387, 331, 256, 225][i],
  id: i + 1,
}));

const MOCK_REPORT: EnergyReport = {
  id: 1,
  project: 1,
  project_name: "Greenway Logistics Hub",
  report_year: 2024,
  total_generation_kwh: 603000,
  total_consumption_kwh: 471000,
  net_export_kwh: 132000,
  co2_avoided_kg: 271350,
  savings_usd: 168840,
  revenue_usd: 36960,
  performance_ratio: 0.82,
  capacity_factor: 18.5,
  monthly_data: MOCK_MONTHLY,
  generated_at: new Date().toISOString(),
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur border border-[#eceeef] rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-bold text-[#191c1d] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#40484c]">{p.name}:</span>
          <span className="font-bold text-[#191c1d]">{p.value.toLocaleString()} kWh</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [report, setReport] = useState<EnergyReport>(MOCK_REPORT);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [activeChart, setActiveChart] = useState<"area" | "bar">("area");

  useEffect(() => {
    projectsApi.list().then((r) => setProjects(r.data.results)).catch(() => {});
    if (projectId) {
      projectsApi.get(Number(projectId)).then((r) => setProject(r.data)).catch(() => {});
      reportsApi.list(Number(projectId), selectedYear).then((r) => {
        if (r.data.results.length) setReport(r.data.results[0]);
      }).catch(() => {});
    }
  }, [projectId, selectedYear]);

  const chartData = (report.monthly_data.length ? report.monthly_data : MOCK_MONTHLY).map((m) => ({
    name: m.month_name,
    Generation: Math.round(m.generation_kwh / 1000),
    Consumption: Math.round(m.consumption_kwh / 1000),
    Irradiance: m.irradiance_kwh_m2,
  }));

  const kpiCards = [
    {
      icon: "bolt",
      label: "Total Generation",
      value: (report.total_generation_kwh / 1000).toFixed(1),
      unit: "MWh",
      color: "#ffba20",
      sub: `${report.report_year}`,
    },
    {
      icon: "co2",
      label: "CO₂ Avoided",
      value: (report.co2_avoided_kg / 1000).toFixed(1),
      unit: "t",
      color: "#166534",
      sub: "Carbon offset",
    },
    {
      icon: "payments",
      label: "Total Savings",
      value: `$${(report.savings_usd / 1000).toFixed(1)}k`,
      unit: "",
      color: "#19667d",
      sub: "vs. grid cost",
    },
    {
      icon: "speed",
      label: "Performance Ratio",
      value: `${(report.performance_ratio * 100).toFixed(0)}`,
      unit: "%",
      color: "#513800",
      sub: `CF: ${report.capacity_factor.toFixed(1)}%`,
    },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">Energy Generation Report</h1>
          <p className="text-sm text-[#40484c] mt-1">
            {report.project_name} · {report.report_year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Project selector */}
          <select
            className="bg-[#f2f4f5] border-none rounded-xl px-4 py-2 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#ffba20]/30"
            value={projectId ?? ""}
            onChange={(e) => {
              const url = new URL(window.location.href);
              if (e.target.value) url.searchParams.set("project", e.target.value);
              else url.searchParams.delete("project");
              window.history.pushState({}, "", url);
              window.location.reload();
            }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Year selector */}
          <select
            className="bg-[#f2f4f5] border-none rounded-xl px-4 py-2 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#ffba20]/30"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2023, 2022].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#40484c]">{kpi.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: kpi.color }}>{kpi.icon}</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="font-headline font-bold text-3xl text-[#191c1d] leading-none">{kpi.value}</span>
              {kpi.unit && <span className="text-sm text-[#40484c] mb-0.5">{kpi.unit}</span>}
            </div>
            <p className="text-[10px] text-[#70787d] uppercase tracking-widest mt-2">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main charts column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Generation vs Consumption chart */}
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline font-bold text-base text-[#191c1d]">Monthly Generation vs Consumption</h2>
                <p className="text-xs text-[#40484c] mt-0.5">Values in MWh · {report.report_year}</p>
              </div>
              <div className="flex rounded-xl overflow-hidden border border-[#eceeef]">
                {(["area", "bar"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveChart(type)}
                    className={`px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                      activeChart === type ? "bg-[#19667d] text-white" : "text-[#40484c] hover:bg-[#f2f4f5]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              {activeChart === "area" ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffba20" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffba20" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="conGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#19667d" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#19667d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bfc8cc" strokeOpacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#40484c" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#40484c" }} axisLine={false} tickLine={false} unit=" MWh" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Generation" stroke="#ffba20" strokeWidth={2} fill="url(#genGrad)" dot={false} />
                  <Area type="monotone" dataKey="Consumption" stroke="#19667d" strokeWidth={2} fill="url(#conGrad)" dot={false} />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#bfc8cc" strokeOpacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#40484c" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#40484c" }} axisLine={false} tickLine={false} unit=" MWh" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Generation" fill="#ffba20" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Consumption" fill="#19667d" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Irradiance chart */}
          <div className="bg-white rounded-xl p-6">
            <div className="mb-5">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">Monthly Solar Irradiance</h2>
              <p className="text-xs text-[#40484c] mt-0.5">kWh/m² · {report.report_year}</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bfc8cc" strokeOpacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#40484c" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#40484c" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v} kWh/m²`, "Irradiance"]} />
                <Bar dataKey="Irradiance" fill="#8dd0e9" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly data table */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f2f4f5]">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Monthly Breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f2f4f5]/50">
                  {["Month", "Generation", "Consumption", "Net Export", "Irradiance"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[#40484c]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(report.monthly_data.length ? report.monthly_data : MOCK_MONTHLY).map((m, i) => {
                  const netExport = m.generation_kwh - m.consumption_kwh;
                  return (
                    <tr key={m.month} className={i % 2 === 1 ? "bg-[#f2f4f5]/40" : ""}>
                      <td className="px-5 py-3 font-medium text-[#191c1d]">{m.month_name}</td>
                      <td className="px-5 py-3 font-headline font-bold text-[#ffba20]">
                        {(m.generation_kwh / 1000).toFixed(1)} MWh
                      </td>
                      <td className="px-5 py-3 text-[#40484c]">{(m.consumption_kwh / 1000).toFixed(1)} MWh</td>
                      <td className={`px-5 py-3 font-medium ${netExport >= 0 ? "text-[#166534]" : "text-[#ba1a1a]"}`}>
                        {netExport >= 0 ? "+" : ""}{(netExport / 1000).toFixed(1)} MWh
                      </td>
                      <td className="px-5 py-3 text-[#40484c]">{m.irradiance_kwh_m2} kWh/m²</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Annual summary */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Annual Summary</h3>
            <div className="space-y-4">
              {[
                { label: "Total Generation", value: `${(report.total_generation_kwh / 1000).toFixed(1)} MWh`, bar: 1 },
                { label: "Total Consumption", value: `${(report.total_consumption_kwh / 1000).toFixed(1)} MWh`, bar: report.total_consumption_kwh / report.total_generation_kwh },
                { label: "Net Export", value: `${(report.net_export_kwh / 1000).toFixed(1)} MWh`, bar: report.net_export_kwh / report.total_generation_kwh },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#40484c]">{row.label}</span>
                    <span className="font-bold text-[#191c1d]">{row.value}</span>
                  </div>
                  <div className="h-1.5 bg-[#f2f4f5] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#ffba20] transition-all"
                      style={{ width: `${Math.min(100, row.bar * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental impact */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Environmental Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "eco", label: "CO₂ Avoided", value: `${(report.co2_avoided_kg / 1000).toFixed(1)}t`, color: "#166534" },
                { icon: "forest", label: "Trees Equiv.", value: `${Math.round(report.co2_avoided_kg / 21)}`, color: "#19667d" },
                { icon: "local_gas_station", label: "Fuel Saved", value: `${Math.round(report.co2_avoided_kg / 2.3)} L`, color: "#513800" },
                { icon: "home", label: "Homes Powered", value: `${Math.round(report.total_generation_kwh / 10000)}`, color: "#ffba20" },
              ].map((item) => (
                <div key={item.label} className="bg-[#f2f4f5] rounded-xl p-3 text-center">
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: item.color }}>{item.icon}</span>
                  <div className="font-headline font-bold text-lg text-[#191c1d] mt-1">{item.value}</div>
                  <div className="text-[10px] text-[#40484c] uppercase tracking-wide">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Financial Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Grid Cost Saved", value: `$${report.savings_usd.toLocaleString()}`, positive: true },
                { label: "Export Revenue", value: `$${report.revenue_usd.toLocaleString()}`, positive: true },
                { label: "Total Benefit", value: `$${(report.savings_usd + report.revenue_usd).toLocaleString()}`, positive: true, bold: true },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between items-center ${row.bold ? "pt-3 border-t border-[#f2f4f5]" : ""}`}>
                  <span className={`text-xs ${row.bold ? "font-bold text-[#191c1d]" : "text-[#40484c]"}`}>{row.label}</span>
                  <span className={`text-xs font-bold ${row.positive ? "text-[#166534]" : "text-[#ba1a1a]"} ${row.bold ? "text-sm" : ""}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance gauge */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">System Performance</h3>
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 120 70" className="w-full max-w-[160px]">
                {/* Track */}
                <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#f2f4f5" strokeWidth="8" strokeLinecap="round" />
                {/* Value arc */}
                <path
                  d="M 10 60 A 50 50 0 0 1 110 60"
                  fill="none"
                  stroke="#ffba20"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${report.performance_ratio * 157} 157`}
                />
                <text x="60" y="62" textAnchor="middle" className="font-headline" style={{ fontSize: 18, fontWeight: 700, fill: "#191c1d", fontFamily: "Space Grotesk" }}>
                  {(report.performance_ratio * 100).toFixed(0)}%
                </text>
                <text x="60" y="74" textAnchor="middle" style={{ fontSize: 8, fill: "#40484c" }}>
                  Performance Ratio
                </text>
              </svg>
            </div>
            <div className="flex justify-between text-xs mt-3">
              <div className="text-center">
                <div className="font-bold text-[#191c1d]">{report.capacity_factor.toFixed(1)}%</div>
                <div className="text-[#40484c]">Capacity Factor</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-[#191c1d]">A+</div>
                <div className="text-[#40484c]">Rating</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-[#191c1d]">2,100</div>
                <div className="text-[#40484c]">Peak Hours</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
