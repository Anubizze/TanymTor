import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants = {
  primary:
    "bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-[0_10px_26px_-10px_rgb(79_70_229/0.6)] hover:from-brand-500 hover:to-accent-500 hover:shadow-[0_14px_30px_-10px_rgb(79_70_229/0.7)]",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300",
  success:
    "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_10px_26px_-10px_rgb(16_185_129/0.6)] hover:from-emerald-500 hover:to-teal-500",
};

const sizes = {
  sm: "px-3 py-1.5 text-[13px] gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-[15px] gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "ring-focus inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
