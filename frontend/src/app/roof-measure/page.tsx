"use client";
import { useState, useRef, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";

interface Point { x: number; y: number; }
interface Obstruction { id: number; label: string; width: string; type: string; }

const ICONS: Record<string, string> = { vent: "air", hvac: "mode_fan", chimney: "fireplace", skylight: "light_mode", other: "block" };

export default function RoofMeasurePage() {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Point[]>([
    {x:120,y:280},{x:120,y:100},{x:400,y:60},{x:680,y:100},{x:680,y:280},{x:540,y:380},{x:260,y:380}
  ]);
  const [tool, setTool] = useState<"polygon"|"obstruction"|"none">("none");
  const [dragging, setDragging] = useState<number|null>(null);
  const [obstructions, setObstructions] = useState<Obstruction[]>([
    { id:1, label:"Main Vent Stack", width:"0.4m x 0.4m", type:"vent" },
    { id:2, label:"Attic Fan", width:"0.8m Diameter", type:"hvac" },
  ]);
  const [showAddObs, setShowAddObs] = useState(false);
  const [newObs, setNewObs] = useState({ label:"", width:"", type:"vent" });

  // Compute polygon area using shoelace formula
  const area = useCallback(() => {
    if (points.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      a += points[i].x * points[j].y;
      a -= points[j].x * points[i].y;
    }
    // Scale: canvas is 800px wide = ~20m → 1px = 0.025m → 1px² = 0.000625m²
    return Math.abs(a / 2) * 0.000625;
  }, [points]);

  // Estimate pitch from bounding box
  const pitch = 22.5;
  const azimuth = 185;
  const confidence = 94.2;
  const totalArea = area().toFixed(1);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tool !== "polygon") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((p) => [...p, { x, y }]);
  };

  const handlePointDrag = (i: number, e: React.MouseEvent<SVGCircleElement>) => {
    e.stopPropagation();
    setDragging(i);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((p) => p.map((pt, i) => i === dragging ? { x, y } : pt));
  };

  const handleMouseUp = () => setDragging(null);

  const removePoint = (i: number) => setPoints((p) => p.filter((_, idx) => idx !== i));

  const polyPath = points.length > 1
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")} Z`
    : "";

  // Edge lengths in metres (rough scale)
  const edgeLengths = points.map((p, i) => {
    const j = (i + 1) % points.length;
    const dx = (points[j].x - p.x) * 0.025;
    const dy = (points[j].y - p.y) * 0.025;
    return Math.sqrt(dx*dx + dy*dy).toFixed(1);
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">Roof Measurement Tool</h1>
          <p className="text-sm text-[#40484c] mt-1">Active Project: 1242 Sierra Vista Dr.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setTool("none")} className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5]">
            <span className="material-symbols-outlined" style={{fontSize:16}}>undo</span> Undo
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5]">
            Save Draft
          </button>
          <button className="btn-primary px-5 py-2 text-sm">Finalize Layout</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Canvas */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {/* Toolbar */}
          <div className="flex gap-3 items-center">
            {[
              { id:"polygon", icon:"polyline", label:"Draw Polygon" },
              { id:"none", icon:"pan_tool_alt", label:"Select/Move" },
              { id:"obstruction", icon:"block", label:"Add Obstruction" },
            ].map((t) => (
              <button key={t.id} onClick={() => setTool(t.id as typeof tool)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  tool === t.id ? "bg-[#19667d] text-white border-[#19667d]" : "border-[#bfc8cc]/40 text-[#40484c] hover:bg-[#f2f4f5]"
                }`}>
                <span className="material-symbols-outlined" style={{fontSize:16}}>{t.icon}</span>
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {["add","remove","near_me"].map((icon) => (
                <button key={icon} className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-[#40484c] hover:bg-[#f2f4f5] transition-colors">
                  <span className="material-symbols-outlined" style={{fontSize:16}}>{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SVG canvas */}
          <div className="bg-[#c8dce8] rounded-xl overflow-hidden relative" style={{height:440}}>
            {/* Satellite background simulation */}
            <svg viewBox="0 0 800 440" className="absolute inset-0 w-full h-full">
              <rect width="800" height="440" fill="#b5c9d5"/>
              <pattern id="rm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
              </pattern>
              <rect width="800" height="440" fill="url(#rm-grid)"/>
              {/* Simulated roof surface */}
              <polygon points="120,280 120,100 400,60 680,100 680,280 540,380 260,380" fill="rgba(180,160,130,0.6)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            </svg>

            <svg ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"
              onClick={handleSvgClick} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>

              {/* Filled polygon */}
              {polyPath && (
                <path d={polyPath} fill="rgba(255,186,32,0.25)" stroke="#ffba20" strokeWidth="2" strokeDasharray={tool==="polygon"?"6 3":"none"}/>
              )}

              {/* Edge labels */}
              {points.map((p, i) => {
                const j = (i + 1) % points.length;
                const mx = (p.x + points[j].x) / 2;
                const my = (p.y + points[j].y) / 2;
                return (
                  <g key={`edge-${i}`}>
                    <text x={mx} y={my-6} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
                      style={{textShadow:"0 1px 2px rgba(0,0,0,0.8)"}}>
                      {edgeLengths[i]}m
                    </text>
                  </g>
                );
              })}

              {/* Vertices */}
              {points.map((p, i) => (
                <g key={`pt-${i}`}>
                  <circle cx={p.x} cy={p.y} r={8} fill="#ffba20" stroke="#513800" strokeWidth={2}
                    className="cursor-move" onMouseDown={(e) => handlePointDrag(i, e)}/>
                  {tool==="polygon" && (
                    <text x={p.x+12} y={p.y-8} fill="white" fontSize="9" style={{cursor:"pointer"}}
                      onClick={(e)=>{e.stopPropagation();removePoint(i);}}>✕</text>
                  )}
                </g>
              ))}
            </svg>

            {/* Floating info badge */}
            <div className="absolute bottom-4 right-4 glass-panel rounded-xl px-3 py-2">
              <p className="text-[10px] text-[#40484c]">Data Confidence</p>
              <p className="text-sm font-bold text-[#166534]">{confidence}% (High)</p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Measurement summary */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Roof Measurement</h2>
            <div className="space-y-3">
              {[
                { icon: "square_foot", label: "Total Surface Area", value: `${totalArea} m²` },
                { icon: "change_history", label: "Pitch Estimate", value: `${pitch}°` },
                { icon: "explore", label: "Azimuth", value: `${azimuth}° S` },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 p-3 bg-[#f2f4f5] rounded-xl">
                  <span className="material-symbols-outlined text-[#19667d]" style={{fontSize:20}}>{row.icon}</span>
                  <div className="flex-1">
                    <div className="text-[10px] text-[#40484c] uppercase tracking-wide">{row.label}</div>
                    <div className="font-headline font-bold text-lg text-[#191c1d]">{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#f2f4f5]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-2">Edge Lengths</p>
              <div className="grid grid-cols-2 gap-2">
                {points.map((_, i) => (
                  <div key={i} className="text-xs bg-[#f2f4f5] rounded-lg px-3 py-1.5">
                    <span className="text-[#40484c]">Edge {i+1}: </span>
                    <span className="font-bold text-[#191c1d]">{edgeLengths[i]}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Obstructions */}
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Obstructions</h2>
              <button onClick={() => setShowAddObs(true)}
                className="flex items-center gap-1 text-xs font-bold text-[#19667d] hover:opacity-75">
                <span className="material-symbols-outlined" style={{fontSize:16}}>add_circle</span> Add New
              </button>
            </div>

            <div className="space-y-3">
              {obstructions.map((obs) => (
                <div key={obs.id} className="flex items-center gap-3 p-3 bg-[#f2f4f5] rounded-xl">
                  <span className="material-symbols-outlined text-[#40484c]" style={{fontSize:20}}>{ICONS[obs.type]||"block"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#191c1d]">{obs.label}</div>
                    <div className="text-[10px] text-[#40484c]">{obs.width}</div>
                  </div>
                  <button onClick={() => setObstructions((o) => o.filter((x) => x.id !== obs.id))}
                    className="text-[#ba1a1a] hover:opacity-75">
                    <span className="material-symbols-outlined" style={{fontSize:16}}>delete</span>
                  </button>
                </div>
              ))}
            </div>

            {showAddObs && (
              <div className="mt-4 pt-4 border-t border-[#f2f4f5] space-y-3">
                <input value={newObs.label} onChange={(e) => setNewObs((p) => ({...p, label:e.target.value}))}
                  placeholder="Obstruction label"
                  className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30"/>
                <input value={newObs.width} onChange={(e) => setNewObs((p) => ({...p, width:e.target.value}))}
                  placeholder="Dimensions (e.g. 0.4m x 0.4m)"
                  className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30"/>
                <select value={newObs.type} onChange={(e) => setNewObs((p) => ({...p, type:e.target.value}))}
                  className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none">
                  {Object.keys(ICONS).map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddObs(false)} className="flex-1 py-2 rounded-xl border border-[#bfc8cc]/40 text-sm text-[#40484c] hover:bg-[#f2f4f5]">Cancel</button>
                  <button onClick={() => {
                    if (newObs.label) {
                      setObstructions((p) => [...p, { ...newObs, id: Date.now() }]);
                      setNewObs({ label:"", width:"", type:"vent" });
                      setShowAddObs(false);
                    }
                  }} className="flex-1 btn-primary py-2 text-sm">Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
