import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { classes, students } from "../db/schema";

export async function classIdsForTeacher(teacherId: string): Promise<string[]> {
  const rows = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.teacherId, teacherId));
  return rows.map((row) => row.id);
}

export async function studentIdsForTeacher(
  teacherId: string
): Promise<Set<string>> {
  const classIds = await classIdsForTeacher(teacherId);
  if (classIds.length === 0) return new Set();

  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(inArray(students.classId, classIds));

  return new Set(rows.map((row) => row.id));
}

export async function assertClassOwner(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const ids = await classIdsForTeacher(teacherId);
  return ids.includes(classId);
}
