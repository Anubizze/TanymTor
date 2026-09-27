import type { ClassSubjectSeries, Grade, StudentSubjectSeries, WeeklyPoint } from "./types";
export declare function isoWeekStart(dateISO: string): string;
export declare function addDays(dateISO: string, count: number): string;
export declare function addWeeks(weekStart: string, count: number): string;
export declare function buildStudentSeries(grades: Grade[]): StudentSubjectSeries[];
export declare function buildClassSeries(series: StudentSubjectSeries[], subjectId: string): ClassSubjectSeries;
export declare function buildClassSeriesBySubject(series: StudentSubjectSeries[]): Map<string, ClassSubjectSeries>;
export declare function pointAt(points: WeeklyPoint[], weekStart: string): WeeklyPoint | undefined;
//# sourceMappingURL=series.d.ts.map