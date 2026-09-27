"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar, TrendIndicator } from "@/components/ui/ProgressBar";
import { ClassSetup } from "@/components/roster/ClassSetup";
import { useAppStore, useContextLessons } from "@/store/useAppStore";
import {
  getStudentPreviousPercentage,
  getTrend,
} from "@/lib/calculations";
import { ChevronRight, Trash2 } from "lucide-react";

export default function StudentsPage() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const lessons = useContextLessons();
  const activeLesson = useAppStore((s) => s.getActiveLesson());
  const removeStudent = useAppStore((s) => s.removeStudent);

  const studentsWithData = classGroup.students.map((student) => {
    const activeResult = activeLesson?.studentResults.find(
      (r) => r.studentId === student.id
    );
    const prevPct = getStudentPreviousPercentage(
      student.id,
      lessons.filter((l) => l.id !== activeLesson?.id)
    );

    const allResults = lessons
      .filter((l) => !l.isActive || l.id === activeLesson?.id)
      .map((lesson) => {
        const r = lesson.studentResults.find(
          (sr) => sr.studentId === student.id
        );
        return r && r.plusCount + r.minusCount > 0 ? r.percentage : null;
      })
      .filter((p): p is number => p !== null);

    const currentPct =
      activeResult && activeResult.plusCount + activeResult.minusCount > 0
        ? activeResult.percentage
        : (allResults[allResults.length - 1] ?? 0);

    const trend =
      prevPct !== null ? getTrend(currentPct, prevPct) : "stable";

    const avgPct =
      allResults.length > 0
        ? Math.round(allResults.reduce((a, b) => a + b, 0) / allResults.length)
        : 0;

    return {
      ...student,
      currentPct,
      avgPct,
      trend,
      trendChange: prevPct !== null ? currentPct - prevPct : 0,
      lessonsCount: allResults.length,
    };
  });

  studentsWithData.sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return (
    <div>
      <Header
        title="Класс"
        subtitle={
          classGroup.id
            ? `${classGroup.name} · ${subject.name} · ${classGroup.students.length} учеников`
            : "Соберите журнал: класс, ученики, CSV"
        }
      />

      <div className="mb-6">
        <ClassSetup />
      </div>

      {classGroup.id && studentsWithData.length === 0 && (
        <Card className="mb-6">
          <p className="py-6 text-center text-sm text-slate-500">
            В {classGroup.name} пока никого нет. Добавьте ФИО или загрузите CSV —
            без учеников нечему ставить плюсы и некого ловить сигналом.
          </p>
        </Card>
      )}

      <div className="grid gap-3">
        {studentsWithData.map((student, i) => (
          <Card key={student.id} hover className="!p-4">
            <div className="flex items-center gap-4">
              <Link href={`/students/${student.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{student.name}</p>
                  <p className="text-xs text-slate-400">
                    {student.lessonsCount} уроков · средний {student.avgPct}%
                  </p>
                </div>
                <div className="hidden items-center gap-4 sm:flex">
                  <div className="w-28">
                    <ProgressBar
                      value={student.currentPct}
                      size="sm"
                      showLabel
                    />
                  </div>
                  <TrendIndicator
                    trend={student.trend}
                    change={student.trendChange}
                    size="sm"
                  />
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                title="Убрать из класса"
                onClick={() => {
                  if (confirm(`Удалить ${student.name} из класса?`)) {
                    void removeStudent(student.id);
                  }
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
