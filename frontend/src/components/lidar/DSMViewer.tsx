"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { RoofSegment, ShadingObstacle, LiDARScan } from "@/lib/api";

interface DSMViewerProps {
  scan: LiDARScan | null;
  segments: RoofSegment[];
  obstacles: ShadingObstacle[];
  onSegmentSelect?: (seg: RoofSegment) => void;
}

const SUITABILITY_COLOR = (score: number): string => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#ffba20";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

export default function DSMViewer({ scan, segments, obstacles, onSegmentSelect }: DSMViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSeg, setSelectedSeg] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"dsm" | "segments" | "shading">("segments");
  const [hoveredSeg, setHoveredSeg] = useState<RoofSegment | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.fillStyle = "#0f1923";
    ctx.fillRect(0, 0, W, H);

    // Blueprint grid
    ctx.strokeStyle = "rgba(141,208,233,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (viewMode === "dsm" && scan?.dsm_tile?.elevation_grid?.length) {
      drawDSM(ctx, scan.dsm_tile.elevation_grid, W, H, scan.elevation_min ?? 0, scan.elevation_max ?? 10);
    } else {
      drawSchematic(ctx, segments, obstacles, W, H, selectedSeg, viewMode);
    }
  }, [scan, segments, obstacles, selectedSeg, viewMode]);

  useEffect(() => { draw(); }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check which segment was clicked
    const W = canvas.width, H = canvas.height;
    const seg = hitTestSegment(x, y, segments, W, H);
    if (seg) {
      setSelectedSeg(seg.id);
      onSegmentSelect?.(seg);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const W = canvas.width, H = canvas.height;
    setHoveredSeg(hitTestSegment(x, y, segments, W, H));
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={480}
        className="w-full h-full rounded-lg cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredSeg(null)}
      />

      {/* View mode toggle */}
      <div className="absolute top-3 left-3 flex gap-1 glass-panel rounded-xl p-1">
        {(["segments", "shading", "dsm"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
              viewMode === mode ? "bg-[#19667d] text-white" : "text-[#40484c] hover:text-[#19667d]"
            }`}
          >
            {mode === "dsm" ? "DSM" : mode === "segments" ? "Segments" : "Shading"}
          </button>
        ))}
      </div>

      {/* Scale bar */}
      <div className="absolute bottom-3 right-3 glass-panel rounded-lg px-3 py-1.5 text-[10px] text-[#40484c] font-mono">
        {scan?.scan_resolution_m ? `${scan.scan_resolution_m}m/px` : "0.5m/px"} ·{" "}
        {scan?.point_density ? `${scan.point_density.toFixed(1)} pts/m²` : "synthetic"}
      </div>

      {/* Hover tooltip */}
      {hoveredSeg && (
        <div className="absolute top-12 left-3 glass-panel rounded-xl px-3 py-2 text-xs pointer-events-none">
          <p className="font-bold text-[#191c1d]">{hoveredSeg.orientation_label} Face</p>
          <p className="text-[#40484c]">Slope: {hoveredSeg.slope_degrees}° · {hoveredSeg.area_m2}m²</p>
          <p className="text-[#40484c]">Solar access: {hoveredSeg.solar_access_pct}%</p>
          <p style={{ color: SUITABILITY_COLOR(hoveredSeg.suitability_score) }} className="font-bold">
            Score: {hoveredSeg.suitability_score}/100
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 glass-panel rounded-xl px-3 py-2">
        <p className="text-[9px] font-bold text-[#40484c] uppercase tracking-widest mb-1.5">Suitability</p>
        {[["≥80 Excellent","#22c55e"],["60-79 Good","#ffba20"],["40-59 Fair","#f97316"],["<40 Poor","#ef4444"]].map(([l,c])=>(
          <div key={l} className="flex items-center gap-1.5 mb-0.5">
            <div className="w-2 h-2 rounded-sm" style={{backgroundColor:c}}/>
            <span className="text-[9px] text-[#40484c]">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Canvas drawing helpers ────────────────────────────────────────────────

function drawDSM(ctx: CanvasRenderingContext2D, grid: number[][], W: number, H: number, eMin: number, eMax: number) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols) return;

  const cellW = W / cols;
  const cellH = H / rows;
  const range = eMax - eMin || 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = (grid[r][c] - eMin) / range;
      ctx.fillStyle = elevationColor(v);
      ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
    }
  }
}

function elevationColor(t: number): string {
  // Turbo-like colormap: dark blue → cyan → green → yellow → red
  const colors = [
    [30, 30, 120], [0, 120, 200], [0, 200, 180],
    [0, 220, 80], [180, 220, 0], [255, 180, 0], [255, 60, 0],
  ];
  const n = colors.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const f = t * n - i;
  const [r1, g1, b1] = colors[i];
  const [r2, g2, b2] = colors[i + 1] ?? colors[n];
  return `rgb(${Math.round(r1 + (r2 - r1) * f)},${Math.round(g1 + (g2 - g1) * f)},${Math.round(b1 + (b2 - b1) * f)})`;
}

function drawSchematic(
  ctx: CanvasRenderingContext2D,
  segments: RoofSegment[],
  obstacles: ShadingObstacle[],
  W: number, H: number,
  selectedId: number | null,
  mode: string
) {
  if (!segments.length) {
    drawPlaceholder(ctx, W, H);
    return;
  }

  // Figure out bounding box of all segment boundaries
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const seg of segments) {
    for (const [bx, by] of seg.boundary) {
      minX = Math.min(minX, bx); maxX = Math.max(maxX, bx);
      minY = Math.min(minY, by); maxY = Math.max(maxY, by);
    }
  }

  if (!isFinite(minX)) { drawPlaceholder(ctx, W, H); return; }

  const pad = 60;
  const scaleX = (W - pad * 2) / (maxX - minX || 1);
  const scaleY = (H - pad * 2) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);

  const toCanvas = (bx: number, by: number): [number, number] => [
    (bx - minX) * scale + pad,
    (by - minY) * scale + pad,
  ];

  // Draw each roof segment
  for (const seg of segments) {
    if (!seg.boundary?.length) continue;
    ctx.beginPath();
    seg.boundary.forEach(([bx, by], i) => {
      const [cx, cy] = toCanvas(bx, by);
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    });
    ctx.closePath();

    const isSelected = seg.id === selectedId;

    if (mode === "shading") {
      // Heat map: red=high shade, green=low shade
      const shade = seg.annual_shade_factor;
      const r = Math.round(shade * 255);
      const g = Math.round((1 - shade) * 200);
      ctx.fillStyle = `rgba(${r},${g},40,0.75)`;
    } else {
      const color = SUITABILITY_COLOR(seg.suitability_score);
      ctx.fillStyle = color.replace(")", ",0.55)").replace("rgb", "rgba").replace("#", "rgba(") ;
      // Actually parse hex properly:
      const hex = color.replace("#", "");
      const rv = parseInt(hex.slice(0,2),16);
      const gv = parseInt(hex.slice(2,4),16);
      const bv = parseInt(hex.slice(4,6),16);
      ctx.fillStyle = `rgba(${rv},${gv},${bv},0.55)`;
    }

    ctx.fill();
    ctx.strokeStyle = isSelected ? "#ffba20" : "rgba(141,208,233,0.6)";
    ctx.lineWidth = isSelected ? 2.5 : 1;
    ctx.stroke();

    // Label: orientation + score
    if (seg.boundary.length >= 3) {
      const cx = seg.boundary.reduce((s, [bx]) => s + bx, 0) / seg.boundary.length;
      const cy = seg.boundary.reduce((s, [, by]) => s + by, 0) / seg.boundary.length;
      const [lx, ly] = toCanvas(cx, cy);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(seg.orientation_label, lx, ly - 6);
      ctx.font = "10px 'Inter', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`${seg.suitability_score}`, lx, ly + 7);
    }
  }

  // Draw obstacles
  for (const obs of obstacles) {
    const [ox, oy] = toCanvas(obs.offset_x_m, obs.offset_y_m);
    const size = Math.max(6, obs.height_m * scale * 0.5);

    ctx.beginPath();
    ctx.arc(ox, oy, size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(186,26,26,0.7)";
    ctx.fill();
    ctx.strokeStyle = "#ba1a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cross
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox - size * 0.6, oy); ctx.lineTo(ox + size * 0.6, oy);
    ctx.moveTo(ox, oy - size * 0.6); ctx.lineTo(ox, oy + size * 0.6);
    ctx.stroke();

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "9px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(obs.label.split(" ")[0], ox, oy + size + 10);
  }

  // Compass rose
  drawCompass(ctx, W - 40, 40);
}

function drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.font = "bold 10px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const dirs = [["N",0],["E",90],["S",180],["W",270]] as [string,number][];
  for (const [label, deg] of dirs) {
    const rad = (deg - 90) * Math.PI / 180;
    const x = cx + Math.cos(rad) * 18;
    const y = cy + Math.sin(rad) * 18;
    ctx.fillStyle = label === "S" ? "#ffba20" : "rgba(141,208,233,0.7)";
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "rgba(141,208,233,0.1)";
  ctx.fillRect(W/4, H/4, W/2, H/2);
  ctx.strokeStyle = "rgba(141,208,233,0.3)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W/4, H/4, W/2, H/2);
  ctx.fillStyle = "rgba(141,208,233,0.5)";
  ctx.font = "13px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Initiate LiDAR scan to view roof segments", W/2, H/2 - 12);
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(141,208,233,0.35)";
  ctx.fillText("DSM · Plane fitting · Shading analysis", W/2, H/2 + 12);
}

function hitTestSegment(x: number, y: number, segments: RoofSegment[], W: number, H: number): RoofSegment | null {
  if (!segments.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const seg of segments) {
    for (const [bx, by] of seg.boundary) {
      minX = Math.min(minX, bx); maxX = Math.max(maxX, bx);
      minY = Math.min(minY, by); maxY = Math.max(maxY, by);
    }
  }
  if (!isFinite(minX)) return null;
  const pad = 60;
  const scale = Math.min((W - pad * 2) / (maxX - minX || 1), (H - pad * 2) / (maxY - minY || 1));
  const toWorld = (cx: number, cy: number) => [(cx - pad) / scale + minX, (cy - pad) / scale + minY];
  const [wx, wy] = toWorld(x, y);

  for (const seg of segments) {
    if (pointInPolygon(wx, wy, seg.boundary)) return seg;
  }
  return null;
}

function pointInPolygon(x: number, y: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
