import type { SeatingLayout, Student } from "./types";

export const SEATS_PER_DESK = 2;

export type HeatBand = "high" | "mid" | "low" | "empty";

export function seatKey(row: number, column: number, seat: number): string {
  return `${row}:${column}:${seat}`;
}

/** Все места: слева направо, от доски к задним партам. */
export function listSeats(layout: SeatingLayout): string[] {
  const keys: string[] = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let column = 0; column < layout.columns; column++) {
      for (let seat = 0; seat < SEATS_PER_DESK; seat++) {
        keys.push(seatKey(row, column, seat));
      }
    }
  }
  return keys;
}

/**
 * Сетка по умолчанию: три парты в ряду,
 * рядов столько, чтобы хватило мест всем.
 */
export function defaultSeatingLayout(studentCount: number): SeatingLayout {
  const columns = 3;
  const rows = Math.max(1, Math.ceil(studentCount / (columns * SEATS_PER_DESK)));
  return { rows, columns, assignments: {} };
}

export function pruneLayout(
  layout: SeatingLayout,
  studentIds: Set<string>
): SeatingLayout {
  const valid = new Set(listSeats(layout));
  const assignments: Record<string, string> = {};

  for (const [key, studentId] of Object.entries(layout.assignments)) {
    if (valid.has(key) && studentIds.has(studentId)) {
      assignments[key] = studentId;
    }
  }

  return { ...layout, assignments };
}

export function fillAlphabetically(
  layout: SeatingLayout,
  students: Student[]
): SeatingLayout {
  const ordered = [...students].sort((a, b) =>
    a.name.localeCompare(b.name, "ru")
  );
  const seats = listSeats(layout);
  const assignments: Record<string, string> = {};

  ordered.slice(0, seats.length).forEach((student, index) => {
    assignments[seats[index]] = student.id;
  });

  return { ...layout, assignments };
}

export function seededSeating(students: Student[]): SeatingLayout {
  return fillAlphabetically(defaultSeatingLayout(students.length), students);
}

export function shortName(name: string): string {
  const [last, first] = name.split(" ");
  return first ? `${last} ${first[0]}.` : last;
}

export function nameParts(name: string): { last: string; initial: string } {
  const [last, first] = name.split(" ");
  return { last, initial: first ? `${first[0]}.` : "" };
}

export function heatBand(percentage: number | null): HeatBand {
  if (percentage === null) return "empty";
  if (percentage >= 80) return "high";
  if (percentage >= 60) return "mid";
  return "low";
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function scoresInRow(
  layout: SeatingLayout,
  row: number,
  percentageByStudent: Map<string, number | null>
): number[] {
  const scores: number[] = [];
  for (let column = 0; column < layout.columns; column++) {
    for (let seat = 0; seat < SEATS_PER_DESK; seat++) {
      const studentId = layout.assignments[seatKey(row, column, seat)];
      const percentage = studentId
        ? percentageByStudent.get(studentId)
        : null;
      if (typeof percentage === "number") scores.push(percentage);
    }
  }
  return scores;
}

export function scoresInDesk(
  layout: SeatingLayout,
  column: number,
  percentageByStudent: Map<string, number | null>
): number[] {
  const scores: number[] = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let seat = 0; seat < SEATS_PER_DESK; seat++) {
      const studentId = layout.assignments[seatKey(row, column, seat)];
      const percentage = studentId
        ? percentageByStudent.get(studentId)
        : null;
      if (typeof percentage === "number") scores.push(percentage);
    }
  }
  return scores;
}

/** Ученики в порядке мест; кто без места — в конце по алфавиту. */
export function studentsInSeatOrder(
  students: Student[],
  layout: SeatingLayout
): Student[] {
  const byId = new Map(students.map((student) => [student.id, student]));
  const seen = new Set<string>();
  const ordered: Student[] = [];

  for (const key of listSeats(layout)) {
    const studentId = layout.assignments[key];
    const student = studentId ? byId.get(studentId) : undefined;
    if (student && !seen.has(student.id)) {
      ordered.push(student);
      seen.add(student.id);
    }
  }

  const rest = students
    .filter((student) => !seen.has(student.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return [...ordered, ...rest];
}
