"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEMO_CREDENTIALS, useAuthStore } from "@/store/useAuthStore";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error ?? "Ошибка входа");
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError("");
  };

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/40">
          <GraduationCap size={24} />
        </div>
      </div>

      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
          С возвращением
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Войдите, чтобы продолжить работу с классом
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_14px_34px_-16px_rgb(15_23_42/0.18)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="teacher@school.kz"
            icon={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <div className="relative">
            <Input
              label="Пароль"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[35px] text-slate-400 transition-colors hover:text-slate-600"
              tabIndex={-1}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && (
            <div className="animate-pop flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Вход...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            или
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={fillDemo}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-2.5 text-[13px] font-medium text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-50"
        >
          <Wand2
            size={15}
            className="transition-transform group-hover:-rotate-12"
          />
          Заполнить демо-аккаунт
        </button>
      </div>

        <p className="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Зарегистрироваться
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-400">
        Админ?{" "}
        <Link
          href="/admin/login"
          className="font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          Вход в админку
        </Link>
      </p>
    </div>
  );
}
