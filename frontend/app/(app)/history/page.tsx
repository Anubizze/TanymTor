"use client";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppStore, useContextLessons } from "@/store/useAppStore";
import { formatDate } from "@/lib/calculations";

export default function HistoryPage() {
  const lessons = useContextLessons();
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());

  const allLessons = lessons
    .filter((l) => !l.isActive || l.classPercentage > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <Header
        title="История уроков"
        subtitle={`${classGroup.name} · ${subject.name} · все сохранённые результаты`}
      />

      <div className="space-y-4">
        {allLessons.length === 0 ? (
          <Card>
            <p className="text-center text-slate-500 py-8">
              История пуста. Закройте первый урок — и здесь появится след, а не
              обещание.
            </p>
          </Card>
        ) : (
          allLessons.map((lesson) => (
            <Card key={lesson.id} hover>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {lesson.title}
                    </h3>
                    {lesson.isActive && (
                      <Badge variant="success">Активен</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatDate(lesson.date)} · {lesson.stages.length} этапов
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {lesson.classPercentage}%
                  </p>
                  <p className="text-xs text-slate-400">результат класса</p>
                </div>
              </div>

              <div className="mt-4 w-full max-w-md">
                <ProgressBar value={lesson.classPercentage} showLabel />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {lesson.stages.map((stage, i) => {
                  const result = lesson.classStageResults.find(
                    (r) => r.stageId === stage.id
                  );
                  return (
                    <div
                      key={stage.id}
                      className="rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Этап {i + 1}
                      </p>
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {stage.title}
                      </p>
                      <p className="mt-1 text-sm font-bold text-indigo-600">
                        {result?.percentage ?? 0}%
                        <span className="ml-1 text-[10px] font-normal text-slate-400">
                          ({result?.plusCount ?? 0}/
                          {(result?.plusCount ?? 0) + (result?.minusCount ?? 0)})
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Топ-3 и нуждающиеся внимании
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...lesson.studentResults]
                    .filter((r) => r.plusCount + r.minusCount > 0)
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 3)
                    .map((result) => {
                      const student = classGroup.students.find(
                        (s) => s.id === result.studentId
                      );
                      return (
                        <Badge key={result.studentId} variant="success">
                          {student?.name} — {result.percentage}%
                        </Badge>
                      );
                    })}
                  {[...lesson.studentResults]
                    .filter((r) => r.plusCount + r.minusCount > 0)
                    .sort((a, b) => a.percentage - b.percentage)
                    .slice(0, 3)
                    .map((result) => {
                      const student = classGroup.students.find(
                        (s) => s.id === result.studentId
                      );
                      return (
                        <Badge key={result.studentId} variant="danger">
                          {student?.name} — {result.percentage}%
                        </Badge>
                      );
                    })}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
