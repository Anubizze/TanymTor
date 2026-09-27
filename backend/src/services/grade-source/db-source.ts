import { asc, eq, isNotNull } from "drizzle-orm";
import type { Grade, StudentRef, Subject } from "@tanymtor/shared";
import { db } from "../../db/client";
import { grades, students, subjects } from "../../db/schema";
import type { GradeSource } from "./types";

export const dbSource: GradeSource = {
  name: "db",
  description: "Оценки из PostgreSQL (таблица grades).",

  async fetchStudents(): Promise<StudentRef[]> {
    return db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(isNotNull(students.classId))
      .orderBy(asc(students.name));
  },

  async fetchSubjects(): Promise<Subject[]> {
    return db
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .orderBy(asc(subjects.name));
  },

  async fetchGrades(): Promise<Grade[]> {
    return db
      .select({
        id: grades.id,
        studentId: grades.studentId,
        subjectId: grades.subjectId,
        value: grades.value,
        date: grades.date,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .where(isNotNull(students.classId))
      .orderBy(asc(grades.date));
  },
};
