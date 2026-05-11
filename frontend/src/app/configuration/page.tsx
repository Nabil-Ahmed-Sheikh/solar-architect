"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DSMViewer from "@/components/lidar/DSMViewer";
import { configurationsApi, projectsApi, lidarApi, type SystemConfiguration, type PanelSpec, type InverterSpec, type Project, type LiDARScan, type RoofSegment } from "@/lib/api";
import { clsx } from "clsx";

const FALLBACK_PANELS: PanelSpec[] = [
  { id: 1, manufacturer: "SunPower", model_name: "Maxeon 6", watt_peak: 440, length_mm: 1812, width_mm: 1046, efficiency_pct: 22.8, warranty_years: 40 },
  { id: 2, manufacturer: "LG", model_name: "NeON R ACe", watt_peak: 380, length_mm: 1740, width_mm: 1000, efficiency_pct: 21.7, warranty_years: 25 },
  { id: 3, manufacturer: "Jinko Solar", model_name: "Tiger Neo", watt_peak: 415, length_mm: 1903, width_mm: 1134, efficiency_pct: 22.3, warranty_years: 30 },
];

const FALLBACK_INVERTERS: InverterSpec[] = [
  { id: 1, manufacturer: "SolarEdge", model_name: "SE10K-RWS", rated_power_kw: 10, efficiency_pct: 99.2, inverter_type: "string" },
  { id: 2, manufacturer: "Enphase", model_name: "IQ8+", rated_power_kw: 0.295, efficiency_pct: 97.0, inverter_type: "micro" },
  { id: 3, manufacturer: "Fronius", model_name: "Primo 15.0", rated_power_kw: 15, efficiency_pct: 98.1, inverter_type: "string" },
];

const GRID_ROWS = 8, GRID_COLS = 12;
type CellState = "empty" | "placed" | "obstructed";

function ConfigContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [panels, setPanels] = useState<PanelSpec[]>(FALLBACK_PANELS);
  const [inverters, setInverters] = useState<InverterSpec[]>(FALLBACK_INVERTERS);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<PanelSpec>(FALLBACK_PANELS[0]);
  const [selectedInverter, setSelectedInverter] = useState<InverterSpec>(FALLBACK_INVERTERS[0]);
  const [config, setConfig] = useState({ num_strings: 2, panels_per_string: 12, tilt_angle: 20, azimuth_angle: 180 });
  const [grid, setGrid] = useState<CellState[][]>(() => {
    const g: CellState[][] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill("empty"));
    for (let r = 0; r < 4; r++) for (let c = 1; c < 7; c++) g[r][c] = "placed";
    g[1][3] = "obstructed"; g[2][5] = "obstructed";
    return g;
  });
  const [activeTab, setActiveTab] = useState<"panels" | "inverter" | "strings">("panels");
  const [viewMode, setViewMode] = useState<"grid" | "lidar">("lidar");
  const [lidarScan, setLidarScan] = useState<LiDARScan | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<RoofSegment | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const placedCount = grid.flat().filter((c) => c === "placed").length;
  const systemKwp = (placedCount * selectedPanel.watt_peak) / 1000;

  useEffect(() => {
    if (projectId) {
      projectsApi.get(Number(projectId)).then((r) => setProject(r.data)).catch(() => {});
      lidarApi.list(Number(projectId)).then((r) => {
        if (r.data.results.length) setLidarScan(r.data.results[0]);
      }).catch(() => {});
    }
    configurationsApi.panels().then((r) => { if (r.data.results.length) { setPanels(r.data.results); setSelectedPanel(r.data.results[0]); } }).catch(() => {});
    configurationsApi.inverters().then((r) => { if (r.data.results.length) { setInverters(r.data.results); setSelectedInverter(r.data.results[0]); } }).catch(() => {});
  }, [projectId]);

  // When a LiDAR segment is selected, auto-populate config from it
  const handleSegmentSelect = useCallback((seg: RoofSegment) => {
    setSelectedSegment(seg);
    setConfig((p) => ({
      ...p,
      tilt_angle: Math.round(seg.slope_degrees),
      azimuth_angle: Math.round(seg.azimuth_degrees),
    }));
    // Auto-place panels based on segment usable area
    const panelArea = (selectedPanel.length_mm / 1000) * (selectedPanel.width_mm / 1000);
    const maxPanels = Math.floor(seg.usable_area_m2 / panelArea);
    const newGrid: CellState[][] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill("empty") as CellState[]);
    let placed = 0;
    outer: for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (placed >= maxPanels) break outer;
        newGrid[r][c] = "placed";
        placed++;
      }
    }
    setGrid(newGrid);
  }, [selectedPanel]);

  const handleCellClick = useCallback((r: number, c: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]) as CellState[][];
      if (next[r][c] === "obstructed") return next;
      next[r][c] = next[r][c] === "placed" ? "empty" : "placed";
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (projectId) {
        await configurationsApi.createSystem({
          project: Number(projectId),
          panel_spec: selectedPanel.id,
          inverter_spec: selectedInverter.id,
          num_panels: placedCount,
          system_size_kwp: parseFloat(systemKwp.toFixed(2)),
          tilt_angle: config.tilt_angle,
          azimuth_angle: config.azimuth_angle,
        });
      }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* offline */ }
    setSaving(false);
  };

  return (
    <AppShell onGenerateDesign={handleSave}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">System Configuration</h1>
          {project && <p className="text-sm text-[#40484c] mt-1">{project.name} · {project.location}</p>}
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-[#166534] flex items-center gap-1"><span className="material-symbols-outlined" style={{fontSize:14}}>check_circle</span> Saved</span>}
          <div className="flex rounded-xl overflow-hidden border border-[#eceeef]">
            {(["lidar","grid"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={clsx("px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                  viewMode === m ? "bg-[#19667d] text-white" : "text-[#40484c] hover:bg-[#f2f4f5]")}>
                {m === "lidar" ? "LiDAR View" : "Grid Editor"}
              </button>
            ))}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2 text-sm disabled:opacity-60">
            {saving ? "Saving…" : "Save Design"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main canvas */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {viewMode === "lidar" ? (
            <div className="bg-[#0f1923] rounded-xl overflow-hidden" style={{ height: 480 }}>
              <DSMViewer
                scan={lidarScan}
                segments={lidarScan?.roof_segments ?? []}
                obstacles={lidarScan?.obstacles ?? []}
                onSegmentSelect={handleSegmentSelect}
              />
            </div>
          ) : (
            /* Grid editor */
            <div className="bg-[#0f1923] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8dd0e9]" style={{fontSize:18}}>solar_power</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#8dd0e9]">Roof Layout Designer</span>
                </div>
                <div className="text-[10px] text-[#8dd0e9]/70 font-mono">
                  {placedCount} panels · {systemKwp.toFixed(2)} kWp
                </div>
              </div>
              <div className="grid gap-1.5 p-4 rounded-lg blueprint-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, backgroundColor: "#111a22" }}>
                {grid.map((row, r) => row.map((cell, c) => (
                  <button key={`${r}-${c}`} onClick={() => handleCellClick(r, c)}
                    className={clsx("aspect-[0.6] rounded-sm transition-all border",
                      cell === "placed" && "bg-[#ffba20]/85 border-[#ffba20] shadow-[0_0_6px_rgba(255,186,32,0.4)]",
                      cell === "empty" && "bg-[#8dd0e9]/5 border-[#8dd0e9]/15 hover:bg-[#8dd0e9]/15",
                      cell === "obstructed" && "bg-[#ba1a1a]/20 border-[#ba1a1a]/40 cursor-not-allowed"
                    )} />
                )))}
              </div>
              <div className="flex items-center gap-5 mt-3 px-1">
                {[["bg-[#ffba20]","Panel placed"],["bg-[#8dd0e9]/15 border border-[#8dd0e9]/30","Available"],["bg-[#ba1a1a]/20","Obstruction"]].map(([cls,lbl])=>(
                  <div key={lbl} className="flex items-center gap-1.5">
                    <div className={clsx("w-3 h-3 rounded-sm", cls)}/>
                    <span className="text-[10px] text-[#8dd0e9]/60">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LiDAR selected segment info */}
          {selectedSegment && (
            <div className="bg-white rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#19667d]" style={{fontSize:18}}>radar</span>
                <h3 className="font-headline font-bold text-sm text-[#191c1d]">
                  LiDAR Segment {selectedSegment.orientation_label} — Auto-configured from point cloud
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Slope", value: `${selectedSegment.slope_degrees}°`, icon: "change_history" },
                  { label: "Azimuth", value: `${selectedSegment.azimuth_degrees}°`, icon: "explore" },
                  { label: "Usable Area", value: `${selectedSegment.usable_area_m2}m²`, icon: "square_foot" },
                  { label: "Solar Access", value: `${selectedSegment.solar_access_pct}%`, icon: "wb_sunny" },
                  { label: "Irradiance", value: `${selectedSegment.peak_irradiance_kwh_m2} kWh/m²`, icon: "bolt" },
                  { label: "Shade Factor", value: `${(selectedSegment.annual_shade_factor * 100).toFixed(1)}%`, icon: "wb_shade" },
                  { label: "Suitability", value: `${selectedSegment.suitability_score}/100`, icon: "grade" },
                  { label: "Panels Fitted", value: placedCount.toString(), icon: "solar_power" },
                ].map((m) => (
                  <div key={m.label} className="bg-[#f2f4f5] rounded-xl p-3 text-center">
                    <span className="material-symbols-outlined text-[#19667d]" style={{fontSize:18}}>{m.icon}</span>
                    <div className="font-headline font-bold text-sm text-[#191c1d] mt-1">{m.value}</div>
                    <div className="text-[9px] text-[#40484c] uppercase tracking-wide">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* String diagram */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">String Configuration</h3>
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {Array.from({ length: config.num_strings }, (_, si) => (
                <div key={si} className="flex-shrink-0">
                  <div className="text-[10px] font-bold text-[#40484c] mb-2 uppercase tracking-wide">String {si + 1}</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: config.panels_per_string }, (_, pi) => (
                      <div key={pi} className="w-5 h-8 rounded-sm bg-[#19667d]/20 border border-[#19667d]/40 flex items-center justify-center">
                        <div className="w-1 h-5 bg-[#19667d]/50 rounded-full" />
                      </div>
                    ))}
                    <div className="w-7 h-7 rounded-full bg-[#513800]/10 border border-[#513800]/30 flex items-center justify-center ml-1">
                      <span className="text-[8px] font-bold text-[#513800]">INV</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* System summary */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-3">System Summary</h3>
            <div className="text-center mb-4">
              <div className="font-headline font-bold text-4xl text-[#191c1d]">{systemKwp.toFixed(2)}</div>
              <div className="text-xs text-[#40484c] uppercase tracking-wider">kWp System Size</div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Total Panels", value: placedCount },
                { label: "Strings", value: config.num_strings },
                { label: "Panels/String", value: config.panels_per_string },
                { label: "Tilt Angle", value: `${config.tilt_angle}°` },
                { label: "Azimuth", value: `${config.azimuth_angle}°` },
                { label: "Est. Annual Gen.", value: `${(systemKwp * 1400).toLocaleString()} kWh` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-xs text-[#40484c]">{r.label}</span>
                  <span className="text-xs font-bold text-[#191c1d]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="flex border-b border-[#f2f4f5]">
              {(["panels","inverter","strings"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={clsx("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors",
                    activeTab === tab ? "text-[#19667d] border-b-2 border-[#19667d]" : "text-[#40484c] hover:text-[#19667d]")}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-4">
              {activeTab === "panels" && (
                <div className="space-y-3">
                  {panels.map((p) => (
                    <button key={p.id} onClick={() => setSelectedPanel(p)}
                      className={clsx("w-full p-3 rounded-xl text-left transition-all border",
                        selectedPanel.id === p.id ? "border-[#19667d] bg-[#a1e4fe]/10" : "border-[#f2f4f5] hover:bg-[#f2f4f5]")}>
                      <div className="flex justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#191c1d]">{p.manufacturer}</div>
                          <div className="text-[11px] text-[#40484c]">{p.model_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-headline font-bold text-sm text-[#19667d]">{p.watt_peak}W</div>
                          <div className="text-[10px] text-[#40484c]">{p.efficiency_pct}%</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === "inverter" && (
                <div className="space-y-3">
                  {inverters.map((inv) => (
                    <button key={inv.id} onClick={() => setSelectedInverter(inv)}
                      className={clsx("w-full p-3 rounded-xl text-left transition-all border",
                        selectedInverter.id === inv.id ? "border-[#19667d] bg-[#a1e4fe]/10" : "border-[#f2f4f5] hover:bg-[#f2f4f5]")}>
                      <div className="flex justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#191c1d]">{inv.manufacturer}</div>
                          <div className="text-[11px] text-[#40484c]">{inv.model_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-headline font-bold text-sm text-[#19667d]">{inv.rated_power_kw}kW</div>
                          <div className="text-[10px] text-[#40484c]">{inv.efficiency_pct}%</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === "strings" && (
                <div className="space-y-4">
                  {([["num_strings","Strings",1,10],["panels_per_string","Panels/String",1,20],["tilt_angle","Tilt Angle (°)",0,90],["azimuth_angle","Azimuth (°)",0,360]] as [keyof typeof config, string, number, number][]).map(([field, label, min, max]) => (
                    <div key={field}>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#40484c]">{label}</label>
                        <span className="text-xs font-bold text-[#191c1d]">{config[field]}</span>
                      </div>
                      <input type="range" min={min} max={max} value={config[field]}
                        onChange={(e) => setConfig((p) => ({ ...p, [field]: Number(e.target.value) }))}
                        className="w-full accent-[#19667d]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ConfigurationPage() {
  return <Suspense fallback={<div className="ml-64 pt-16 p-8">Loading…</div>}><ConfigContent /></Suspense>;
}
