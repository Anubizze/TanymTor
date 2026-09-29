"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { LocalDataNotice } from "@/components/data/LocalDataNotice";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isHydrated) void restoreSession();
  }, [isHydrated, restoreSession]);

  useEffect(() => {
    if (!isHydrated) return;
    if (currentUser?.role === "admin") {
      if (isLogin) router.replace("/admin");
      return;
    }
    if (currentUser?.role === "teacher") {
      router.replace("/");
      return;
    }
    if (!isLogin) router.replace("/admin/login");
  }, [isHydrated, currentUser, isLogin, router]);

  if (!isHydrated) {
    return (
      <div className="auth-backdrop flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-300" />
      </div>
    );
  }

  if (isLogin) {
    if (currentUser?.role === "admin") return null;
    return <>{children}</>;
  }

  if (currentUser?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white">
              <Shield size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">Админка TanymTor</p>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">
                Одобрение учителей
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">{currentUser.name}</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8"><LocalDataNotice />{children}</main>
    </div>
  );
}
