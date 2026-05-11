"use client";
import { useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from "recharts";
import { roiApi, type YearlyProjection } from "@/lib/api";

const DEFAULTS = {
  system_size_kwp: 10,
  system_cost_usd: 35000,
  annual_production_kwh: 14000,
  panel_degradation_pct: 0.5,
  federal_itc_pct: 30,
  provincial_rebate_usd: 0,
  loan_amount_usd: 28000,
  loan_interest_rate_pct: 5.5,
  loan_term_years: 20,
  current_utility_rate_kwh: 0.18,
  utility_inflation_rate_pct: 3.5,
  net_metering_rate_kwh: 0.10,
  annual_om_cost_usd: 200,
};

type Params = typeof DEFAULTS;

const MOCK_PROJECTIONS: YearlyProjection[] = Array.from({ length: 25 }, (_, i) => {
  const yr = i + 1;
  const utilCost = 3420 * Math.pow(1.035, yr - 1);
  const solarPayout = 420;
  const net = utilCost - solarPayout;
  return {
    year: yr, utility_cost_usd: utilCost, solar_payout_usd: solarPayout,
    net_savings_usd: net,
    cumulative_savings_usd: Array.from({ length: yr }, (_, j) => 3420 * Math.pow(1.035, j) - 420).reduce((a, b) => a + b, 0) - 28400,
    generation_kwh: 14000 * Math.pow(0.995, yr - 1), utility_rate_kwh: 0.18 * Math.pow(1.035, yr - 1),
  };
});

function Slider({ label, value, min, max, step = 1, format, onChange, locked }: {
  label: string; value: number; min: number; max: number; step?: number;
  format?: (v: number) => string; onChange: (v: number) => void; locked?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs text-[#40484c]">{label}</label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[#191c1d]">{format ? format(value) : value}</span>
          {locked && <span className="text-[10px] px-1.5 py-0.5 bg-[#19667d]/10 text-[#19667d] rounded font-bold">Locked</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={locked}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#19667d] disabled:opacity-50 disabled:cursor-not-allowed" />
      <div className="flex justify-between text-[9px] text-[#70787d] mt-0.5">
        <span>{format ? format(min) : min}</span><span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

export default function ROICalculatorPage() {
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [projections, setProjections] = useState<YearlyProjection[]>(MOCK_PROJECTIONS);
  const [results, setResults] = useState({
    net_system_cost_usd: 28400, payback_years: 7.2, irr_pct: 14.8,
    npv_usd: 42000, lcoe_per_kwh: 0.06, lifetime_savings_usd: 142850,
    lifetime_utility_cost_usd: 182400, lifetime_solar_cost_usd: 39550,
  });
  const [loanTerm, setLoanTerm] = useState<15 | 20 | 25>(20);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof Params) => (v: number) => {
    const next = { ...params, [field]: v };
    setParams(next);
    recalculate(next);
  };

  const recalculate = useCallback(async (p: Params) => {
    setLoading(true);
    try {
      const res = await roiApi.quickEstimate({ ...p, loan_term_years: loanTerm });
      setResults({
        net_system_cost_usd: res.data.net_system_cost_usd,
        payback_years: res.data.payback_years,
        irr_pct: res.data.irr_pct,
        npv_usd: res.data.npv_usd,
        lcoe_per_kwh: res.data.lcoe_per_kwh,
        lifetime_savings_usd: res.data.lifetime_savings_usd,
        lifetime_utility_cost_usd: res.data.lifetime_utility_cost_usd,
        lifetime_solar_cost_usd: res.data.lifetime_solar_cost_usd,
      });
      if (res.data.yearly_projections?.length) setProjections(res.data.yearly_projections);
    } catch { /* keep mock */ }
    setLoading(false);
  }, [loanTerm]);

  const chartData = projections.map((p) => ({
    name: `YR${p.year}`,
    "Solar Savings": Math.round(p.cumulative_savings_usd),
    "Utility Cost": Math.round(p.utility_cost_usd),
  }));

  const breakeven = projections.find((p) => p.cumulative_savings_usd >= 0);

  const usd = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString(undefined,{maximumFractionDigits:0})}` : `$${v.toLocaleString(undefined,{maximumFractionDigits:0})}`;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-[#191c1d]">ROI Calculator</h1>
          <p className="text-sm text-[#40484c] mt-1">25-year financial performance analysis · Helios Precision modeling</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5] transition-colors">
            <span className="material-symbols-outlined" style={{fontSize:16}}>file_download</span> Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#bfc8cc]/40 rounded-xl text-sm text-[#40484c] hover:bg-[#f2f4f5] transition-colors">
            <span className="material-symbols-outlined" style={{fontSize:16}}>share</span> Share Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Assumptions panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#19667d]" style={{fontSize:18}}>tune</span>
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Assumptions</h2>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-3">System</p>
                <div className="space-y-4">
                  <Slider label="System Size" value={params.system_size_kwp} min={2} max={50} step={0.5} format={(v)=>`${v} kWp`} onChange={set("system_size_kwp")} />
                  <Slider label="System Cost" value={params.system_cost_usd} min={5000} max={150000} step={500} format={(v)=>`$${v.toLocaleString()}`} onChange={set("system_cost_usd")} />
                  <Slider label="Annual Production" value={params.annual_production_kwh} min={2000} max={80000} step={500} format={(v)=>`${v.toLocaleString()} kWh`} onChange={set("annual_production_kwh")} />
                </div>
              </div>

              <div className="border-t border-[#f2f4f5] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-3">Incentives</p>
                <div className="space-y-4">
                  <Slider label="Federal Incentive (ITC)" value={params.federal_itc_pct} min={30} max={30} format={(v)=>`${v}%`} onChange={set("federal_itc_pct")} locked />
                  <Slider label="Provincial Rebate" value={params.provincial_rebate_usd} min={0} max={10000} step={250} format={(v)=>`$${v.toLocaleString()}`} onChange={set("provincial_rebate_usd")} />
                </div>
              </div>

              <div className="border-t border-[#f2f4f5] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-3">Financing</p>
                <div className="space-y-4">
                  <Slider label="Loan Amount" value={params.loan_amount_usd} min={0} max={params.system_cost_usd} step={500} format={(v)=>`$${v.toLocaleString()}`} onChange={set("loan_amount_usd")} />
                  <Slider label="Loan Interest Rate" value={params.loan_interest_rate_pct} min={2} max={12} step={0.1} format={(v)=>`${v.toFixed(1)}%`} onChange={set("loan_interest_rate_pct")} />
                  <div>
                    <label className="text-xs text-[#40484c] mb-1.5 block">Loan Term</label>
                    <div className="flex gap-2">
                      {([15,20,25] as const).map((yr) => (
                        <button key={yr} onClick={() => setLoanTerm(yr)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${loanTerm===yr ? "bg-[#19667d] text-white" : "bg-[#f2f4f5] text-[#40484c] hover:bg-[#eceeef]"}`}>
                          {yr}yr
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#f2f4f5] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] mb-3">Utility</p>
                <div className="space-y-4">
                  <Slider label="Current Rate" value={params.current_utility_rate_kwh} min={0.05} max={0.60} step={0.01} format={(v)=>`$${v.toFixed(2)}/kWh`} onChange={set("current_utility_rate_kwh")} />
                  <Slider label="Utility Inflation Rate" value={params.utility_inflation_rate_pct} min={1} max={8} step={0.1} format={(v)=>`${v.toFixed(1)}%`} onChange={set("utility_inflation_rate_pct")} />
                </div>
              </div>
            </div>

            {results.irr_pct !== 0 && (
              <p className="text-[10px] text-[#40484c] mt-4 bg-[#f2f4f5] rounded-xl p-3">
                <strong className="text-[#191c1d]">Financial impact:</strong> Adjusting the utility inflation rate has the most significant effect on 25-year cumulative savings.
              </p>
            )}
          </div>
        </div>

        {/* Right: charts + metrics */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Lifetime Savings", value: usd(results.lifetime_savings_usd), icon: "trending_up", color: "#166534" },
              { label: "Net System Cost", value: usd(results.net_system_cost_usd), icon: "payments", color: "#19667d" },
              { label: "Payback Period", value: `${results.payback_years}yr`, icon: "timer", color: "#513800" },
              { label: "IRR", value: `${results.irr_pct}%`, icon: "trending_up", color: "#166534" },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#40484c]">{k.label}</span>
                  <span className="material-symbols-outlined" style={{fontSize:18, color:k.color}}>{k.icon}</span>
                </div>
                <div className="font-headline font-bold text-2xl" style={{color:k.color}}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* 25-year cash flow chart */}
          <div className="bg-white rounded-xl p-6">
            <div className="mb-4">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">25-Year Cumulative Cash Flow</h2>
              <p className="text-xs text-[#40484c] mt-0.5">Projected cumulative savings and system breakeven point</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{top:5,right:10,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#19667d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#19667d" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#bfc8cc" strokeOpacity={0.1}/>
                <XAxis dataKey="name" tick={{fontSize:10,fill:"#40484c"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#40484c"}} axisLine={false} tickLine={false} tickFormatter={(v)=>`$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v:number)=>usd(v)}/>
                <ReferenceLine y={0} stroke="#ffba20" strokeWidth={2} strokeDasharray="4 4" label={{value:`Breakeven Yr ${results.payback_years}`,position:"insideTopLeft",fontSize:10,fill:"#ffba20"}}/>
                <Area type="monotone" dataKey="Solar Savings" stroke="#19667d" fill="url(#savGrad)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Utility vs solar comparison */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#ba1a1a]" style={{fontSize:20}}>power_off</span>
                <h3 className="font-headline font-bold text-sm text-[#191c1d]">Current Utility Bill</h3>
              </div>
              {[
                { label: "Est. Year 1 Cost", value: usd(projections[0]?.utility_cost_usd ?? 3420) },
                { label: "Avg. Monthly", value: usd((projections[0]?.utility_cost_usd ?? 3420)/12) },
                { label: "Base Rate", value: `$${params.current_utility_rate_kwh.toFixed(2)}/kWh` },
                { label: "25-Year Spend", value: usd(results.lifetime_utility_cost_usd) },
              ].map((r) => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-[#f2f4f5] last:border-0">
                  <span className="text-xs text-[#40484c]">{r.label}</span>
                  <span className="text-xs font-bold text-[#191c1d]">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#19667d]" style={{fontSize:20}}>wb_sunny</span>
                <h3 className="font-headline font-bold text-sm text-[#191c1d]">Solar Protected Bill</h3>
              </div>
              {[
                { label: "Est. Year 1 Cost", value: usd(projections[0]?.solar_payout_usd ?? 420) },
                { label: "Monthly Payment", value: usd((projections[0]?.solar_payout_usd ?? 420)/12) },
                { label: "Solar Rate (LCOE)", value: `$${results.lcoe_per_kwh.toFixed(2)}/kWh` },
                { label: "25-Year Spend", value: usd(results.lifetime_solar_cost_usd) },
              ].map((r) => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-[#f2f4f5] last:border-0">
                  <span className="text-xs text-[#40484c]">{r.label}</span>
                  <span className="text-xs font-bold text-[#19667d]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Year-over-year table */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#f2f4f5]">
              <h2 className="font-headline font-bold text-sm text-[#191c1d]">Year-over-Year Projections</h2>
              <span className="text-[10px] font-bold text-[#19667d] uppercase tracking-widest">Full Breakdown</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f2f4f5]/50">
                  {["Year","Utility Cost (No Solar)","Solar Payout","Net Savings"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.05em] text-[#40484c]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projections.filter((_, i) => [0,4,9,14,19,24].includes(i)).map((p, i) => (
                  <tr key={p.year} className={i%2===1?"bg-[#f2f4f5]/40":""}>
                    <td className="px-5 py-3 font-medium text-[#191c1d]">Year {String(p.year).padStart(2,"0")}</td>
                    <td className="px-5 py-3 text-[#ba1a1a] font-bold">{usd(p.utility_cost_usd)}</td>
                    <td className="px-5 py-3 text-[#19667d]">{usd(p.solar_payout_usd)}</td>
                    <td className={`px-5 py-3 font-bold ${p.net_savings_usd>=0?"text-[#166534]":"text-[#ba1a1a]"}`}>
                      {p.net_savings_usd>=0?"+":""}{usd(p.net_savings_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
