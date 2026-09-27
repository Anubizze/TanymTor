"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { Signal, SignalResult, SignalsPayload } from "@/lib/signal-types";
import { LEVEL_LABEL } from "@/lib/signal-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, SectionIcon } from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";

export function SignalPulse() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const [payload, setPayload] = useState<SignalsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<SignalsPayload>("/api/signals")
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [classGroup.id]);

  const open = useMemo(() => {
    const ids = new Set(classGroup.students.map((student) => student.id));
    return (payload?.results ?? []).filter(
      (result): result is SignalResult & { status: "signal"; signal: Signal } =>
        result.status === "signal" &&
        Boolean(result.signal) &&
        (ids.size === 0 || ids.has(result.studentId))
    );
  }, [payload, classGroup]);

  if (!payload || open.length === 0) return null;

  return (
    <Card className="mb-6 overflow-hidden border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon tone="rose">
            <Zap size={17} />
          </SectionIcon>
          <div>
            <CardTitle>Сигналы по журналу</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {open.length} {open.length === 1 ? "ученик выбился" : "учеников выбились"} из своей нормы — ждут вашего решения, не алгоритма
            </p>
          </div>
        </div>
        <Link href="/signals">
          <Button size="sm">
            Разобрать
            <ArrowRight size={14} />
          </Button>
        </Link>
      </CardHeader>
      <div className="space-y-2">
        {open.slice(0, 4).map((item) => (
          <div
            key={item.signal.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-white/80 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {item.studentName}
              </p>
              <p className="truncate text-xs text-slate-500">{item.signal.message}</p>
            </div>
            <Badge
              variant={
                item.signal.level === "intervene"
                  ? "danger"
                  : item.signal.level === "attention"
                    ? "warning"
                    : "info"
              }
            >
              {LEVEL_LABEL[item.signal.level]}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
