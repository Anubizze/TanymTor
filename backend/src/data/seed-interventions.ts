import {
  createIntervention,
  evaluateGrades,
  isoWeekStart,
} from "@tanymtor/shared";
import type { Grade } from "@tanymtor/shared";
import { isSignal } from "../services/analysis";
import { interventionStore } from "../store/interventions";

const DEMO_STUDENT_ID = "7a-15";

/**
 * Заводит показательное вмешательство по первому сигналу уровня "intervene",
 * чтобы на демо-данных был виден полный цикл вплоть до проверки результата.
 */
export async function seedDemoInterventions(grades: Grade[]): Promise<void> {
  const weeks = Array.from(
    new Set(grades.map((grade) => isoWeekStart(grade.date)))
  ).sort();

  for (const week of weeks) {
    const upToWeek = grades.filter((grade) => isoWeekStart(grade.date) <= week);
    const found = evaluateGrades(upToWeek)
      .filter(isSignal)
      .find(
        (evaluation) =>
          evaluation.studentId === DEMO_STUDENT_ID &&
          evaluation.signal.level === "intervene"
      );

    if (!found) continue;
    if (await interventionStore.findBySignal(found.signal.id)) return;

    await interventionStore.add(
      createIntervention({
        id: await interventionStore.nextId(),
        signal: found.signal,
        teacherId: "demo-teacher",
        presumedCause:
          "Пропуски занятий по болезни, тема «Линейные уравнения» отработана самостоятельно",
        action:
          "Индивидуальные консультации два раза в неделю и повторная отработка темы",
      })
    );
    return;
  }
}
