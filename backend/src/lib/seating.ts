export const SEATS_PER_DESK = 2;

export interface SeatingLayout {
  rows: number;
  columns: number;
  assignments: Record<string, string>;
}

export function seatKey(row: number, column: number, seat: number): string {
  return `${row}:${column}:${seat}`;
}

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

export function defaultSeatingLayout(studentCount: number): SeatingLayout {
  const columns = 3;
  const rows = Math.max(1, Math.ceil(studentCount / (columns * SEATS_PER_DESK)));
  return { rows, columns, assignments: {} };
}

export function fillAlphabetically(
  layout: SeatingLayout,
  students: { id: string; name: string }[]
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

export function seededSeating(
  students: { id: string; name: string }[]
): SeatingLayout {
  return fillAlphabetically(defaultSeatingLayout(students.length), students);
}
