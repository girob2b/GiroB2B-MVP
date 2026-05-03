import { ShieldCheck, ShieldHalf, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type CredibilityLevel = 1 | 2 | 3;

const LEVELS = {
  1: {
    label: "Básico",
    icon:  Shield,
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
  2: {
    label: "Verificado",
    icon:  ShieldHalf,
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },
  3: {
    label: "Certificado",
    icon:  ShieldCheck,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
} as const;

interface CredibilityBadgeProps {
  level: CredibilityLevel | number;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function CredibilityBadge({
  level,
  showLabel = true,
  size = "sm",
  className,
}: CredibilityBadgeProps) {
  const safeLevel = (Math.min(Math.max(Math.round(level), 1), 3)) as CredibilityLevel;
  const config    = LEVELS[safeLevel];
  const Icon      = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className,
        className,
      )}
      title={`Credibilidade ${config.label}`}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {showLabel && config.label}
    </span>
  );
}
