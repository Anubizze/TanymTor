import {
  addDays,
  addWeeks,
  isoWeekStart,
  type Grade,
  type StudentRef,
  type Subject,
} from "@tanymtor/shared";

export const DEMO_SUBJECT: Subject = { id: "math", name: "Математика" };

export const DEMO_STUDENTS: StudentRef[] = [
  { id: "7a-1", name: "Алиева Айгерим" },
  { id: "7a-2", name: "Бекенов Арман" },
  { id: "7a-15", name: "Кенжебаев Дастан" },
  { id: "7a-8", name: "Тлеуберген Мадина" },
];

const WEEK_COUNT = 14;

const DAY_OFFSETS = [0, 2, 4, 1, 3];

const WEEKLY_GRADES: Record<string, number[][]> = {
  "7a-1": [
    [8, 8, 8],
    [9, 8, 8],
    [8, 8, 9],
    [8, 9, 8],
    [8, 8, 8],
    [9, 8, 8],
    [8, 8, 8],
    [8, 9, 8],
    [8, 8, 8],
    [9, 8, 8],
    [8, 8, 8],
    [8, 8, 9],
    [8, 8, 8],
    [8, 8, 8],
  ],
  "7a-2": [
    [6, 6, 6],
    [6, 7, 6],
    [6, 6, 7],
    [6, 6, 6],
    [7, 6, 6],
    [6, 7, 6],
    [7, 6, 7],
    [7, 7, 6],
    [7, 7, 7],
    [7, 8, 7],
    [7, 7, 8],
    [8, 7, 7],
    [8, 7, 8],
    [8, 7, 8],
  ],
  "7a-15": [
    [8, 7, 8],
    [7, 8, 7],
    [8, 7, 7],
    [7, 8, 8],
    [8, 7, 7],
    [7, 7, 8],
    [8, 8, 7],
    [7, 7, 7],
    [6, 6, 6],
    [6, 6, 6, 5],
    [6, 7, 6, 7, 6],
    [7, 7, 7],
    [7, 8, 7],
    [8, 7, 7, 8],
  ],
  "7a-8": [
    [6, 7, 6],
    [6, 6, 7],
    [7, 6, 6],
    [6, 6, 6],
    [6, 7, 6],
    [7, 6, 7],
    [6, 6, 7],
    [6, 7, 6],
    [6, 6, 6],
    [6, 7, 6],
    [6, 6, 6],
    [6, 7, 6],
    [6, 6, 6],
    [6, 6, 5],
  ],
};

export function buildDemoGrades(now: Date = new Date()): Grade[] {
  const currentWeek = isoWeekStart(now.toISOString());
  const grades: Grade[] = [];

  for (const student of DEMO_STUDENTS) {
    const weeks = WEEKLY_GRADES[student.id] ?? [];

    weeks.forEach((values, weekIndex) => {
      const weekStart = addWeeks(currentWeek, weekIndex - (WEEK_COUNT - 1));

      values.forEach((value, gradeIndex) => {
        const offset = DAY_OFFSETS[gradeIndex % DAY_OFFSETS.length];
        grades.push({
          id: `${student.id}-${weekStart}-${gradeIndex}`,
          studentId: student.id,
          subjectId: DEMO_SUBJECT.id,
          value,
          date: addDays(weekStart, offset),
        });
      });
    });
  }

  return grades.sort((a, b) => a.date.localeCompare(b.date));
}
