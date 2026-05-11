"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import GoogleMapView from "@/components/maps/GoogleMapView";
import { sitesApi, projectsApi, lidarApi, type SiteAnalysis, type Project, type LiDARScan } from "@/lib/api";
import { clsx } from "clsx";

const STEPS = [
  { num: 1, label: "Location Selection" },
  { num: 2, label: "Roof Geometry" },
  { num: 3, label: "Utility Economics" },
];

const DEFAULT_SITE: Partial<SiteAnalysis> = {
  address: "1242 Sierra Vista Dr, Phoenix, AZ",
  latitude: 33.4484, longitude: -112.074,
  peak_sun_hours: 2100, irradiance_zone: "High Solar Irradiance Zone",
  roof_type: "gable", roof_pitch_degrees: 22.5, roof_orientation_degrees: 185,
  usable_roof_area: 148, total_roof_area: 175,
  utility_provider: "Arizona Public Service",
  current_rate_kwh: 0.12, annual_consumption_kwh: 28500,
  net_metering_available: true, feed_in_tariff: 0.08, current_step: 1,
};

function SiteAnalysisContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [step, setStep] = useState(1);
  const [site, setSite] = useState<Partial<SiteAnalysis>>(DEFAULT_SITE);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [mapsKey, setMapsKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lidarScan, setLidarScan] = useState<LiDARScan | null>(null);
  const [lidarLoading, setLidarLoading] = useState(false);

  useEffect(() => {
    lidarApi.googleMapsKey().then((r) => setMapsKey(r.data.key)).catch(() => {});
    if (!projectId) return;
    projectsApi.get(Number(projectId)).then((r) => setProject(r.data)).catch(() => {});
    sitesApi.list(Number(projectId)).then((r) => {
      if (r.data.results.length > 0) {
        const s = r.data.results[0];
        setSite(s); setSiteId(s.id); setStep(s.current_step || 1);
      }
    }).catch(() => {});
    lidarApi.list(Number(projectId)).then((r) => {
      if (r.data.results.length > 0) setLidarScan(r.data.results[0]);
    }).catch(() => {});
  }, [projectId]);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSite((p) => ({ ...p, latitude: lat, longitude: lng, address }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (siteId) {
        await sitesApi.update(siteId, { ...site, current_step: step });
      } else if (projectId) {
        const res = await sitesApi.create({ ...site, project: Number(projectId), current_step: step });
        setSiteId(res.data.id);
      }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* offline */ }
    setSaving(false);
  };

  const handleNext = async () => { await handleSave(); if (step < 3) setStep(step + 1); };

  const triggerLiDAR = async () => {
    if (!projectId || !site.latitude || !site.longitude) return;
    setLidarLoading(true);
    try {
      const res = await lidarApi.create({
        project: Number(projectId),
        latitude: site.latitude,
        longitude: site.longitude,
        source: "alberta_open",
      });
      setLidarScan(res.data);
      // Poll status
      const poll = setInterval(async () => {
        const status = await lidarApi.pollStatus(res.data.id);
        if (status.data.status === "complete" || status.data.status === "failed") {
          clearInterval(poll);
          const full = await lidarApi.get(res.data.id);
          setLidarScan(full.data);
          setLidarLoading(false);
        }
      }, 3000);
    } catch { setLidarLoading(false); }
  };

  const update = (field: keyof SiteAnalysis, value: unknown) =>
    setSite((p) => ({ ...p, [field]: value }));

  return (
    <AppShell>
      {/* Step progress */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button onClick={() => setStep(s.num)} className="flex items-center gap-2">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                step === s.num ? "bg-[#513800] text-white" : step > s.num ? "bg-[#19667d] text-white" : "bg-[#eceeef] text-[#40484c]"
              )}>
                {step > s.num ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span> : s.num}
              </div>
              <span className={clsx("text-sm", step === s.num ? "font-bold text-[#191c1d]" : "font-medium text-[#40484c]")}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={clsx("h-[2px] w-10 mx-1 rounded-full transition-colors", step > s.num ? "bg-[#19667d]" : "bg-[#eceeef]")} />
            )}
          </div>
        ))}
        {saved && (
          <span className="ml-auto text-xs text-[#166534] flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span> Saved
          </span>
        )}
      </div>

      {project && (
        <div className="mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ffba20]" style={{ fontSize: 17 }}>folder_open</span>
          <span className="text-sm font-bold text-[#191c1d]">{project.name}</span>
          <span className="text-xs text-[#40484c]">— {project.location}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Map */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <section className="bg-white rounded-xl p-2 relative overflow-hidden min-h-[440px] flex flex-col">
            {/* Map controls overlay */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              {["add","remove","layers"].map((icon) => (
                <button key={icon} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-[#40484c] hover:bg-white transition-colors z-20">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                </button>
              ))}
            </div>

            {/* Map */}
            <div className="flex-1 rounded-lg overflow-hidden relative min-h-[400px]">
              <GoogleMapView
                latitude={site.latitude ?? 33.4484}
                longitude={site.longitude ?? -112.074}
                apiKey={mapsKey}
                onLocationSelect={handleLocationSelect}
                zoom={19}
              />

              {/* Info overlay */}
              <div className="absolute bottom-4 left-4 p-3 rounded-xl glass-panel max-w-xs shadow-xl border border-white/20 z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-[#ffba20]" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <div>
                    <h3 className="text-xs font-bold text-[#191c1d]">Selected Site</h3>
                    <p className="text-[10px] text-[#40484c] font-mono">{site.latitude?.toFixed(4)}°N · {Math.abs(site.longitude ?? 0).toFixed(4)}°W</p>
                  </div>
                </div>
                <p className="text-[10px] text-[#40484c] leading-relaxed">{site.address}</p>
                <p className="text-[10px] text-[#19667d] font-medium mt-1">{site.irradiance_zone} · {site.peak_sun_hours?.toLocaleString()} hrs/yr</p>
              </div>

              {/* Irradiance badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full glass-panel text-[10px] font-bold text-[#19667d] z-10">
                Irradiance Heatmap · Live
              </div>
            </div>
          </section>

          {/* LiDAR trigger banner */}
          <div className="bg-[#0f1923] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#8dd0e9] uppercase tracking-widest">LiDAR Point Cloud</p>
              <p className="text-[10px] text-[#8dd0e9]/60 mt-0.5">
                {lidarScan
                  ? `${lidarScan.status === "complete" ? `${lidarScan.roof_segments.length} segments · ${lidarScan.point_count?.toLocaleString() ?? "—"} pts` : `${lidarScan.status} ${lidarScan.progress_pct}%`}`
                  : "Download Alberta Open Data LiDAR and run DSM/plane analysis"}
              </p>
            </div>
            <button
              onClick={triggerLiDAR}
              disabled={lidarLoading || !projectId}
              className="px-4 py-2 bg-[#19667d] text-white rounded-xl text-xs font-bold hover:bg-[#1a677d] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {lidarLoading ? (
                <><div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
              ) : lidarScan?.status === "complete" ? (
                <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span> Re-scan</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>radar</span> Run LiDAR</>
              )}
            </button>
          </div>

          {/* Step form */}
          {step === 1 && <LocationStep site={site} update={update} />}
          {step === 2 && <RoofGeometryStep site={site} update={update} />}
          {step === 3 && <UtilityEconomicsStep site={site} update={update} />}
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Site summary */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Site Summary</h2>
            <div className="space-y-2.5">
              {[
                { label: "Address", value: site.address || "—" },
                { label: "Coordinates", value: site.latitude ? `${site.latitude.toFixed(4)}°N` : "—" },
                { label: "Peak Sun Hours", value: `${site.peak_sun_hours?.toLocaleString() ?? "—"} hrs/yr` },
                { label: "Total Roof Area", value: site.total_roof_area ? `${site.total_roof_area} m²` : "—" },
                { label: "Usable Area", value: site.usable_roof_area ? `${site.usable_roof_area} m²` : "—" },
                { label: "Roof Type", value: site.roof_type ? site.roof_type.charAt(0).toUpperCase() + site.roof_type.slice(1) : "—" },
                { label: "Pitch / Azimuth", value: site.roof_pitch_degrees !== undefined ? `${site.roof_pitch_degrees}° / ${site.roof_orientation_degrees}°` : "—" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-xs text-[#40484c]">{row.label}</span>
                  <span className="text-xs font-bold text-[#191c1d] text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* LiDAR results summary */}
          {lidarScan?.status === "complete" && (
            <div className="bg-[#0f1923] rounded-xl p-5">
              <h2 className="font-headline font-bold text-sm text-[#8dd0e9] mb-4">LiDAR Results</h2>
              <div className="space-y-3">
                {lidarScan.roof_segments.slice(0, 3).map((seg) => (
                  <div key={seg.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white">{seg.orientation_label} Face</span>
                      <span className="text-xs font-bold" style={{ color: seg.suitability_score >= 70 ? "#22c55e" : "#ffba20" }}>
                        {seg.suitability_score}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { label: "Slope", value: `${seg.slope_degrees}°` },
                        { label: "Area", value: `${seg.area_m2}m²` },
                        { label: "Solar", value: `${seg.solar_access_pct}%` },
                      ].map((m) => (
                        <div key={m.label} className="text-center">
                          <div className="text-[10px] font-bold text-[#8dd0e9]">{m.value}</div>
                          <div className="text-[9px] text-[#8dd0e9]/50">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {lidarScan.obstacles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#8dd0e9]/60 uppercase tracking-widest mb-2">Obstacles Detected</p>
                    {lidarScan.obstacles.map((obs) => (
                      <div key={obs.id} className="flex items-center gap-2 py-1">
                        <span className="material-symbols-outlined text-[#ba1a1a]" style={{ fontSize: 14 }}>warning</span>
                        <span className="text-[10px] text-[#8dd0e9]/70">{obs.label} ({obs.height_m}m)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Irradiance scale */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-3">Irradiance Scale</h2>
            {[
              { label: "Exceptional (>2200 hrs)", color: "#513800" },
              { label: "High (1800–2200 hrs)", color: "#ffba20" },
              { label: "Medium (1400–1800 hrs)", color: "#8dd0e9" },
              { label: "Low (<1400 hrs)", color: "#bfc8cc" },
            ].map((z) => (
              <div key={z.label} className="flex items-center gap-2 mb-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.color }} />
                <span className="text-xs text-[#40484c]">{z.label}</span>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border border-[#bfc8cc]/40 text-sm font-bold text-[#40484c] hover:bg-[#f2f4f5] transition-colors">
                Back
              </button>
            )}
            <button onClick={handleNext} disabled={saving} className="flex-1 btn-primary py-3 text-sm disabled:opacity-60">
              {saving ? "Saving…" : step === 3 ? "Complete Analysis" : "Next Step"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function SiteAnalysisPage() {
  return (
    <Suspense fallback={<div className="ml-64 pt-16 p-8">Loading…</div>}>
      <SiteAnalysisContent />
    </Suspense>
  );
}

// ── Input helpers ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", unit, min, max, step }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; unit?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">
        {label}{unit && <span className="ml-1 normal-case font-normal text-[#70787d]">({unit})</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        min={min} max={max} step={step}
        className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm text-[#191c1d] border-none outline-none focus:ring-2 focus:ring-[#ffba20]/30 focus:bg-white transition-all" />
    </div>
  );
}

function LocationStep({ site, update }: { site: Partial<SiteAnalysis>; update: (f: keyof SiteAnalysis, v: unknown) => void }) {
  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Location Selection</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Address" value={site.address ?? ""} onChange={(v) => update("address", v)} />
        </div>
        <Field label="Latitude" type="number" value={site.latitude ?? ""} onChange={(v) => update("latitude", parseFloat(v))} step={0.0001} />
        <Field label="Longitude" type="number" value={site.longitude ?? ""} onChange={(v) => update("longitude", parseFloat(v))} step={0.0001} />
        <Field label="Peak Sun Hours" type="number" unit="hrs/yr" value={site.peak_sun_hours ?? ""} onChange={(v) => update("peak_sun_hours", parseFloat(v))} min={0} />
        <Field label="Irradiance Zone" value={site.irradiance_zone ?? ""} onChange={(v) => update("irradiance_zone", v)} />
      </div>
      <p className="text-[10px] text-[#40484c] mt-3 flex items-center gap-1">
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
        Click the map to update coordinates automatically
      </p>
    </div>
  );
}

function RoofGeometryStep({ site, update }: { site: Partial<SiteAnalysis>; update: (f: keyof SiteAnalysis, v: unknown) => void }) {
  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Roof Geometry</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-1.5">Roof Type</label>
          <select value={site.roof_type ?? "flat"} onChange={(e) => update("roof_type", e.target.value)}
            className="w-full bg-[#eceeef] rounded-xl px-4 py-2.5 text-sm text-[#191c1d] border-none outline-none">
            {["flat","gable","hip","shed","mansard"].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <Field label="Pitch" type="number" unit="°" value={site.roof_pitch_degrees ?? 0} onChange={(v) => update("roof_pitch_degrees", parseFloat(v))} min={0} max={90} />
        <Field label="Orientation (Azimuth)" type="number" unit="°" value={site.roof_orientation_degrees ?? 180} onChange={(v) => update("roof_orientation_degrees", parseFloat(v))} min={0} max={360} />
        <Field label="Total Roof Area" type="number" unit="m²" value={site.total_roof_area ?? 0} onChange={(v) => update("total_roof_area", parseFloat(v))} min={0} />
        <Field label="Usable Roof Area" type="number" unit="m²" value={site.usable_roof_area ?? 0} onChange={(v) => update("usable_roof_area", parseFloat(v))} min={0} />
      </div>
    </div>
  );
}

function UtilityEconomicsStep({ site, update }: { site: Partial<SiteAnalysis>; update: (f: keyof SiteAnalysis, v: unknown) => void }) {
  const annualBill = (site.annual_consumption_kwh ?? 0) * (site.current_rate_kwh ?? 0);
  return (
    <div className="bg-white rounded-xl p-5">
      <h3 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Utility Economics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Field label="Utility Provider" value={site.utility_provider ?? ""} onChange={(v) => update("utility_provider", v)} /></div>
        <Field label="Current Rate" type="number" unit="$/kWh" value={site.current_rate_kwh ?? 0} onChange={(v) => update("current_rate_kwh", parseFloat(v))} step={0.001} min={0} />
        <Field label="Annual Consumption" type="number" unit="kWh" value={site.annual_consumption_kwh ?? 0} onChange={(v) => update("annual_consumption_kwh", parseFloat(v))} min={0} />
        <Field label="Feed-in Tariff" type="number" unit="$/kWh" value={site.feed_in_tariff ?? 0} onChange={(v) => update("feed_in_tariff", parseFloat(v))} step={0.001} min={0} />
        <div className="flex items-center gap-3 col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#40484c]">Net Metering</span>
          <button onClick={() => update("net_metering_available", !site.net_metering_available)}
            className={clsx("relative w-10 h-5 rounded-full transition-colors", site.net_metering_available ? "bg-[#19667d]" : "bg-[#bfc8cc]")}>
            <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", site.net_metering_available ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>
      </div>
      {annualBill > 0 && (
        <div className="mt-4 p-3 bg-[#f2f4f5] rounded-xl grid grid-cols-3 gap-3">
          {[
            { label: "Annual Bill", value: `$${annualBill.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            { label: "Est. Offset", value: `${Math.min(100, Math.round((site.usable_roof_area ?? 0) / 10))}%` },
            { label: "Est. Savings", value: `$${(annualBill * 0.7).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          ].map((i) => (
            <div key={i.label} className="text-center">
              <div className="font-headline font-bold text-base text-[#191c1d]">{i.value}</div>
              <div className="text-[9px] text-[#40484c] uppercase tracking-wide">{i.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
