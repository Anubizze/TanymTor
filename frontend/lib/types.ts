export type Mark = "+" | "-" | null;

export interface Student {
  id: string;
  name: string;
}

export interface Stage {
  id: string;
  title: string;
  order: number;
}

export interface StageResult {
  stageId: string;
  mark: Mark;
}

export interface StudentLessonResult {
  studentId: string;
  stages: StageResult[];
  plusCount: number;
  minusCount: number;
  percentage: number;
}

export interface StageClassResult {
  stageId: string;
  plusCount: number;
  minusCount: number;
  percentage: number;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Lesson {
  id: string;
  title: string;
  date: string;
  classId: string;
  subjectId: string;
  stages: Stage[];
  studentResults: StudentLessonResult[];
  classStageResults: StageClassResult[];
  classPercentage: number;
  isActive: boolean;
}

export interface ClassGroup {
  id: string;
  name: string;
  students: Student[];
}

/** Схема кабинета: сетка парт на двоих. Ключ места — `ряд:парта:место`. */
export interface SeatingLayout {
  rows: number;
  columns: number;
  assignments: Record<string, string>;
}

export type Trend = "up" | "down" | "stable";

export interface StudentTrend {
  studentId: string;
  currentPercentage: number;
  previousPercentage: number;
  trend: Trend;
  change: number;
}

export interface StageDifficulty {
  stageId: string;
  stageTitle: string;
  failCount: number;
  failRate: number;
  affectedStudents: string[];
}

export interface StudentDifficulty {
  studentId: string;
  studentName: string;
  recurringStages: { stageTitle: string; failCount: number }[];
  trend: Trend;
  currentPercentage: number;
}

export interface AIAnalysis {
  generatedAt: string;
  studentDifficulties: StudentDifficulty[];
  commonDifficulties: StageDifficulty[];
  classTrend: Trend;
  classTrendChange: number;
  recommendations: string[];
  disclaimer: string;
}
