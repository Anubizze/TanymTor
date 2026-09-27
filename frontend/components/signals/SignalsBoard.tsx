"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  ACTION_PRESETS,
  CAUSE_PRESETS,
  LEVEL_LABEL,
  OUTCOME_LABEL,
  type InterventionItem,
  type Signal,
  type SignalResult,
  type SignalsPayload,
} from "@/lib/signal-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, SectionIcon } from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function levelVariant(level: Signal["level"]): "warning" | "danger" | "info" {
  if (level === "intervene") return "danger";
  if (level === "attention") return "warning";
  return "info";
}

function outcomeVariant(
  outcome: NonNullable<InterventionItem["review"]>["outcome"]
): "success" | "warning" | "danger" | "default" | "info" {
  if (outcome === "recovered") return "success";
  if (outcome === "partial") return "info";
  if (outcome === "worsened") return "danger";
  if (outcome === "no_change") return "warning";
  return "default";
}

export function SignalsBoard() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subjects = useAppStore((s) => s.subjects);
  const [payload, setPayload] = useState<SignalsPayload | null>(null);
  const [items, setItems] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSignalId, setOpenSignalId] = useState<string | null>(null);
  const [cause, setCause] = useState(CAUSE_PRESETS[0]);
  const [action, setAction] = useState(ACTION_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  const subjectName = useCallback(
    (id: string) => subjects.find((subject) => subject.id === id)?.name ?? id,
    [subjects]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [signals, interventions] = await Promise.all([
        api<SignalsPayload>("/api/signals"),
        api<{ interventions: InterventionItem[] }>("/api/interventions"),
      ]);
      setPayload(signals);
      setItems(interventions.interventions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить сигналы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const classIds = useMemo(
    () => new Set(classGroup.students.map((student) => student.id)),
    [classGroup]
  );

  const classResults = useMemo(() => {
    const results = payload?.results ?? [];
    if (classIds.size === 0) return results;
    return results.filter((result) => classIds.has(result.studentId));
  }, [payload, classIds]);

  const signals = classResults.filter(
    (result): result is SignalResult & { status: "signal"; signal: Signal } =>
      result.status === "signal" && Boolean(result.signal)
  );
  const taken = new Set(items.map((item) => item.intervention.signalId));
  const openSignals = signals.filter((item) => !taken.has(item.signal.id));
  const closedCount = classResults.filter((item) => item.status === "stable").length;
  const inReview = items.filter(
    (item) => item.intervention.status === "active" && !item.review
  ).length;
  const otherOpen = (payload?.results ?? []).filter(
    (result): result is SignalResult & { status: "signal"; signal: Signal } => {
      if (result.status !== "signal" || !result.signal) return false;
      return !classIds.has(result.studentId) && !taken.has(result.signal.id);
    }
  );

  const submit = async (signalId: string) => {
    setSaving(true);
    setError(null);
    try {
      await api("/api/interventions", {
        method: "POST",
        body: JSON.stringify({
          signalId,
          presumedCause: cause.trim(),
          action: action.trim(),
        }),
      });
      setOpenSignalId(null);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Не удалось зафиксировать решение"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="dark" className="overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-rose-500/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-300">
              Не диагноз · сигнал к решению
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {openSignals.length > 0
                ? `${openSignals.length} ${openSignals.length === 1 ? "сигнал ждёт" : "сигналов ждут"} учителя`
                : "Открытых сигналов нет"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Система ловит падение относительно личной нормы ученика. Причину и
              вид работы назначаете вы — и через пару недель смотрите, сдвинулось ли.
            </p>
          </div>
          <div className="flex gap-3">
            <CountChip label="Действовать" value={openSignals.filter((s) => s.signal.level === "intervene").length} />
            <CountChip label="Стабильно" value={closedCount} />
            <CountChip label="В работе" value={inReview} />
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
        <Shield size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm leading-relaxed text-amber-950">
          Падение балла — не приговор и не «диагноз». Это момент, когда учитель
          фиксирует гипотезу и действие. Без этого сигналы так и останутся красными
          цифрами.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {otherOpen.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Ещё {otherOpen.length}{" "}
          {otherOpen.length === 1 ? "сигнал в другом классе" : "сигналов в других классах"} —
          переключите класс в шапке, чтобы разобрать.
        </div>
      )}

      {openSignals.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="mb-3 text-emerald-500" size={28} />
            <p className="font-semibold text-slate-800">
              По этому классу нет необработанных сигналов
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Если журнал ещё тонкий —{" "}
              <Link href="/students" className="font-medium text-brand-600 hover:underline">
                загрузите CSV
              </Link>{" "}
              или закройте несколько уроков. Сигнал появляется, когда есть норма и
              заметное снижение.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {openSignals
            .slice()
            .sort((a, b) => {
              const order = { intervene: 0, attention: 1, watch: 2 };
              return order[a.signal.level] - order[b.signal.level];
            })
            .map((item) => (
              <Card key={item.signal.id} className="!p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">
                        {item.studentName}
                      </p>
                      <Badge variant={levelVariant(item.signal.level)} dot>
                        {LEVEL_LABEL[item.signal.level]}
                      </Badge>
                      {item.signal.classWide && (
                        <Badge variant="default">похоже на весь класс</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {subjectName(item.subjectId)} · норма {formatScore(item.signal.baseline)} → сейчас{" "}
                      {formatScore(item.signal.current)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={openSignalId === item.signal.id ? "secondary" : "primary"}
                    onClick={() =>
                      setOpenSignalId(
                        openSignalId === item.signal.id ? null : item.signal.id
                      )
                    }
                  >
                    <Zap size={14} />
                    {openSignalId === item.signal.id ? "Скрыть" : "Принять решение"}
                  </Button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {item.signal.message}
                </p>
                <ul className="mt-2 space-y-1">
                  {item.signal.reasons.map((reason) => (
                    <li key={reason} className="text-xs leading-relaxed text-slate-500">
                      — {reason}
                    </li>
                  ))}
                </ul>

                {openSignalId === item.signal.id && (
                  <form
                    className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(item.signal.id);
                    }}
                  >
                    <label className="block text-[13px] font-medium text-slate-600">
                      Предполагаемая причина
                      <select
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                        value={CAUSE_PRESETS.includes(cause) ? cause : "__custom"}
                        onChange={(event) => {
                          if (event.target.value === "__custom") {
                            setCause("");
                            return;
                          }
                          setCause(event.target.value);
                        }}
                      >
                        {CAUSE_PRESETS.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                        <option value="__custom">Своя формулировка…</option>
                      </select>
                    </label>
                    {!CAUSE_PRESETS.includes(cause) && (
                      <textarea
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        rows={2}
                        placeholder="Своими словами, без лишних деталей"
                        value={cause}
                        onChange={(event) => setCause(event.target.value)}
                      />
                    )}

                    <label className="block text-[13px] font-medium text-slate-600">
                      Что делаете
                      <select
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                        value={ACTION_PRESETS.includes(action) ? action : "__custom"}
                        onChange={(event) => {
                          if (event.target.value === "__custom") {
                            setAction("");
                            return;
                          }
                          setAction(event.target.value);
                        }}
                      >
                        {ACTION_PRESETS.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                        <option value="__custom">Своё действие…</option>
                      </select>
                    </label>
                    {!ACTION_PRESETS.includes(action) && (
                      <textarea
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        rows={2}
                        value={action}
                        onChange={(event) => setAction(event.target.value)}
                      />
                    )}

                    <Button
                      type="submit"
                      disabled={saving || !cause.trim() || !action.trim()}
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Зафиксировать вмешательство"
                      )}
                    </Button>
                  </form>
                )}
              </Card>
            ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon tone="slate">
              <AlertTriangle size={17} />
            </SectionIcon>
            <CardTitle>Вмешательства и проверка</CardTitle>
          </div>
        </CardHeader>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Пока нет зарегистрированных решений. Сигнал без действия — просто шум.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map(({ intervention, studentName, review }) => (
              <div
                key={intervention.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{studentName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {subjectName(intervention.subjectId)} · {intervention.presumedCause}
                    </p>
                  </div>
                  {review ? (
                    <Badge variant={outcomeVariant(review.outcome)}>
                      {OUTCOME_LABEL[review.outcome]}
                    </Badge>
                  ) : (
                    <Badge>ожидает данные</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  Действие: {intervention.action}
                </p>
                {review && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {review.message}{" "}
                    <span className="text-slate-400">{review.caveat}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
