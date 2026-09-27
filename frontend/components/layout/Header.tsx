"use client";

import { useAppStore } from "@/store/useAppStore";
import { formatDate } from "@/lib/calculations";
import { Badge } from "@/components/ui/Badge";
import { ContextSwitcher } from "@/components/layout/ContextSwitcher";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showContext?: boolean;
}

export function Header({
  title,
  subtitle,
  actions,
  showContext = true,
}: HeaderProps) {
  const activeLesson = useAppStore((s) => s.getActiveLesson());

  return (
    <header className="relative z-10 mb-7 rounded-2xl border border-white/70 bg-white/75 px-6 py-[18px] shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_10px_30px_-16px_rgb(15_23_42/0.22)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="animate-fade-in min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
          {activeLesson && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge variant="success" dot>
                Урок активен
              </Badge>
              <span className="text-xs text-slate-500">
                {activeLesson.title} · {formatDate(activeLesson.date)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showContext && <ContextSwitcher />}
          {actions}
        </div>
      </div>
    </header>
  );
}
