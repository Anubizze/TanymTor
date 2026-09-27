import type { LessonPayload, Mark, Stage } from "../db/schema";

export function calculatePercentage(plus: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((plus / total) * 100);
}

export function rebuildPayload(
  stages: Stage[],
  students: { id: string }[],
  marks: Record<string, Mark>
): LessonPayload {
  const studentResults = students.map((student) => {
    const stageResults = stages.map((stage) => ({
      stageId: stage.id,
      mark: marks[`${student.id}-${stage.id}`] ?? null,
    }));
    const plusCount = stageResults.filter((item) => item.mark === "+").length;
    const minusCount = stageResults.filter((item) => item.mark === "-").length;
    return {
      studentId: student.id,
      stages: stageResults,
      plusCount,
      minusCount,
      percentage: calculatePercentage(plusCount, plusCount + minusCount),
    };
  });

  const classStageResults = stages.map((stage) => {
    let plusCount = 0;
    let minusCount = 0;
    for (const student of students) {
      const mark = marks[`${student.id}-${stage.id}`];
      if (mark === "+") plusCount++;
      if (mark === "-") minusCount++;
    }
    return {
      stageId: stage.id,
      plusCount,
      minusCount,
      percentage: calculatePercentage(plusCount, plusCount + minusCount),
    };
  });

  const avg =
    studentResults.length === 0
      ? 0
      : Math.round(
          studentResults.reduce((sum, result) => sum + result.percentage, 0) /
            studentResults.length
        );

  return {
    stages,
    studentResults,
    classStageResults,
    classPercentage: avg,
  };
}

export function marksFromPayload(payload: LessonPayload): Record<string, Mark> {
  const marks: Record<string, Mark> = {};
  for (const result of payload.studentResults) {
    for (const stage of result.stages) {
      marks[`${result.studentId}-${stage.stageId}`] = stage.mark;
    }
  }
  return marks;
}

/** Процент урока в 10-балльную оценку. */
export function percentageToGrade(percentage: number): number {
  return Math.max(1, Math.round(percentage) / 10);
}
