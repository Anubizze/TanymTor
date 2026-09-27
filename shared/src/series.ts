import { mean, round } from "./stats";
import type {
  ClassSubjectSeries,
  Grade,
  StudentSubjectSeries,
  WeeklyPoint,
} from "./types";

export function isoWeekStart(dateISO: string): string {
  const date = new Date(dateISO);
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - (weekday - 1));
  return utc.toISOString().slice(0, 10);
}

export function addDays(dateISO: string, count: number): string {
  const date = new Date(`${dateISO.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function addWeeks(weekStart: string, count: number): string {
  return addDays(weekStart, count * 7);
}

export function buildStudentSeries(grades: Grade[]): StudentSubjectSeries[] {
  const buckets = new Map<string, Map<string, number[]>>();

  for (const grade of grades) {
    const key = `${grade.studentId}::${grade.subjectId}`;
    const week = isoWeekStart(grade.date);
    const weeks = buckets.get(key) ?? new Map<string, number[]>();
    const values = weeks.get(week) ?? [];
    values.push(grade.value);
    weeks.set(week, values);
    buckets.set(key, weeks);
  }

  return Array.from(buckets.entries()).map(([key, weeks]) => {
    const [studentId, subjectId] = key.split("::");
    return { studentId, subjectId, points: toPoints(weeks) };
  });
}

export function buildClassSeries(
  series: StudentSubjectSeries[],
  subjectId: string
): ClassSubjectSeries {
  const weeks = new Map<string, { averages: number[]; gradeCount: number }>();

  for (const studentSeries of series) {
    if (studentSeries.subjectId !== subjectId) continue;
    for (const point of studentSeries.points) {
      const entry = weeks.get(point.weekStart) ?? {
        averages: [],
        gradeCount: 0,
      };
      entry.averages.push(point.average);
      entry.gradeCount += point.gradeCount;
      weeks.set(point.weekStart, entry);
    }
  }

  const points = Array.from(weeks.entries())
    .map(([weekStart, entry]) => ({
      weekStart,
      average: round(mean(entry.averages)),
      gradeCount: entry.gradeCount,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return { subjectId, points };
}

export function buildClassSeriesBySubject(
  series: StudentSubjectSeries[]
): Map<string, ClassSubjectSeries> {
  const subjectIds = Array.from(new Set(series.map((s) => s.subjectId)));
  return new Map(
    subjectIds.map((subjectId) => [
      subjectId,
      buildClassSeries(series, subjectId),
    ])
  );
}

export function pointAt(
  points: WeeklyPoint[],
  weekStart: string
): WeeklyPoint | undefined {
  return points.find((point) => point.weekStart === weekStart);
}

function toPoints(weeks: Map<string, number[]>): WeeklyPoint[] {
  return Array.from(weeks.entries())
    .map(([weekStart, values]) => ({
      weekStart,
      average: round(mean(values)),
      gradeCount: values.length,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
