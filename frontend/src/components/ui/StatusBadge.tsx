import { clsx } from "clsx";
import type { ProjectStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; classes: string }
> = {
  ACTIVE: {
    label: "Active",
    classes: "bg-[#dcfce7] text-[#166534]",
  },
  PENDING: {
    label: "Pending",
    classes: "bg-[#fef9c3] text-[#854d0e]",
  },
  COMPLETED: {
    label: "Completed",
    classes: "bg-[#dbeafe] text-[#1e40af]",
  },
  ARCHIVED: {
    label: "Archived",
    classes: "bg-[#f1f5f9] text-[#475569]",
  },
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={clsx(
        "inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
        config.classes
      )}
    >
      {config.label}
    </span>
  );
}
