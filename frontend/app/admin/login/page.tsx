"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ADMIN_CREDENTIALS, useAuthStore } from "@/store/useAuthStore";
import { LocalDataNotice } from "@/components/data/LocalDataNotice";

export default function AdminLoginPage() {
  const router = useRouter();
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await adminLogin(email, password);
    setLoading(false);
    if (result.success) {
      router.push("/admin");
    } else {
      setError(result.error ?? "Ошибка входа");
    }
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-500/40">
            <Shield size={20} />
          </span>
          <div>
            <p className="text-lg font-bold text-white">Админка</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              Одобрение учителей
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-2xl">
          <LocalDataNotice />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Вход администратора
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Новые учителя не попадают в журнал, пока вы не одобрите заявку.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@tanymtor.kz"
              icon={<Mail size={16} />}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <div className="relative">
              <Input
                label="Пароль"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                icon={<Lock size={16} />}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[35px] text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
                "Войти в админку"
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setEmail(ADMIN_CREDENTIALS.email);
              setPassword(ADMIN_CREDENTIALS.password);
              setError("");
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-2.5 text-[13px] font-medium text-brand-700"
          >
            <Wand2 size={15} />
            Заполнить админ-аккаунт
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Учитель?{" "}
          <Link href="/login" className="font-semibold text-white hover:text-brand-200">
            Обычный вход
          </Link>
        </p>
      </div>
    </div>
  );
}
