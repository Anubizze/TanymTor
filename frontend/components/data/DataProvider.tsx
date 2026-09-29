"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { LOCAL_DATA_MODE } from "@/lib/data-mode";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const hydrate = useAppStore((s) => s.hydrate);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);

  useEffect(() => {
    if (currentUser) {
      void hydrate();
    }
  }, [currentUser, hydrate]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="app-backdrop flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-slate-800">
          {LOCAL_DATA_MODE ? "Не удалось загрузить локальные данные" : "Не удалось загрузить данные с сервера"}
        </p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <p className="mt-2 text-xs text-slate-400">
          {LOCAL_DATA_MODE ? "Проверьте, разрешено ли сохранение данных сайта в браузере." : "Проверьте доступность бэкенда."}
        </p>
        <Button className="mt-4" onClick={() => void hydrate()}>
          Повторить
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
