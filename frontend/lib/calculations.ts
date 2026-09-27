import type {
  Lesson,
  Mark,
  Stage,
  StageClassResult,
  StageResult,
  Student,
  StudentLessonResult,
  Trend,
} from "./types";

export function calculatePercentage(plus: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((plus / total) * 100);
}

export function calculateStudentResult(
  studentId: string,
  stages: Stage[],
  marks: Record<string, Mark>
): StudentLessonResult {
  const stageResults: StageResult[] = stages.map((stage) => ({
    stageId: stage.id,
    mark: marks[`${studentId}-${stage.id}`] ?? null,
  }));

  const plusCount = stageResults.filter((s) => s.mark === "+").length;
  const minusCount = stageResults.filter((s) => s.mark === "-").length;
  const gradedCount = plusCount + minusCount;

  return {
    studentId,
    stages: stageResults,
    plusCount,
    minusCount,
    percentage: calculatePercentage(plusCount, gradedCount),
  };
}

export function calculateClassStageResults(
  stages: Stage[],
  students: Student[],
  marks: Record<string, Mark>
): StageClassResult[] {
  return stages.map((stage) => {
    let plusCount = 0;
    let minusCount = 0;

    for (const student of students) {
      const mark = marks[`${student.id}-${stage.id}`];
      if (mark === "+") plusCount++;
      if (mark === "-") minusCount++;
    }

    const total = plusCount + minusCount;
    return {
      stageId: stage.id,
      plusCount,
      minusCount,
      percentage: calculatePercentage(plusCount, total),
    };
  });
}

export function calculateClassPercentage(
  studentResults: StudentLessonResult[]
): number {
  const graded = studentResults.filter(
    (r) => r.plusCount + r.minusCount > 0
  );
  if (graded.length === 0) return 0;
  const sum = graded.reduce((acc, r) => acc + r.percentage, 0);
  return Math.round(sum / graded.length);
}

export function getTrend(current: number, previous: number): Trend {
  const diff = current - previous;
  if (diff > 3) return "up";
  if (diff < -3) return "down";
  return "stable";
}

export function getStudentPreviousPercentage(
  studentId: string,
  lessons: Lesson[]
): number | null {
  const completed = lessons
    .filter((l) => !l.isActive)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const lesson of completed) {
    const result = lesson.studentResults.find((r) => r.studentId === studentId);
    if (result && result.plusCount + result.minusCount > 0) {
      return result.percentage;
    }
  }
  return null;
}

export function getClassPreviousPercentage(lessons: Lesson[]): number | null {
  const completed = lessons
    .filter((l) => !l.isActive)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (completed.length === 0) return null;
  return completed[0].classPercentage;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
