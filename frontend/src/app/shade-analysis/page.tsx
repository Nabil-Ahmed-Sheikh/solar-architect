"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ShadingObject {
  id: number;
  label: string;
  type: "tree" | "building" | "chimney" | "other";
  height_m: number;
  distance_m: number;
  azimuth_deg: number;
}

const MONTH_DATA = [
  { month: "JAN", potential: 452, loss_pct: 24.1, net: 343 },
  { month: "FEB", potential: 518, loss_pct: 18.5, net: 422 },
  { month: "MAR", potential: 780, loss_pct: 12.0, net: 686 },
  { month: "APR", potential: 920, loss_pct: 4.2,  net: 881 },
  { month: "MAY", potential: 1140,loss_pct: 2.1,  net: 1116 },
  { month: "JUN", potential: 1250,loss_pct: 1.8,  net: 1227 },
  { month: "JUL", potential: 1198,loss_pct: 2.0,  net: 1174 },
  { month: "AUG", potential: 1080,loss_pct: 3.1,  net: 1046 },
  { month: "SEP", potential: 890, loss_pct: 5.8,  net: 838 },
  { month: "OCT", potential: 640, loss_pct: 11.2, net: 568 },
  { month: "NOV", potential: 490, loss_pct: 19.4, net: 395 },
  { month: "DEC", potential: 390, loss_pct: 26.0, net: 289 },
];

const OBSTACLE_ICONS: Record<string, string> = {
  tree: "park", building: "domain", chimney: "fireplace", other: "block",
};

const DEFAULT_OBJECTS: ShadingObject[] = [
  { id: 1, label: "Oak Tree – North West", type: "tree", height_m: 12.5, distance_m: 8.2, azimuth_deg: 315 },
  { id: 2, label: "Neighbor Structure", type: "building", height_m: 8.0, distance_m: 15.0, azimuth_deg: 270 },
];

// Sun path drawing helpers
const SUN_PATHS = {
  summer: Array.from({ length: 14 }, (_, i) => {
    const t = (i / 13) * Math.PI;
    return { x: 50 + Math.cos(Math.PI + t) * 42, y: 70 - Math.sin(t) * 55 };
  }),
  winter: Array.from({ length: 14 }, (_, i) => {
    const t = (i / 13) * Math.PI;
    return { x: 50 + Math.cos(Math.PI + t) * 38, y: 70 - Math.sin(t) * 22 };
  }),
};

