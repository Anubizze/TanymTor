"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { StatCard, StageStat } from "@/components/dashboard/StatCard";
import { ClassTrendChart } from "@/components/dashboard/TrendChart";
import { Card, CardHeader, CardTitle, SectionIcon } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppStore, useContextLessons } from "@/store/useAppStore";
import {
  getClassPreviousPercentage,
  getTrend,
  formatDate,
} from "@/lib/calculations";
import { SignalPulse } from "@/components/signals/SignalPulse";
import { EmptyRoster } from "@/components/roster/EmptyRoster";

import {
  Users,
  BookOpen,
  Target,
  Table2,
  ArrowRight,
  CheckCircle,
  Layers,
  CalendarDays,
} from "lucide-react";

const steps = [
  "Ставите «+ / −» на уроке или грузите журнал",
  "Система считает норму ученика, а не «среднее по больнице»",
  "Падение вне обычного разброса — сигнал, не диагноз",
  "Вы фиксируете причину и действие, через недели — проверка",
];

export default function DashboardPage() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const lessons = useContextLessons();
  const activeLesson = useAppStore((s) => s.getActiveLesson());

  const completedLessons = lessons.filter((l) => !l.isActive);
  const lastLesson = completedLessons.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const prevClassPct = getClassPreviousPercentage(
    lessons.filter((l) => l.id !== activeLesson?.id)
  );
  const currentPct =
    activeLesson?.classPercentage || lastLesson?.classPercentage || 0;
  const classTrend =
    prevClassPct !== null ? getTrend(currentPct, prevClassPct) : "stable";

  const markedCount = activeLesson
    ? activeLesson.studentResults.filter((r) => r.plusCount + r.minusCount > 0)
        .length
    : 0;

  return (
    <div>
      <Header
        title="Обзор"
        subtitle={`${classGroup.name} · ${subject.name} · ${classGroup.students.length} учеников`}
        actions={
          activeLesson ? (
            <Link href="/lesson">
              <Button>
                <Table2 size={16} />
                Перейти к уроку
              </Button>
            </Link>
          ) : (
            <Link href="/lesson">
              <Button variant="success">
                <BookOpen size={16} />
                Начать урок
              </Button>
            </Link>
          )
        }
      />

      {!classGroup.id || classGroup.students.length === 0 ? (
        <div className="mb-6">
          <EmptyRoster />
        </div>
      ) : (
        <SignalPulse />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Учеников в классе"
          value={classGroup.students.length}
          icon={Users}
          tone="brand"
          delay={0}
        />
        <StatCard
          title="Проведено уроков"
          value={completedLessons.length}
          subtitle={activeLesson ? "+ 1 активный" : undefined}
          icon={BookOpen}
          tone="emerald"
          delay={70}
        />
        <StatCard
          title="Результат класса"
          value={`${currentPct}%`}
          trend={prevClassPct !== null ? classTrend : undefined}
          trendChange={
            prevClassPct !== null ? currentPct - prevClassPct : undefined
          }
          icon={Target}
          tone="amber"
          delay={140}
        />
        <StatCard
          title="Отмечено на уроке"
          value={
            activeLesson
              ? `${markedCount}/${classGroup.students.length}`
              : "—"
          }
          subtitle={activeLesson ? "учеников" : "Нет активного урока"}
          icon={CheckCircle}
          tone="violet"
          delay={210}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div
          className="animate-fade-up lg:col-span-2"
          style={{ animationDelay: "260ms" }}
        >
          <ClassTrendChart lessons={lessons} />
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
          <Card variant="dark" className="h-full overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />

            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                Как это работает
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Данные → сигнал → ваше решение
              </h3>

              <ol className="mt-5 space-y-4">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-3.5">
                    <span className="relative flex flex-col items-center">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-[11px] font-bold text-white shadow-lg shadow-brand-500/30">
                        {index + 1}
                      </span>
                      {index < steps.length - 1 && (
                        <span className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-white/25 to-transparent" />
                      )}
                    </span>
                    <p className="pb-1 pt-1 text-sm leading-relaxed text-slate-300">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>
      </div>

      {activeLesson && activeLesson.classPercentage > 0 && (
        <div className="animate-fade-up mt-6" style={{ animationDelay: "380ms" }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon tone="emerald">
                  <Layers size={17} />
                </SectionIcon>
                <CardTitle>Результаты по этапам — текущий урок</CardTitle>
              </div>
              <Badge variant="success" dot>
                Активен
              </Badge>
            </CardHeader>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {activeLesson.stages.map((stage, i) => {
                const result = activeLesson.classStageResults.find(
                  (r) => r.stageId === stage.id
                );
                return (
                  <StageStat
                    key={stage.id}
                    title={`Этап ${i + 1}: ${stage.title}`}
                    percentage={result?.percentage ?? 0}
                    plusCount={result?.plusCount ?? 0}
                    total={(result?.plusCount ?? 0) + (result?.minusCount ?? 0)}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <div className="animate-fade-up mt-6" style={{ animationDelay: "440ms" }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon tone="slate">
                <CalendarDays size={17} />
              </SectionIcon>
              <CardTitle>Последние уроки</CardTitle>
            </div>
            <Link href="/history">
              <Button variant="ghost" size="sm">
                Вся история
                <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>

          {completedLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-12">
              <p className="text-sm font-medium text-slate-500">
                Пока нет завершённых уроков
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {completedLessons
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 5)
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-transparent px-4 py-3 transition-all hover:border-slate-200/80 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {lesson.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDate(lesson.date)}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 sm:w-40">
                      <ProgressBar
                        value={lesson.classPercentage}
                        size="sm"
                        showLabel
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
