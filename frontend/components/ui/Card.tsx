import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CardVariant = "default" | "glass" | "spotlight" | "dark";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  variant?: CardVariant;
  padded?: boolean;
}

const variants: Record<CardVariant, string> = {
  default:
    "border border-slate-200/70 bg-white shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_4px_14px_-4px_rgb(15_23_42/0.08)]",
  glass:
    "border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_8px_24px_-8px_rgb(15_23_42/0.12)]",
  spotlight:
    "border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-accent-400/5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_10px_28px_-12px_rgb(79_70_229/0.28)]",
  dark: "border border-white/10 bg-ink-900 text-white shadow-[0_18px_40px_-18px_rgb(8_11_20/0.8)]",
};

export function Card({
  children,
  className,
  hover,
  variant = "default",
  padded = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl",
        variants[variant],
        padded && "p-6",
        hover && "lift",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-center justify-between gap-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900", className)}>
      {children}
    </h3>
  );
}

export function CardSubtitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-sm text-slate-500", className)}>{children}</p>
  );
}

export function SectionIcon({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  tone?: "brand" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
}) {
  const tones = {
    brand: "from-brand-500 to-accent-500 shadow-brand-500/35",
    emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/35",
    amber: "from-amber-500 to-orange-500 shadow-amber-500/35",
    rose: "from-rose-500 to-red-500 shadow-rose-500/35",
    slate: "from-slate-600 to-slate-800 shadow-slate-600/30",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
