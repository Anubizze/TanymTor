"use client";

import { useAppStore, useContextLessons } from "@/store/useAppStore";
import { MarkButton } from "./MarkButton";
import { ProgressBar, TrendIndicator } from "@/components/ui/ProgressBar";
import { getStudentPreviousPercentage, getTrend } from "@/lib/calculations";
import type { Student } from "@/lib/types";
import { CalendarPlus } from "lucide-react";

interface LessonMatrixProps {
  students: Student[];
}

export function LessonMatrix({ students }: LessonMatrixProps) {
  const activeLesson = useAppStore((s) => s.getActiveLesson());
  const lessons = useContextLessons();
  const toggleMark = useAppStore((s) => s.toggleMark);

  if (!activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 py-20 backdrop-blur-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
          <CalendarPlus size={26} />
        </div>
        <p className="text-lg font-semibold text-slate-700">Нет активного урока</p>
        <p className="mt-1 text-sm text-slate-400">
          Начните новый урок, чтобы отмечать результаты
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_10px_28px_-14px_rgb(15_23_42/0.16)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur">
                Ученик
              </th>
              {activeLesson.stages.map((stage, i) => (
                <th
                  key={stage.id}
                  className="border-b border-slate-200 bg-slate-50/95 px-2 py-3.5 text-center text-xs font-semibold text-slate-600"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-500">
                      Этап {i + 1}
                    </span>
                    <span className="max-w-[110px] text-[12px] font-medium leading-tight text-slate-600">
                      {stage.title}
                    </span>
                  </div>
                </th>
              ))}
              <th className="border-b border-slate-200 bg-slate-50/95 px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Результат
              </th>
              <th className="border-b border-slate-200 bg-slate-50/95 px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                +/−
              </th>
              <th className="border-b border-slate-200 bg-slate-50/95 px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Динамика
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, rowIndex) => {
              const result = activeLesson.studentResults.find(
                (r) => r.studentId === student.id
              );
              const prevPct = getStudentPreviousPercentage(
                student.id,
                lessons.filter((l) => l.id !== activeLesson.id)
              );
              const trend =
                prevPct !== null && result
                  ? getTrend(result.percentage, prevPct)
                  : "stable";

              return (
                <tr key={student.id} className="group bg-white transition-colors hover:bg-brand-50/40">
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors group-hover:bg-brand-50/40">
                    <span className="mr-2.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-500">
                      {rowIndex + 1}
                    </span>
                    {student.name}
                  </td>

                  {activeLesson.stages.map((stage) => {
                    const stageResult = result?.stages.find(
                      (s) => s.stageId === stage.id
                    );
                    const currentMark = stageResult?.mark ?? null;

                    return (
                      <td key={stage.id} className="border-b border-slate-100 px-2 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <MarkButton
                            mark="+"
                            active={currentMark === "+"}
                            onClick={() => toggleMark(student.id, stage.id, "+")}
                          />
                          <MarkButton
                            mark="-"
                            active={currentMark === "-"}
                            onClick={() => toggleMark(student.id, stage.id, "-")}
                          />
                        </div>
                      </td>
                    );
                  })}

                  <td className="border-b border-slate-100 px-4 py-2">
                    <div className="w-28">
                      <ProgressBar
                        value={result?.percentage ?? 0}
                        size="sm"
                        showLabel
                      />
                    </div>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-2 text-center text-sm tabular-nums">
                    <span className="font-semibold text-emerald-600">
                      {result?.plusCount ?? 0}
                    </span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="font-semibold text-rose-500">
                      {result?.minusCount ?? 0}
                    </span>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-2 text-center">
                    {prevPct !== null ? (
                      <TrendIndicator
                        trend={trend}
                        change={result ? result.percentage - prevPct : undefined}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 bg-gradient-to-r from-brand-50 to-brand-50/80 px-4 py-3.5 text-sm font-bold text-brand-900">
                Класс
              </td>
              {activeLesson.classStageResults.map((stageResult) => (
                <td
                  key={stageResult.stageId}
                  className="bg-brand-50/60 px-2 py-3.5 text-center"
                >
                  <div className="text-sm font-bold tabular-nums text-brand-700">
                    {stageResult.percentage}%
                  </div>
                  <div className="text-[10px] tabular-nums text-brand-500/80">
                    {stageResult.plusCount}/
                    {stageResult.plusCount + stageResult.minusCount}
                  </div>
                </td>
              ))}
              <td className="bg-brand-50/60 px-4 py-3.5">
                <div className="w-28">
                  <ProgressBar
                    value={activeLesson.classPercentage}
                    size="sm"
                    showLabel
                  />
                </div>
              </td>
              <td
                colSpan={2}
                className="bg-brand-50/60 px-4 py-3.5 text-center text-sm font-bold tabular-nums text-brand-700"
              >
                Общий: {activeLesson.classPercentage}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
