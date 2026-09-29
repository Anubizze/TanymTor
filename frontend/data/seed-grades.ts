import { SEED_CLASSES } from "./seed";
import { addDays, addWeeks, isoWeekStart, type Grade } from "../../shared/src";

// Synthetic history for the local demo: enough observations to show signals.
export function buildLocalDemoGrades(): Grade[] {
  const currentWeek = isoWeekStart(new Date().toISOString());
  return SEED_CLASSES.flatMap((group) => group.students.flatMap((student, index) =>
    Array.from({ length: 8 }, (_, week) => [0, 2, 4].map((day) => ({
      id: `demo-${student.id}-${week}-${day}`,
      studentId: student.id,
      subjectId: "math",
      date: addDays(addWeeks(currentWeek, week - 8), day),
      value: index % 7 === 0 && week >= 6 ? 4 : 7 + ((index + week + day) % 3),
    }))).flat()
  ));
}
