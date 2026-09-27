"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Armchair,
  LayoutDashboard,
  Table2,
  Users,
  History,
  Brain,
  GraduationCap,
  LogOut,
  UserRound,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { SignalsPayload } from "@/lib/signal-types";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

const navItems = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/lesson", label: "Урок", icon: Table2 },
  { href: "/seating", label: "Матрица мест", icon: Armchair },
  { href: "/students", label: "Класс", icon: Users },
  { href: "/signals", label: "Сигналы", icon: Zap },
  { href: "/history", label: "История", icon: History },
  { href: "/analysis", label: "ИИ-анализ", icon: Brain },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const activeLesson = useAppStore((s) => s.getActiveLesson());
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [openSignals, setOpenSignals] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ids = new Set(classGroup.students.map((student) => student.id));
    void api<SignalsPayload>("/api/signals")
      .then((data) => {
        if (cancelled) return;
        setOpenSignals(
          data.results.filter(
            (result) =>
              result.status === "signal" &&
              result.signal &&
              ids.has(result.studentId)
          ).length
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [classGroup.id, classGroup.students]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="sidebar-backdrop fixed left-0 top-0 z-40 flex h-screen w-72 flex-col overflow-hidden text-slate-300">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-16 top-24 h-56 w-56 animate-float rounded-full bg-brand-500/25 blur-3xl" />

      <div className="relative flex items-center gap-3 px-6 py-6">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-500/40">
          <GraduationCap size={22} />
          <span className="absolute -inset-1 -z-10 rounded-2xl bg-brand-500/40 blur-lg" />
        </div>
        <div>
          <h1 className="text-[17px] font-bold tracking-tight text-white">
            TanymTor
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Учёт успеваемости
          </p>
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 px-4 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-accent-400 shadow-[0_0_12px_2px_rgb(129_140_248/0.6)]" />
              )}
              <Icon
                size={18}
                className={cn(
                  "transition-colors",
                  isActive
                    ? "text-brand-300"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              {item.label}
              {item.href === "/signals" && openSignals > 0 && (
                <span className="ml-auto rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                  {openSignals}
                </span>
              )}
              {item.href === "/lesson" && activeLesson && (
                <span className="relative ml-auto flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative space-y-3 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-white">
              <UserRound size={17} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {currentUser?.name ?? "Учитель"}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {currentUser?.school || "учитель"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 rounded-xl bg-black/25 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Класс
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {classGroup.name}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-300">
                {classGroup.students.length}
              </span>
            </div>
            <div className="min-w-0 border-t border-white/10 pt-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Предмет
              </p>
              <p className="truncate text-sm font-semibold text-brand-300">
                {subject.name}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut size={17} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
