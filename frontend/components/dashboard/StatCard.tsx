"use client";

import { cn } from "@/lib/utils";
import { ProgressBar, TrendIndicator } from "@/components/ui/ProgressBar";
import type { Trend } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

type Tone = "brand" | "emerald" | "amber" | "violet";

const tones: Record<Tone, { tile: string; glow: string }> = {
  brand: {
    tile: "from-brand-500 to-brand-700 shadow-brand-500/40",
    glow: "bg-brand-400/25",
  },
  emerald: {
    tile: "from-emerald-500 to-teal-600 shadow-emerald-500/40",
    glow: "bg-emerald-400/25",
  },
  amber: {
    tile: "from-amber-500 to-orange-600 shadow-amber-500/40",
    glow: "bg-amber-400/25",
  },
  violet: {
    tile: "from-accent-500 to-accent-600 shadow-accent-500/40",
    glow: "bg-accent-400/25",
  },
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: Tone;
  trend?: Trend;
  trendChange?: number;
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "brand",
  trend,
  trendChange,
  delay = 0,
}: StatCardProps) {
  const palette = tones[tone];

  return (
    <div
      className="lift group relative animate-fade-up overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_4px_14px_-4px_rgb(15_23_42/0.08)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          palette.glow,
          "opacity-60"
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-[32px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-3">
              <TrendIndicator trend={trend} change={trendChange} size="sm" />
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-105",
            palette.tile
          )}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

interface StageStatProps {
  title: string;
  percentage: number;
  plusCount: number;
  total: number;
}

export function StageStat({
  title,
  percentage,
  plusCount,
  total,
}: StageStatProps) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 transition-colors hover:border-brand-200">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug text-slate-700">
          {title}
        </p>
        <span className="text-sm font-bold tabular-nums text-slate-900">
          {percentage}%
        </span>
      </div>
      <ProgressBar value={percentage} size="sm" />
      <p className="mt-2 text-xs text-slate-400">
        {plusCount} из {total} справились
      </p>
    </div>
  );
}
