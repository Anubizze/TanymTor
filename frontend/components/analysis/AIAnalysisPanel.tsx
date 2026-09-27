"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, SectionIcon } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendIndicator } from "@/components/ui/ProgressBar";
import { generateAIAnalysis } from "@/lib/ai-analysis";
import { useAppStore, useContextLessons } from "@/store/useAppStore";
import { Brain, AlertTriangle, Users, Lightbulb, Shield } from "lucide-react";

export function AIAnalysisPanel() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const lessons = useContextLessons();

  const analysis = useMemo(
    () => generateAIAnalysis(classGroup, lessons),
    [classGroup, lessons]
  );

  return (
    <div className="space-y-6">
      <Card variant="dark" className="animate-fade-up overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 animate-float rounded-full bg-brand-500/30 blur-3xl" />
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />

        <div className="relative flex flex-wrap items-start gap-5">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 text-white shadow-lg shadow-brand-500/40">
            <Brain size={26} />
            <span className="absolute -inset-1 -z-10 rounded-2xl bg-brand-500/40 blur-lg" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              Автоматический анализ
            </p>
            <h2 className="mt-1.5 text-xl font-semibold text-white">
              Разбор по этапам урока
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Где класс просел на «−», кого уже второй раз клинит на одном шаге.
              Журнальные сигналы — отдельным контуром выше.
            </p>

            <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 backdrop-blur-sm">
              <span className="text-sm text-slate-300">Тренд класса</span>
              <TrendIndicator
                trend={analysis.classTrend}
                change={analysis.classTrendChange}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="animate-fade-up flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/40 p-4">
        <Shield size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm leading-relaxed text-amber-900">
          {analysis.disclaimer}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-fade-up">
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon tone="amber">
                <AlertTriangle size={17} />
              </SectionIcon>
              <CardTitle>Затруднения учеников</CardTitle>
            </div>
          </CardHeader>

          {analysis.studentDifficulties.length === 0 ? (
            <EmptyNote text="Повторяющихся затруднений не обнаружено" />
          ) : (
            <div className="space-y-3">
              {analysis.studentDifficulties.map((student) => (
                <div
                  key={student.studentId}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors hover:border-brand-200 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      {student.studentName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-slate-700">
                        {student.currentPercentage}%
                      </span>
                      <TrendIndicator trend={student.trend} size="sm" />
                    </div>
                  </div>
                  {student.recurringStages.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {student.recurringStages.map((stage) => (
                        <Badge key={stage.stageTitle} variant="warning">
                          {stage.stageTitle} ({stage.failCount}×)
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="animate-fade-up">
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon tone="rose">
                <Users size={17} />
              </SectionIcon>
              <CardTitle>Общие затруднения</CardTitle>
            </div>
          </CardHeader>

          {analysis.commonDifficulties.length === 0 ? (
            <EmptyNote text="Общих проблемных этапов не выявлено" />
          ) : (
            <div className="space-y-3">
              {analysis.commonDifficulties.map((stage) => (
                <div
                  key={stage.stageTitle}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors hover:border-rose-200 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      {stage.stageTitle}
                    </p>
                    <Badge variant="danger">{stage.failRate}% неуспех</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Затруднились: {stage.affectedStudents.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="animate-fade-up">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon tone="brand">
              <Lightbulb size={17} />
            </SectionIcon>
            <CardTitle>Рекомендации</CardTitle>
          </div>
        </CardHeader>

        <ul className="space-y-2.5">
          {analysis.recommendations.map((rec, i) => (
            <li
              key={i}
              className="flex items-start gap-3.5 rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-white p-4 text-sm leading-relaxed text-slate-700"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-[11px] font-bold text-white shadow-sm">
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}
