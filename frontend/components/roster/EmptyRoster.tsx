"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function EmptyRoster({
  title = "Класс ещё пустой",
  text = "Создайте класс, добавьте учеников или загрузите журнал — и цикл заработает: урок → сигнал → решение.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <Card variant="spotlight" className="overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-400/25 blur-3xl" />
      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/35">
            <Sparkles size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
        </div>
        <Link href="/students">
          <Button>Собрать класс</Button>
        </Link>
      </div>
    </Card>
  );
}
