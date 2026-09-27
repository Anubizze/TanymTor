import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  DEMO_ADMIN,
  DEMO_TEACHER,
  SEED_CLASSES,
  SEED_SUBJECTS,
  buildSeedLessons,
  buildSeedSeating,
} from "../data/classroom";
import { buildDemoGrades } from "../data/demo-grades";
import { percentageToGrade } from "../services/lesson-results";
import { db } from "./client";
import {
  classes,
  grades,
  interventions,
  lessons,
  seating,
  students,
  subjects,
  teachers,
  type ClassroomLesson,
} from "./schema";

export interface SeedResult {
  seeded: boolean;
  teacherCount: number;
  classCount: number;
  lessonCount: number;
  gradeCount: number;
}

function asDateString(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function lessonRow(lesson: ClassroomLesson) {
  return {
    id: lesson.id,
    classId: lesson.classId,
    subjectId: lesson.subjectId,
    title: lesson.title,
    date: lesson.date,
    isActive: lesson.isActive,
    payload: {
      stages: lesson.stages,
      studentResults: lesson.studentResults,
      classStageResults: lesson.classStageResults,
      classPercentage: lesson.classPercentage,
    },
  };
}

function gradesFromLessons(items: ClassroomLesson[]) {
  return items.flatMap((lesson) => {
    if (lesson.isActive) return [];
    return lesson.studentResults
      .filter((result) => result.plusCount + result.minusCount > 0)
      .map((result) => ({
        id: `lesson-${lesson.id}-${result.studentId}`,
        studentId: result.studentId,
        subjectId: lesson.subjectId,
        value: percentageToGrade(result.percentage),
        date: lesson.date,
      }));
  });
}

export async function ensureStaffAccounts(): Promise<void> {
  const teacherHash = await bcrypt.hash(DEMO_TEACHER.password, 10);
  const adminHash = await bcrypt.hash(DEMO_ADMIN.password, 10);

  await db
    .insert(teachers)
    .values({
      id: DEMO_TEACHER.id,
      email: DEMO_TEACHER.email,
      name: DEMO_TEACHER.name,
      school: DEMO_TEACHER.school,
      passwordHash: teacherHash,
      role: "teacher",
      status: "approved",
      approvedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(teachers)
    .values({
      id: DEMO_ADMIN.id,
      email: DEMO_ADMIN.email,
      name: DEMO_ADMIN.name,
      school: DEMO_ADMIN.school,
      passwordHash: adminHash,
      role: "admin",
      status: "approved",
      approvedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .update(teachers)
    .set({ role: "teacher", status: "approved" })
    .where(eq(teachers.id, DEMO_TEACHER.id));

  await db
    .update(teachers)
    .set({ role: "admin", status: "approved" })
    .where(eq(teachers.id, DEMO_ADMIN.id));
}

export async function seedAll(force = false): Promise<SeedResult> {
  await ensureStaffAccounts();

  const [classCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(classes);

  if (!force && classCount.count > 0) {
    const [gradeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(grades);
    const [lessonCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons);
    const [teacherCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(teachers);
    return {
      seeded: false,
      teacherCount: teacherCount.count,
      classCount: classCount.count,
      lessonCount: lessonCount.count,
      gradeCount: gradeCount.count,
    };
  }

  if (force) {
    await db.delete(interventions);
    await db.delete(grades);
    await db.delete(lessons);
    await db.delete(seating);
    await db.delete(students);
    await db.delete(classes);
    await db.delete(subjects);
  }

  const passwordHash = await bcrypt.hash(DEMO_TEACHER.password, 10);
  await db
    .insert(teachers)
    .values({
      id: DEMO_TEACHER.id,
      email: DEMO_TEACHER.email,
      name: DEMO_TEACHER.name,
      school: DEMO_TEACHER.school,
      passwordHash,
      role: "teacher",
      status: "approved",
      approvedAt: new Date(),
    })
    .onConflictDoNothing();

  await db.insert(subjects).values(SEED_SUBJECTS).onConflictDoNothing();
  await db
    .insert(classes)
    .values(
      SEED_CLASSES.map(({ id, name }) => ({
        id,
        name,
        teacherId: DEMO_TEACHER.id,
      }))
    )
    .onConflictDoNothing();

  const studentRows = SEED_CLASSES.flatMap((classGroup) =>
    classGroup.students.map((student) => ({
      id: student.id,
      name: student.name,
      classId: classGroup.id,
    }))
  );
  await db.insert(students).values(studentRows).onConflictDoNothing();

  const seedLessons = buildSeedLessons();
  await db.insert(lessons).values(seedLessons.map(lessonRow)).onConflictDoNothing();

  const seatingRows = Object.entries(buildSeedSeating()).map(
    ([classId, layout]) => ({
      classId,
      rows: layout.rows,
      columns: layout.columns,
      assignments: layout.assignments,
    })
  );
  await db.insert(seating).values(seatingRows).onConflictDoNothing();

  const weekly = buildDemoGrades().map((grade) => ({
    id: grade.id,
    studentId: grade.studentId,
    subjectId: grade.subjectId,
    value: grade.value,
    date: grade.date,
  }));
  const fromLessons = gradesFromLessons(seedLessons);
  await db
    .insert(grades)
    .values([...weekly, ...fromLessons])
    .onConflictDoNothing();

  return {
    seeded: true,
    teacherCount: 1,
    classCount: SEED_CLASSES.length,
    lessonCount: seedLessons.length,
    gradeCount: weekly.length + fromLessons.length,
  };
}

export function toClassroomLesson(row: typeof lessons.$inferSelect): ClassroomLesson {
  return {
    id: row.id,
    classId: row.classId,
    subjectId: row.subjectId,
    title: row.title,
    date: asDateString(row.date),
    isActive: row.isActive,
    stages: row.payload.stages,
    studentResults: row.payload.studentResults,
    classStageResults: row.payload.classStageResults,
    classPercentage: row.payload.classPercentage,
  };
}
