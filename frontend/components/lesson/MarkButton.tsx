"use client";

import { cn } from "@/lib/utils";

interface MarkButtonProps {
  mark: "+" | "-";
  active: boolean;
  onClick: () => void;
}

export function MarkButton({ mark, active, onClick }: MarkButtonProps) {
  const isPlus = mark === "+";

  return (
    <button
      onClick={onClick}
      className={cn(
        "ring-focus flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all duration-200 active:scale-90",
        isPlus
          ? active
            ? "scale-105 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_6px_16px_-6px_rgb(16_185_129/0.8)]"
            : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
          : active
            ? "scale-105 bg-gradient-to-br from-rose-400 to-red-600 text-white shadow-[0_6px_16px_-6px_rgb(244_63_94/0.8)]"
            : "bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
      )}
      title={isPlus ? "Справился" : "Не справился"}
    >
      {mark}
    </button>
  );
}
