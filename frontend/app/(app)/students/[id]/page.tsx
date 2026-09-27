"use client";

import { use } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StudentTrendChart } from "@/components/dashboard/TrendChart";
import { useAppStore, useContextLessons } from "@/store/useAppStore";
import { formatDate, formatShortDate } from "@/lib/calculations";
import { ArrowLeft } from "lucide-react";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const lessons = useContextLessons();

  const student = classGroup.students.find((s) => s.id === id);

  if (!student) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-slate-600">Ученик не найден</p>
        <Link href="/students" className="mt-4 text-indigo-600 hover:underline">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const lessonData = lessons
    .filter((l) => {
      const r = l.studentResults.find((sr) => sr.studentId === id);
      return r && r.plusCount + r.minusCount > 0;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = lessonData.map((lesson) => {
    const result = lesson.studentResults.find((r) => r.studentId === id)!;
    return {
      name: formatShortDate(lesson.date),
      result: result.percentage,
    };
  });

  const avgPercentage =
    lessonData.length > 0
      ? Math.round(
          lessonData.reduce((sum, lesson) => {
            const r = lesson.studentResults.find((sr) => sr.studentId === id)!;
            return sum + r.percentage;
          }, 0) / lessonData.length
        )
      : 0;

  const stageFails = new Map<string, number>();
  for (const lesson of lessonData) {
    const result = lesson.studentResults.find((r) => r.studentId === id);
    if (!result) continue;
    for (const stage of result.stages) {
      if (stage.mark === "-") {
        const stageTitle =
          lesson.stages.find((s) => s.id === stage.stageId)?.title ??
          stage.stageId;
        stageFails.set(stageTitle, (stageFails.get(stageTitle) ?? 0) + 1);
      }
    }
  }

  return (
    <div>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={16} />
        Все ученики
      </Link>

      <Header
        title={student.name}
        subtitle={`${subject.name} · средний результат ${avgPercentage}% · ${lessonData.length} уроков`}
        showContext={false}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Динамика по урокам</CardTitle>
          </CardHeader>
          <StudentTrendChart data={chartData} studentName={student.name} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Затруднения по этапам</CardTitle>
          </CardHeader>
          {stageFails.size === 0 ? (
            <p className="text-sm text-slate-400">Затруднений не зафиксировано</p>
          ) : (
            <div className="space-y-3">
              {Array.from(stageFails.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([stage, count]) => (
                  <div
                    key={stage}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
                  >
                    <span className="text-sm text-slate-700">{stage}</span>
                    <Badge variant={count >= 2 ? "danger" : "warning"}>
                      {count}× не справился
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>История по урокам</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {lessonData
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .map((lesson) => {
                const result = lesson.studentResults.find(
                  (r) => r.studentId === id
                )!;
                return (
                  <div
                    key={lesson.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {lesson.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(lesson.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500">
                          <span className="font-medium text-emerald-600">
                            {result.plusCount}
                          </span>
                          {" / "}
                          <span className="font-medium text-red-500">
                            {result.minusCount}
                          </span>
                        </span>
                        <div className="w-24">
                          <ProgressBar
                            value={result.percentage}
                            size="sm"
                            showLabel
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.stages.map((stage) => (
                        <span
                          key={stage.stageId}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                            stage.mark === "+"
                              ? "bg-emerald-100 text-emerald-700"
                              : stage.mark === "-"
                                ? "bg-red-100 text-red-600"
                                : "bg-slate-100 text-slate-300"
                          }`}
                          title={
                            lesson.stages.find((s) => s.id === stage.stageId)
                              ?.title
                          }
                        >
                          {stage.mark ?? "·"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
