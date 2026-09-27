import type { Grade, StudentRef, Subject } from "@tanymtor/shared";

export interface GradeSource {
  name: string;
  description: string;
  fetchStudents(): Promise<StudentRef[]>;
  fetchSubjects(): Promise<Subject[]>;
  fetchGrades(): Promise<Grade[]>;
}
