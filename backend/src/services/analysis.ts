import {
  buildClassSeriesBySubject,
  buildStudentSeries,
  evaluateStudentSubject,
  type ClassSubjectSeries,
  type Grade,
  type SignalEvaluation,
  type StudentRef,
  type StudentSubjectSeries,
  type Subject,
} from "@tanymtor/shared";
import { getGradeSource, type GradeSource } from "./grade-source";
import { studentIdsForTeacher } from "./scope";

export interface AnalysisSnapshot {
  source: GradeSource;
  students: StudentRef[];
  subjects: Subject[];
  grades: Grade[];
  series: StudentSubjectSeries[];
  classSeriesBySubject: Map<string, ClassSubjectSeries>;
}

export async function loadAnalysis(
  teacherId?: string
): Promise<AnalysisSnapshot> {
  const source = getGradeSource();
  let [students, subjects, grades] = await Promise.all([
    source.fetchStudents(),
    source.fetchSubjects(),
    source.fetchGrades(),
  ]);

  if (teacherId) {
    const allowed = await studentIdsForTeacher(teacherId);
    students = students.filter((student) => allowed.has(student.id));
    grades = grades.filter((grade) => allowed.has(grade.studentId));
    const subjectIds = new Set(grades.map((grade) => grade.subjectId));
    subjects = subjects.filter((subject) => subjectIds.has(subject.id));
  }

  const series = buildStudentSeries(grades);

  return {
    source,
    students,
    subjects,
    grades,
    series,
    classSeriesBySubject: buildClassSeriesBySubject(series),
  };
}

export function evaluateSnapshot(
  snapshot: AnalysisSnapshot
): SignalEvaluation[] {
  return snapshot.series.map((series) =>
    evaluateStudentSubject(
      series,
      snapshot.classSeriesBySubject.get(series.subjectId)
    )
  );
}

export function findSeries(
  series: StudentSubjectSeries[],
  studentId: string,
  subjectId: string
): StudentSubjectSeries | undefined {
  return series.find(
    (item) => item.studentId === studentId && item.subjectId === subjectId
  );
}

export function isSignal(
  evaluation: SignalEvaluation
): evaluation is Extract<SignalEvaluation, { status: "signal" }> {
  return evaluation.status === "signal";
}
