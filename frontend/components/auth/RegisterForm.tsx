"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/useAuthStore";
import { LOCAL_DATA_MODE } from "@/lib/data-mode";
import { LocalDataNotice } from "@/components/data/LocalDataNotice";

export function RegisterForm() {
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const result = await register({ name, email, password, school });
    setLoading(false);

    if (result.success) {
      setPending(true);
    } else {
      setError(result.error ?? "Ошибка регистрации");
    }
  };

  return (
    <div>
      <LocalDataNotice />
      <div className="mb-8 lg:hidden">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/40">
          <GraduationCap size={24} />
        </div>
      </div>

      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
          Создать аккаунт
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {LOCAL_DATA_MODE
            ? "Создайте демо-аккаунт. Одобрить его можно в демо-админке в этом же браузере."
            : "Заявку смотрит администратор. После одобрения можно войти как учитель."}
        </p>
      </div>

      {pending ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_14px_34px_-16px_rgb(15_23_42/0.18)]">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={32} />
          <p className="text-lg font-semibold text-slate-900">{LOCAL_DATA_MODE ? "Заявка сохранена в браузере" : "Заявка ушла админу"}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Когда аккаунт одобрят, войдите тем же email и паролем. До этого
            журнал закрыт.
          </p>
          <Link href="/login" className="mt-5 inline-block">
            <Button>К входу</Button>
          </Link>
        </div>
      ) : (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_14px_34px_-16px_rgb(15_23_42/0.18)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ФИО"
            type="text"
            placeholder="Иванов Иван Иванович"
            icon={<User size={16} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />

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

          <Input
            label="Школа (необязательно)"
            type="text"
            placeholder="СШ №12, Алматы"
            icon={<Building2 size={16} />}
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          />

          <div className="relative">
            <Input
              label="Пароль"
              type={showPassword ? "text" : "password"}
              placeholder="Минимум 6 символов"
              icon={<Lock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

          <Input
            label="Подтвердите пароль"
            type={showPassword ? "text" : "password"}
            placeholder="Повторите пароль"
            icon={<Lock size={16} />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

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
                Регистрация...
              </>
            ) : (
              "Создать аккаунт"
            )}
          </Button>
        </form>
      </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
