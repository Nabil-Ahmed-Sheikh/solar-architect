"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";

const CATEGORIES = [
  { icon: "battery_charging_full", label: "Battery Sizing Logic", articles: 6, desc: "Calculate DoD requirements for LFP vs NMC chemistries." },
  { icon: "grid_on",               label: "Mounting Systems",    articles: 12, desc: "Structural wind load calculations for ballasted and penetrating roof mounts." },
  { icon: "electric_bolt",         label: "Inverter Clipping",   articles: 4,  desc: "Optimising DC:AC ratios for maximum yield versus hardware longevity." },
  { icon: "cloud_sync",            label: "API Integration",     articles: 0,  desc: "Webhooks and REST documentation for pulling generation data into ERP systems.", link: true },
];

const GUIDES = [
  { icon: "architecture", title: "Understanding Shading: Near-Field Obstruction", date: "Oct 24, 2023", readTime: "12 min" },
  { icon: "settings_suggest", title: "Micro-Inverter vs String-Inverter Efficiency Curve", date: "Oct 18, 2023", readTime: "8 min" },
  { icon: "analytics", title: "Albedo Effect in Bifacial Module Configuration", date: "Sep 30, 2023", readTime: "15 min" },
  { icon: "radar", title: "LiDAR Point Cloud Processing for Roof Segmentation", date: "Sep 12, 2023", readTime: "20 min" },
  { icon: "calculate", title: "IRR and LCOE: Financial Metrics for Solar Projects", date: "Aug 28, 2023", readTime: "10 min" },
];

const FAQ = [
  { q: "How accurate is the LiDAR plane-fitting algorithm?", a: "Our RANSAC-based segmentation achieves ±0.5° slope accuracy and ±2° azimuth accuracy on residential rooftops with point densities ≥4 pts/m²." },
  { q: "What LiDAR data sources are supported?", a: "Alberta Open Data (free, covers all of Alberta), USGS 3DEP (USA), and manual .laz/.las file uploads. Resolution typically 0.5–1m." },
  { q: "Can I export designs to PVsyst or Helioscope?", a: "Yes — shade profiles export as PVsyst-compatible horizon files (.hor). CAD exports (.dxf) are available for layout drawings." },
  { q: "How is the ROI calculator's IRR calculated?", a: "We use Newton-Raphson iteration on the 25-year discounted cash flow. The ITC federal incentive (30%) is applied in Year 0." },
];

