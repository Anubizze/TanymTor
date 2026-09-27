import { cn } from "@/lib/utils";
import type { Trend } from "@/lib/types";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface ProgressBarProps {
  value: number;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

function fillFor(value: number) {
  if (value >= 80) return "bg-gradient-to-r from-emerald-400 to-teal-500";
  if (value >= 60) return "bg-gradient-to-r from-amber-400 to-orange-500";
  return "bg-gradient-to-r from-rose-400 to-red-500";
}

export function ProgressBar({
  value,
  className,
  size = "md",
  showLabel = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            fillFor(clamped)
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[4ch] text-right text-sm font-semibold tabular-nums text-slate-700">
          {value}%
        </span>
      )}
    </div>
  );
}

interface TrendIndicatorProps {
  trend: Trend;
  change?: number;
  size?: "sm" | "md";
}

export function TrendIndicator({
  trend,
  change,
  size = "md",
}: TrendIndicatorProps) {
  const iconSize = size === "sm" ? 13 : 15;
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset";

  if (trend === "up") {
    return (
      <span className={cn(base, "bg-emerald-50 text-emerald-700 ring-emerald-200")}>
        <TrendingUp size={iconSize} />
        {change !== undefined && <span>+{change}%</span>}
      </span>
    );
  }

  if (trend === "down") {
    return (
      <span className={cn(base, "bg-rose-50 text-rose-700 ring-rose-200")}>
        <TrendingDown size={iconSize} />
        {change !== undefined && <span>{change}%</span>}
      </span>
    );
  }

  return (
    <span className={cn(base, "bg-slate-100 text-slate-500 ring-slate-200")}>
      <Minus size={iconSize} />
      {change !== undefined && <span>0%</span>}
    </span>
  );
}
