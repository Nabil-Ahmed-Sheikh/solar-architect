"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard",      icon: "dashboard",      label: "Projects" },
  { href: "/site-analysis",  icon: "map",            label: "Site Analysis" },
  { href: "/configuration",  icon: "solar_power",    label: "Configuration" },
  { href: "/reports",        icon: "assessment",     label: "Reports" },
  { href: "/roi-calculator", icon: "calculate",      label: "ROI Calculator" },
  { href: "/roof-measure",   icon: "straighten",     label: "Roof Measure" },
  { href: "/shade-analysis", icon: "wb_shade",       label: "Shade Analysis" },
];

const footerItems = [
  { href: "/settings", icon: "settings",       label: "Settings" },
  { href: "/profile",  icon: "account_circle", label: "Profile" },
  { href: "/support",  icon: "help_center",    label: "Support" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#f2f4f5] flex flex-col py-6 px-4 z-50 overflow-y-auto">
      <div className="mb-8 px-2 flex-shrink-0">
        <h1 className="text-xl font-bold text-[#19667d] tracking-tight font-headline">SolarArchitect</h1>
        <p className="text-[10px] uppercase tracking-widest text-[#70787d] font-bold mt-1">Technical Precision</p>
      </div>

      <Link href="/dashboard?new=1"
        className="mb-5 flex-shrink-0 w-full py-2.5 px-4 btn-primary flex items-center justify-center gap-2 text-sm">
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add</span>
        New Project
      </Link>

      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={clsx(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all font-headline font-medium",
              isActive(item.href)
                ? "text-[#19667d] font-bold border-r-4 border-[#19667d] bg-[#a1e4fe]/20"
                : "text-[#40484c] hover:text-[#19667d] hover:bg-[#a1e4fe]/10"
            )}>
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="pt-4 border-t border-[#bfc8cc]/40 space-y-0.5 mt-4 flex-shrink-0">
        {footerItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={clsx(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all font-headline",
              isActive(item.href)
                ? "text-[#19667d] font-bold bg-[#a1e4fe]/20"
                : "text-[#40484c] hover:text-[#19667d] hover:bg-[#a1e4fe]/10"
            )}>
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