export default function SupportPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ticketForm, setTicketForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (ticketForm.name && ticketForm.message) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setTicketForm({ name: "", email: "", subject: "", message: "" });
    }
  };

  return (
    <AppShell>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0f1923] to-[#19667d]/80 rounded-2xl p-10 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 blueprint-grid opacity-30" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8dd0e9]/70">New Masterclass</span>
            <span className="material-symbols-outlined text-[#ffba20]" style={{ fontSize: 14 }}>auto_awesome</span>
          </div>
          <h1 className="font-headline font-bold text-3xl text-white mb-2">
            How can we assist your <span className="text-[#ffba20]">Engineering</span>?
          </h1>
          <p className="text-sm text-[#8dd0e9]/80 mb-6 leading-relaxed">
            Access high-fidelity technical documentation, precision sizing logic, and direct architectural support for your solar deployments.
          </p>
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#40484c]" style={{ fontSize: 18 }}>search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation…"
              className="w-full bg-white rounded-xl py-3 pl-10 pr-4 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#ffba20]/30" />
          </div>
        </div>
        {/* Decorative solar panel grid */}
        <div className="absolute right-8 top-8 grid gap-1.5 opacity-20" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="w-8 h-12 bg-[#8dd0e9] rounded-sm border border-[#8dd0e9]/50" />
          ))}
        </div>
      </div>

      {/* Featured article */}
      <div className="bg-white rounded-xl p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#ffba20]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ffba20]" style={{ fontSize: 24 }}>wb_shade</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#19667d] mb-1">Featured · New Masterclass</p>
            <h2 className="font-headline font-bold text-base text-[#191c1d]">The Physics of Photovoltaic Shading Analysis</h2>
            <p className="text-xs text-[#40484c] mt-1">Deep dive into geometric impacts of diffuse vs. direct irradiance on thin-film architectures.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 btn-primary px-5 py-2.5 text-sm flex-shrink-0">
          Start Reading
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Categories */}
          <div>
            <h2 className="font-headline font-bold text-base text-[#191c1d] mb-4">Documentation Categories</h2>
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => (
                <div key={cat.label} className="bg-white rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#a1e4fe]/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#19667d]" style={{ fontSize: 22 }}>{cat.icon}</span>
                    </div>
                    {cat.link ? (
                      <span className="text-[10px] font-bold text-[#19667d] bg-[#a1e4fe]/20 px-2 py-0.5 rounded-full">API Docs</span>
                    ) : (
                      <span className="text-[10px] text-[#70787d]">{cat.articles} Articles</span>
                    )}
                  </div>
                  <h3 className="font-headline font-bold text-sm text-[#191c1d] group-hover:text-[#19667d] transition-colors">{cat.label}</h3>
                  <p className="text-xs text-[#40484c] mt-1 leading-relaxed">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Latest guides */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline font-bold text-base text-[#191c1d]">Latest Technical Guides</h2>
              <button className="text-xs font-bold text-[#19667d] hover:opacity-75">View All Documentation</button>
            </div>
            <div className="bg-white rounded-xl overflow-hidden">
              {GUIDES.map((guide, i) => (
                <div key={guide.title} className={`flex items-center gap-4 px-5 py-4 hover:bg-[#f2f4f5]/50 transition-colors cursor-pointer ${i < GUIDES.length - 1 ? "border-b border-[#f2f4f5]" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-[#f2f4f5] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#40484c]" style={{ fontSize: 18 }}>{guide.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#191c1d] truncate">{guide.title}</p>
                    <p className="text-[10px] text-[#70787d] mt-0.5">Last updated: {guide.date} · {guide.readTime} read</p>
                  </div>
                  <span className="material-symbols-outlined text-[#bfc8cc]" style={{ fontSize: 18 }}>chevron_right</span>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="font-headline font-bold text-base text-[#191c1d] mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#f2f4f5]/50 transition-colors">
                    <span className="text-sm font-medium text-[#191c1d] pr-4">{item.q}</span>
                    <span className="material-symbols-outlined text-[#40484c] flex-shrink-0 transition-transform" style={{ fontSize: 18, transform: openFaq === i ? "rotate(180deg)" : "none" }}>expand_more</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4">
                      <p className="text-sm text-[#40484c] leading-relaxed border-t border-[#f2f4f5] pt-3">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: contact */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Specialist CTA */}
          <div className="bg-[#0f1923] rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#8dd0e9] mb-2">Can't find an answer? Talk to an Engineer.</h2>
            <p className="text-xs text-[#8dd0e9]/60 leading-relaxed mb-4">
              Our technical desk is staffed by licensed solar architects and structural engineers. We provide 24-hour turnaround on complex system queries.
            </p>
            <div className="space-y-3">
              {[
                { icon: "verified_user", label: "Project Compliance Review", desc: "Send your design file for NEC or local code check." },
                { icon: "support_agent", label: "Direct Engineer Consultation", desc: "Schedule a 30-min technical call." },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 rounded-xl p-3 flex gap-3">
                  <span className="material-symbols-outlined text-[#8dd0e9]" style={{ fontSize: 20 }}>{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{item.label}</p>
                    <p className="text-[10px] text-[#8dd0e9]/50 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket form */}
          <div className="bg-white rounded-xl p-5">
            <h2 className="font-headline font-bold text-sm text-[#191c1d] mb-4">Submit a Ticket</h2>
            {submitted ? (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-[#166534]" style={{ fontSize: 36 }}>check_circle</span>
                <p className="text-sm font-bold text-[#166534] mt-2">Ticket submitted!</p>
                <p className="text-xs text-[#40484c] mt-1">We'll respond within 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Name", key: "name", type: "text" },
                  { label: "Email", key: "email", type: "email" },
                  { label: "Subject", key: "subject", type: "text" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] block mb-1">{f.label}</label>
                    <input type={f.type} value={ticketForm[f.key as keyof typeof ticketForm]}
                      onChange={(e) => setTicketForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30 focus:bg-white" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#40484c] block mb-1">Message</label>
                  <textarea value={ticketForm.message} onChange={(e) => setTicketForm((p) => ({ ...p, message: e.target.value }))}
                    rows={4} placeholder="Describe your technical issue in detail…"
                    className="w-full bg-[#eceeef] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ffba20]/30 focus:bg-white resize-none" />
                </div>
                <button onClick={handleSubmit} className="w-full btn-primary py-3 text-sm">
                  Submit Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