export default function ShadeAnalysisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState<ShadingObject[]>(DEFAULT_OBJECTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newObj, setNewObj] = useState<Omit<ShadingObject, "id">>({
    label: "", type: "tree", height_m: 5, distance_m: 10, azimuth_deg: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [options, setOptions] = useState({
    showHorizon: true, albedo: false, exportPvSyst: false,
  });

  const annualSolarAccess = 88.4;
  const totalShadeLoss = 11.6;
  const cumEfficiency = 91.4;

  // Draw irradiance heatmap on canvas
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Draw roof outline
    ctx.fillStyle = "#eceeef";
    ctx.fillRect(0, 0, W, H);

    // Draw heatmap cells
    const cols = 20, rows = 12;
    const cw = W / cols, ch = H / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Simulate shade from objects
        let shade = 0;
        for (const obj of objects) {
          const objCol = Math.round(((obj.azimuth_deg % 360) / 360) * cols);
          const dist = Math.sqrt(Math.pow(c - objCol, 2) + Math.pow(r - rows / 2, 2));
          const effect = Math.max(0, 1 - dist / (obj.height_m / obj.distance_m * 4));
          shade = Math.max(shade, effect);
        }
        // Add shadow zones near top (north) for winter
        if (r < 3) shade = Math.max(shade, 0.3 + r * 0.05);

        const irr = 1 - shade;
        if (irr > 0.85) {
          ctx.fillStyle = `rgba(255,186,32,${0.7 + irr * 0.25})`;
        } else if (irr > 0.6) {
          ctx.fillStyle = `rgba(255,186,32,${irr * 0.6})`;
        } else if (irr > 0.35) {
          ctx.fillStyle = `rgba(255,120,20,${0.5 + shade * 0.3})`;
        } else {
          ctx.fillStyle = `rgba(186,26,26,${0.4 + shade * 0.4})`;
        }
        ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
      }
    }

    // Panel grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(W, r * ch); ctx.stroke(); }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, H); ctx.stroke(); }
  }, [objects]);

  useEffect(() => { drawHeatmap(); }, [drawHeatmap]);

  const removeObject = (id: number) => setObjects((p) => p.filter((o) => o.id !== id));

  const addObject = () => {
    if (!newObj.label) return;
    setObjects((p) => [...p, { ...newObj, id: Date.now() }]);
    setNewObj({ label: "", type: "tree", height_m: 5, distance_m: 10, azimuth_deg: 0 });
    setShowAddForm(false);
  };

  const chartData = MONTH_DATA.map((m) => ({
    name: m.month,
    "Net (kWh)": m.net,
    "Loss": m.potential - m.net,
  }));

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">Shade Profile Analysis</h1>
          <p className="text-sm text-[#40484c] mt-1">Solar yield optimisation · Project: Helix-7 Residential</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setOptions((p) => ({ ...p, exportPvSyst: !p.exportPvSyst }))}
            className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5]">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>file_download</span>
            Export (PVsyst)
          </button>
          <button className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
            Run Full Simulation
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: "Annual Solar Access", value: `${annualSolarAccess}`, unit: "%", icon: "wb_sunny", color: "#166534", bg: "bg-[#dcfce7]" },
          { label: "Total Shade Loss", value: `${totalShadeLoss}`, unit: "%", icon: "wb_shade", color: "#ba1a1a", bg: "bg-[#ffdad6]" },
          { label: "Cumulative Efficiency", value: `${cumEfficiency}`, unit: "%", icon: "speed", color: "#19667d", bg: "bg-[#a1e4fe]/30" },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-xl p-5 flex items-center gap-4`}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: k.color }}>{k.icon}</span>
            <div>
              <div className="flex items-end gap-1">
                <span className="font-headline font-bold text-3xl" style={{ color: k.color }}>{k.value}</span>
                <span className="text-sm mb-0.5" style={{ color: k.color }}>{k.unit}</span>
              </div>
              <p className="text-xs text-[#40484c] uppercase tracking-wider font-bold">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Sky dome / sun path */}
          <div className="bg-[#0f1923] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-headline font-bold text-sm text-[#8dd0e9]">Skyline &amp; Sun Path Projection</h2>
                <p className="text-[10px] text-[#8dd0e9]/50 mt-0.5">53°N · Stereographic projection</p>
              </div>
              <div className="flex gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 bg-[#8dd0e9]" />
                  <span className="text-[#8dd0e9]/70">Winter Solstice</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 bg-[#ffba20]" />
                  <span className="text-[#8dd0e9]/70">Summer Solstice</span>
                </div>
              </div>
            </div>

            {/* SVG sky dome */}
            <div className="flex justify-center">
              <svg viewBox="0 0 100 80" className="w-full max-w-lg" style={{ height: 220 }}>
                {/* Horizon arc */}
                <ellipse cx="50" cy="70" rx="46" ry="12" fill="none" stroke="rgba(141,208,233,0.2)" strokeWidth="0.5"/>
                {/* Altitude circles */}
                {[30, 60, 90].map((alt, i) => (
                  <ellipse key={alt} cx="50" cy="70" rx={46 - i * 14} ry={12 - i * 3}
                    fill="none" stroke="rgba(141,208,233,0.08)" strokeWidth="0.5"/>
                ))}
                {/* Cardinal labels */}
                {[["E", 96, 70], ["S", 50, 58], ["W", 4, 70]].map(([l, x, y]) => (
                  <text key={l as string} x={x as number} y={y as number} fill="rgba(141,208,233,0.5)"
                    fontSize="4" textAnchor="middle">
                    {l}
                  </text>
                ))}
                <text x="50" y="77" fill="rgba(141,208,233,0.5)" fontSize="4" textAnchor="middle">12:00 PM</text>

                {/* Summer sun path */}
                <polyline
                  points={SUN_PATHS.summer.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none" stroke="#ffba20" strokeWidth="1.5" strokeLinecap="round"/>
                {SUN_PATHS.summer.filter((_, i) => i % 3 === 1).map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.2" fill="#ffba20"/>
                ))}

                {/* Winter sun path */}
                <polyline
                  points={SUN_PATHS.winter.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none" stroke="#8dd0e9" strokeWidth="1.5" strokeLinecap="round"/>
                {SUN_PATHS.winter.filter((_, i) => i % 3 === 1).map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.2" fill="#8dd0e9"/>
                ))}

                {/* Obstacle horizon silhouettes */}
                {objects.map((obj) => {
                  const az = (obj.azimuth_deg / 360) * 92 + 4;
                  const obstH = Math.min(obj.height_m / obj.distance_m * 15, 18);
                  return (
                    <rect key={obj.id} x={az - 4} y={70 - obstH} width={8} height={obstH}
                      fill="rgba(186,26,26,0.35)" stroke="rgba(186,26,26,0.6)" strokeWidth="0.5"/>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Irradiance heatmap */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Roof Irradiance Heatmap</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#40484c]">
                  <div className="w-3 h-3 rounded-sm bg-[#ba1a1a]" /><span>CRITICAL</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#40484c]">
                  <div className="w-3 h-3 rounded-sm bg-[#ffba20]" /><span>OPTIMAL</span>
                </div>
                <button className="w-7 h-7 rounded-full bg-[#f2f4f5] flex items-center justify-center text-[#40484c] hover:bg-[#eceeef]">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>zoom_in</span>
                </button>
                <button className="w-7 h-7 rounded-full bg-[#f2f4f5] flex items-center justify-center text-[#40484c] hover:bg-[#eceeef]">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>layers</span>
                </button>
              </div>
            </div>
            <canvas ref={canvasRef} width={600} height={200} className="w-full rounded-lg" style={{ imageRendering: "pixelated" }} />
          </div>

          {/* Monthly yield chart */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-headline font-bold text-sm text-[#191c1d]">Monthly Yield Loss Breakdown</h2>
                <p className="text-xs text-[#40484c] mt-0.5">Click a month to highlight</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                onClick={(d) => d?.activeTooltipIndex !== undefined && setSelectedMonth(d.activeTooltipIndex)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bfc8cc" strokeOpacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#40484c" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#40484c" }} axisLine={false} tickLine={false} unit=" kWh" />
                <Tooltip formatter={(v: number, name: string) => [`${v} kWh`, name]} />
                <Bar dataKey="Net (kWh)" stackId="a" fill="#19667d" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Loss" stackId="a" fill="#ba1a1a" opacity={0.5} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Monthly table */}
            <div className="mt-4 border-t border-[#f2f4f5] pt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["Month", "Pot. (kWh)", "Loss (%)", "Net (kWh)"].map((h) => (
                      <th key={h} className="text-left py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[#40484c]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTH_DATA.map((m, i) => (
                    <tr key={m.month}
                      className={`cursor-pointer transition-colors ${selectedMonth === i ? "bg-[#a1e4fe]/20" : i % 2 === 1 ? "bg-[#f2f4f5]/40" : ""}`}
                      onClick={() => setSelectedMonth(i === selectedMonth ? null : i)}>
                      <td className="py-1.5 font-bold text-[#191c1d]">{m.month}</td>
                      <td className="py-1.5 text-[#40484c]">{m.potential.toLocaleString()}</td>
                      <td className={`py-1.5 font-bold ${m.loss_pct > 15 ? "text-[#ba1a1a]" : m.loss_pct > 8 ? "text-[#f97316]" : "text-[#166534]"}`}>
                        {m.loss_pct}%
                      </td>
                      <td className="py-1.5 font-bold text-[#19667d]">{m.net.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Environment modeling */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 18 }}>add_location_alt</span>
                <h2 className="font-headline font-bold text-sm text-[#191c1d]">Environment Modeling</h2>
              </div>
              <button onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-xs font-bold text-[#19667d] hover:opacity-75">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span> Add
              </button>
            </div>

            <div className="space-y-3">
              {objects.map((obj) => (
                <div key={obj.id} className="flex items-start gap-3 p-3 bg-[#f2f4f5] rounded-xl">
                  <span className="material-symbols-outlined text-[#40484c]" style={{ fontSize: 20 }}>
                    {OBSTACLE_ICONS[obj.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#191c1d]">{obj.label}</div>
                    <div className="text-[10px] text-[#40484c]">
                      Height: {obj.height_m}m · Distance: {obj.distance_m}m · {obj.azimuth_deg}° az
                    </div>
                  </div>
                  <button onClick={() => removeObject(obj.id)} className="text-[#40484c] hover:text-[#ba1a1a] transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>more_vert</span>
                  </button>
                </div>
              ))}
            </div>

            {showAddForm && (
              <div className="mt-4 pt-4 border-t border-[#f2f4f5] space-y-3">
                <input value={newObj.label} onChange={(e) => setNewObj((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Label (e.g. Oak Tree)"
                  className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#40484c] uppercase tracking-wide block mb-1">Height (m)</label>
                    <input type="number" value={newObj.height_m} onChange={(e) => setNewObj((p) => ({ ...p, height_m: parseFloat(e.target.value) }))}
                      className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#40484c] uppercase tracking-wide block mb-1">Distance (m)</label>
                    <input type="number" value={newObj.distance_m} onChange={(e) => setNewObj((p) => ({ ...p, distance_m: parseFloat(e.target.value) }))}
                      className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#40484c] uppercase tracking-wide block mb-1">Azimuth (°)</label>
                    <input type="number" value={newObj.azimuth_deg} onChange={(e) => setNewObj((p) => ({ ...p, azimuth_deg: parseFloat(e.target.value) }))}
                      min={0} max={360}
                      className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#40484c] uppercase tracking-wide block mb-1">Type</label>
                    <select value={newObj.type} onChange={(e) => setNewObj((p) => ({ ...p, type: e.target.value as ShadingObject["type"] }))}
                      className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none">
                      {Object.keys(OBSTACLE_ICONS).map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 rounded-xl border border-[#bfc8cc]/40 text-sm text-[#40484c] hover:bg-[#f2f4f5]">Cancel</button>
                  <button onClick={addObject} className="flex-1 btn-primary py-2 text-sm">Add Object</button>
                </div>
              </div>
            )}
          </div>

          {/* Analysis options */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Analysis Options</h2>
            <div className="space-y-3">
              {[
                { key: "showHorizon", label: "Show Horizon Obstructions" },
                { key: "albedo", label: "Apply Albedo Reflection (0.2)" },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center justify-between p-3 bg-[#f2f4f5] rounded-xl">
                  <span className="text-xs text-[#191c1d]">{opt.label}</span>
                  <button
                    onClick={() => setOptions((p) => ({ ...p, [opt.key]: !p[opt.key as keyof typeof p] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${options[opt.key as keyof typeof options] ? "bg-[#19667d]" : "bg-[#bfc8cc]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${options[opt.key as keyof typeof options] ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Selected month detail */}
          {selectedMonth !== null && (
            <div className="bg-white rounded-xl p-5 border-l-4 border-[#19667d]">
              <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-3">
                {MONTH_DATA[selectedMonth].month} Detail
              </h2>
              {[
                { label: "Potential Yield", value: `${MONTH_DATA[selectedMonth].potential} kWh` },
                { label: "Shade Loss", value: `${MONTH_DATA[selectedMonth].loss_pct}%`, red: MONTH_DATA[selectedMonth].loss_pct > 15 },
                { label: "Net Generation", value: `${MONTH_DATA[selectedMonth].net} kWh`, green: true },
                { label: "Energy Lost", value: `${MONTH_DATA[selectedMonth].potential - MONTH_DATA[selectedMonth].net} kWh` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-[#f2f4f5] last:border-0">
                  <span className="text-xs text-[#40484c]">{r.label}</span>
                  <span className={`text-xs font-bold ${r.red ? "text-[#ba1a1a]" : r.green ? "text-[#19667d]" : "text-[#191c1d]"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
