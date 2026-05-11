interface MetricCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  subLabel?: string;
}

export default function MetricCard({
  icon,
  iconColor = "#19667d",
  label,
  value,
  unit,
  trend,
  trendUp,
  subLabel,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-[#40484c]">
          {label}
        </span>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 22, color: iconColor }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="font-headline font-bold text-3xl text-[#191c1d] leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-[#40484c] mb-0.5 font-label">{unit}</span>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          <span
            className="material-symbols-outlined text-sm"
            style={{
              fontSize: 16,
              color: trendUp ? "#166534" : "#ba1a1a",
            }}
          >
            {trendUp ? "trending_up" : "trending_down"}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: trendUp ? "#166534" : "#ba1a1a" }}
          >
            {trend}
          </span>
        </div>
      )}
      {subLabel && (
        <p className="text-[10px] uppercase tracking-widest text-[#70787d] font-bold">
          {subLabel}
        </p>
      )}
    </div>
  );
}
