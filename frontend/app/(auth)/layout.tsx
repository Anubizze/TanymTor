"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  GraduationCap,
  Loader2,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const highlights = [
  {
    icon: LineChart,
    title: "Личная норма, не среднее",
    text: "Сигнал — это падение относительно себя. Класс просел вместе — система это скажет.",
  },
  {
    icon: Sparkles,
    title: "Сигнал без диагноза",
    text: "Красная цифра не лечит. Учитель фиксирует причину и действие — потом смотрит, сработало ли.",
  },
  {
    icon: ShieldCheck,
    title: "Журнал не обязан быть API",
    text: "Пока нет BilimClass — CSV. Урок с плюсами и минусами сразу пишет оценки в ту же ленту.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    if (!isHydrated) {
      void restoreSession();
    }
  }, [isHydrated, restoreSession]);

  useEffect(() => {
    if (!isHydrated || !currentUser) return;
    router.replace(currentUser.role === "admin" ? "/admin" : "/");
  }, [isHydrated, currentUser, router]);

  if (!isHydrated && currentUser) {
    return (
      <div className="auth-backdrop flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-300" />
      </div>
    );
  }

  if (currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="auth-backdrop relative hidden w-[46%] max-w-[620px] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 animate-float rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 animate-drift rounded-full bg-accent-500/25 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-500/40">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-tight text-white">
              TanymTor
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Учёт успеваемости
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight text-white">
            Увидел падение.{" "}
            <span className="text-gradient-light">Принял решение.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Не дашборд ради дашборда: урок, журнал, сигнал, вмешательство и
            проверка через недели. Если после вашей работы ничего не сдвинулось —
            это тоже ответ.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-brand-300 backdrop-blur-sm">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-6 border-t border-white/10 pt-6">
          <div>
            <p className="text-2xl font-bold tabular-nums text-white">14</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              недель истории
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-2xl font-bold tabular-nums text-white">3</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              уровня сигнала
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="text-2xl font-bold tabular-nums text-white">CSV</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              строк CSV
            </p>
          </div>
        </div>
      </aside>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 px-6 py-12">
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="animate-fade-up relative z-10 w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
