import type {
  AIAnalysis,
  ClassGroup,
  Lesson,
  StudentDifficulty,
  StageDifficulty,
  Trend,
} from "./types";
import { getTrend } from "./calculations";

export function generateAIAnalysis(
  classGroup: ClassGroup,
  lessons: Lesson[]
): AIAnalysis {
  const completedLessons = lessons
    .filter((l) => !l.isActive && l.studentResults.some((r) => r.plusCount + r.minusCount > 0))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeLesson = lessons.find((l) => l.isActive);
  const allLessons = activeLesson
    ? [activeLesson, ...completedLessons]
    : completedLessons;

  const studentDifficulties = analyzeStudentDifficulties(classGroup, allLessons);
  const commonDifficulties = analyzeCommonDifficulties(classGroup, allLessons);
  const { trend, change } = analyzeClassTrend(allLessons);
  const recommendations = buildRecommendations(
    studentDifficulties,
    commonDifficulties,
    trend
  );

  return {
    generatedAt: new Date().toISOString(),
    studentDifficulties,
    commonDifficulties,
    classTrend: trend,
    classTrendChange: change,
    recommendations,
    disclaimer:
      "ИИ анализирует сохранённые данные и не выставляет оценки. Педагогическое решение остаётся за учителем.",
  };
}

function analyzeStudentDifficulties(
  classGroup: ClassGroup,
  lessons: Lesson[]
): StudentDifficulty[] {
  const stageMap = new Map<string, string>();

  for (const lesson of lessons) {
    for (const stage of lesson.stages) {
      stageMap.set(stage.id, stage.title);
    }
  }

  return classGroup.students
    .map((student) => {
      const stageFails = new Map<string, number>();

      for (const lesson of lessons) {
        const result = lesson.studentResults.find(
          (r) => r.studentId === student.id
        );
        if (!result) continue;

        for (const stage of result.stages) {
          if (stage.mark === "-") {
            const title = stageMap.get(stage.stageId) ?? stage.stageId;
            stageFails.set(title, (stageFails.get(title) ?? 0) + 1);
          }
        }
      }

      const recurringStages = Array.from(stageFails.entries())
        .filter(([, count]) => count >= 2)
        .map(([stageTitle, failCount]) => ({ stageTitle, failCount }))
        .sort((a, b) => b.failCount - a.failCount);

      const percentages = lessons
        .map((lesson) => {
          const r = lesson.studentResults.find(
            (sr) => sr.studentId === student.id
          );
          return r && r.plusCount + r.minusCount > 0 ? r.percentage : null;
        })
        .filter((p): p is number => p !== null);

      const current = percentages[0] ?? 0;
      const previous = percentages[1] ?? current;

      return {
        studentId: student.id,
        studentName: student.name,
        recurringStages,
        trend: getTrend(current, previous),
        currentPercentage: current,
      };
    })
    .filter(
      (s) => s.recurringStages.length > 0 || s.trend !== "stable"
    )
    .sort((a, b) => {
      const aScore = a.recurringStages.length * 10 + (a.trend === "down" ? 5 : 0);
      const bScore = b.recurringStages.length * 10 + (b.trend === "down" ? 5 : 0);
      return bScore - aScore;
    });
}

function analyzeCommonDifficulties(
  classGroup: ClassGroup,
  lessons: Lesson[]
): StageDifficulty[] {
  const stageData = new Map<
    string,
    { title: string; fails: number; total: number; students: Set<string> }
  >();

  for (const lesson of lessons) {
    for (const stage of lesson.stages) {
      if (!stageData.has(stage.id)) {
        stageData.set(stage.id, {
          title: stage.title,
          fails: 0,
          total: 0,
          students: new Set(),
        });
      }
    }

    for (const result of lesson.studentResults) {
      for (const stage of result.stages) {
        const data = stageData.get(stage.stageId);
        if (!data || stage.mark === null) continue;
        data.total++;
        if (stage.mark === "-") {
          data.fails++;
          data.students.add(result.studentId);
        }
      }
    }
  }

  return Array.from(stageData.entries())
    .map(([, data]) => ({
      stageId: "",
      stageTitle: data.title,
      failCount: data.fails,
      failRate: data.total > 0 ? Math.round((data.fails / data.total) * 100) : 0,
      affectedStudents: Array.from(data.students).map(
        (id) => classGroup.students.find((s) => s.id === id)?.name ?? id
      ),
    }))
    .filter((s) => s.failCount >= 2)
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5);
}

function analyzeClassTrend(lessons: Lesson[]): {
  trend: Trend;
  change: number;
} {
  const percentages = lessons
    .filter((l) => l.classPercentage > 0)
    .map((l) => l.classPercentage);

  if (percentages.length < 2) {
    return { trend: "stable", change: 0 };
  }

  const current = percentages[0];
  const previous = percentages[1];
  return {
    trend: getTrend(current, previous),
    change: current - previous,
  };
}

function buildRecommendations(
  studentDifficulties: StudentDifficulty[],
  commonDifficulties: StageDifficulty[],
  classTrend: Trend
): string[] {
  const recs: string[] = [];

  const declining = studentDifficulties.filter((s) => s.trend === "down");
  if (declining.length > 0) {
    recs.push(
      `Обратите внимание на снижение результата у ${declining.map((s) => s.studentName).join(", ")}. Рекомендуется индивидуальная работа.`
    );
  }

  if (commonDifficulties.length > 0) {
    const top = commonDifficulties[0];
    recs.push(
      `Этап «${top.stageTitle}» вызывает затруднения у ${top.affectedStudents.length} учеников (${top.failRate}% неуспешных попыток). Стоит повторить материал на следующем уроке.`
    );
  }

  const withRecurring = studentDifficulties.filter(
    (s) => s.recurringStages.length > 0
  );
  if (withRecurring.length > 0) {
    const names = withRecurring.slice(0, 3).map((s) => {
      const stages = s.recurringStages.map((r) => r.stageTitle).join(", ");
      return `${s.studentName} (${stages})`;
    });
    recs.push(`Повторяющиеся затруднения: ${names.join("; ")}.`);
  }

  if (classTrend === "up") {
    recs.push(
      "Общий результат класса растёт — текущая методика работает эффективно."
    );
  } else if (classTrend === "down") {
    recs.push(
      "Общий результат класса снижается — рассмотрите изменение подхода к сложным этапам."
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Серьёзных отклонений не обнаружено. Продолжайте текущую работу."
    );
  }

  return recs;
}
