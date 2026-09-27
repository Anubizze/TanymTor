import { Router } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { DEFAULT_STAGES } from "../data/classroom";
import { db } from "../db/client";
import { toClassroomLesson } from "../db/seed";
import {
  classes,
  grades,
  lessons,
  seating,
  students,
  subjects,
  type ClassroomLesson,
  type Mark,
} from "../db/schema";
import { parseGradeCsv } from "../lib/grade-csv";
import {
  defaultSeatingLayout,
  fillAlphabetically,
  pruneLayout,
  type SeatingLayout,
} from "../lib/seating";
import {
  marksFromPayload,
  percentageToGrade,
  rebuildPayload,
} from "../services/lesson-results";
import { assertClassOwner } from "../services/scope";
import type { AuthedRequest } from "../middleware/auth";

export const classroomRouter = Router();

async function loadClassroom(teacherId: string) {
  const classRows = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, teacherId))
    .orderBy(asc(classes.name));
  const classIds = classRows.map((row) => row.id);

  const studentRows =
    classIds.length === 0
      ? []
      : await db
          .select()
          .from(students)
          .where(inArray(students.classId, classIds))
          .orderBy(asc(students.name));

  const subjectRows = await db
    .select()
    .from(subjects)
    .orderBy(asc(subjects.name));

  const lessonRows =
    classIds.length === 0
      ? []
      : await db
          .select()
          .from(lessons)
          .where(inArray(lessons.classId, classIds))
          .orderBy(asc(lessons.date));

  const seatingRows =
    classIds.length === 0
      ? []
      : await db.select().from(seating).where(inArray(seating.classId, classIds));

  const classGroups = classRows.map((classRow) => ({
    id: classRow.id,
    name: classRow.name,
    students: studentRows
      .filter((student) => student.classId === classRow.id)
      .map((student) => ({ id: student.id, name: student.name })),
  }));

  const seatingMap: Record<string, SeatingLayout> = {};
  for (const row of seatingRows) {
    seatingMap[row.classId] = {
      rows: row.rows,
      columns: row.columns,
      assignments: row.assignments ?? {},
    };
  }

  return {
    classes: classGroups,
    subjects: subjectRows.map((row) => ({ id: row.id, name: row.name })),
    lessons: lessonRows.map(toClassroomLesson),
    seating: seatingMap,
  };
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function upsertLessonGrades(lesson: ClassroomLesson): Promise<void> {
  const rows = lesson.studentResults
    .filter((result) => result.plusCount + result.minusCount > 0)
    .map((result) => ({
      id: `lesson-${lesson.id}-${result.studentId}`,
      studentId: result.studentId,
      subjectId: lesson.subjectId,
      value: percentageToGrade(result.percentage),
      date: lesson.date,
    }));

  if (rows.length === 0) return;

  for (const row of rows) {
    await db.delete(grades).where(eq(grades.id, row.id));
  }
  await db.insert(grades).values(rows);
}

async function ownedLesson(teacherId: string, lessonId: string) {
  const [row] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!row) return null;
  if (!(await assertClassOwner(teacherId, row.classId))) return null;
  return row;
}

async function classStudents(classId: string) {
  return db
    .select({ id: students.id, name: students.name })
    .from(students)
    .where(eq(students.classId, classId))
    .orderBy(asc(students.name));
}

async function syncClassLessonRosters(classId: string): Promise<void> {
  const roster = await classStudents(classId);
  const active = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.classId, classId), eq(lessons.isActive, true)));

  for (const row of active) {
    const payload = rebuildPayload(
      row.payload.stages,
      roster,
      marksFromPayload(row.payload)
    );
    await db.update(lessons).set({ payload }).where(eq(lessons.id, row.id));
  }
}

async function pruneClassSeating(classId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(seating)
    .where(eq(seating.classId, classId))
    .limit(1);
  if (!row) return;

  const ids = new Set((await classStudents(classId)).map((student) => student.id));
  const layout = pruneLayout(
    { rows: row.rows, columns: row.columns, assignments: row.assignments ?? {} },
    ids
  );
  await db
    .update(seating)
    .set({
      rows: layout.rows,
      columns: layout.columns,
      assignments: layout.assignments,
    })
    .where(eq(seating.classId, classId));
}

classroomRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    res.json(await loadClassroom(req.teacher!.id));
  } catch (error) {
    next(error);
  }
});

classroomRouter.put("/seating/:classId", async (req: AuthedRequest, res, next) => {
  try {
    const classId = req.params.classId;
    if (!(await assertClassOwner(req.teacher!.id, classId))) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }
    const [classGroup] = (await loadClassroom(req.teacher!.id)).classes.filter(
      (item) => item.id === classId
    );
    if (!classGroup) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    const rows = Number(req.body?.rows);
    const columns = Number(req.body?.columns);
    const assignments = (req.body?.assignments ?? {}) as Record<string, string>;

    if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) {
      res.status(400).json({ error: "Укажите размер сетки" });
      return;
    }

    const layout = pruneLayout(
      { rows, columns, assignments },
      new Set(classGroup.students.map((student) => student.id))
    );

    await db
      .insert(seating)
      .values({
        classId,
        rows: layout.rows,
        columns: layout.columns,
        assignments: layout.assignments,
      })
      .onConflictDoUpdate({
        target: seating.classId,
        set: {
          rows: layout.rows,
          columns: layout.columns,
          assignments: layout.assignments,
        },
      });

    res.json({ layout });
  } catch (error) {
    next(error);
  }
});

classroomRouter.post("/seating/:classId/autofill", async (req: AuthedRequest, res, next) => {
  try {
    const snapshot = await loadClassroom(req.teacher!.id);
    const classGroup = snapshot.classes.find(
      (item) => item.id === req.params.classId
    );
    if (!classGroup) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    const current = snapshot.seating[classGroup.id] ?? {
      rows: 3,
      columns: 3,
      assignments: {},
    };
    const layout = fillAlphabetically(current, classGroup.students);

    await db
      .insert(seating)
      .values({
        classId: classGroup.id,
        rows: layout.rows,
        columns: layout.columns,
        assignments: layout.assignments,
      })
      .onConflictDoUpdate({
        target: seating.classId,
        set: {
          rows: layout.rows,
          columns: layout.columns,
          assignments: layout.assignments,
        },
      });

    res.json({ layout });
  } catch (error) {
    next(error);
  }
});

classroomRouter.patch("/lessons/:id/mark", async (req: AuthedRequest, res, next) => {
  try {
    const row = await ownedLesson(req.teacher!.id, req.params.id);
    if (!row) {
      res.status(404).json({ error: "Урок не найден" });
      return;
    }

    const studentId = String(req.body?.studentId ?? "");
    const stageId = String(req.body?.stageId ?? "");
    const mark = (req.body?.mark ?? null) as Mark;

    if (!studentId || !stageId) {
      res.status(400).json({ error: "Нужны studentId и stageId" });
      return;
    }
    if (mark !== "+" && mark !== "-" && mark !== null) {
      res.status(400).json({ error: "Отметка должна быть +, − или пустой" });
      return;
    }

    const classStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.classId, row.classId));

    const marks = marksFromPayload(row.payload);
    marks[`${studentId}-${stageId}`] = mark;
    const payload = rebuildPayload(row.payload.stages, classStudents, marks);

    const [updated] = await db
      .update(lessons)
      .set({ payload })
      .where(eq(lessons.id, row.id))
      .returning();

    res.json({ lesson: toClassroomLesson(updated) });
  } catch (error) {
    next(error);
  }
});

classroomRouter.post("/lessons/:id/complete", async (req: AuthedRequest, res, next) => {
  try {
    const row = await ownedLesson(req.teacher!.id, req.params.id);
    if (!row) {
      res.status(404).json({ error: "Урок не найден" });
      return;
    }

    const [updated] = await db
      .update(lessons)
      .set({ isActive: false })
      .where(eq(lessons.id, row.id))
      .returning();

    const lesson = toClassroomLesson(updated);
    await upsertLessonGrades(lesson);
    res.json({ lesson });
  } catch (error) {
    next(error);
  }
});

classroomRouter.post("/lessons", async (req: AuthedRequest, res, next) => {
  try {
    const title = String(req.body?.title ?? "").trim();
    const classId = String(req.body?.classId ?? "");
    const subjectId = String(req.body?.subjectId ?? "");

    if (!title || !classId || !subjectId) {
      res.status(400).json({ error: "Нужны название, класс и предмет" });
      return;
    }
    if (!(await assertClassOwner(req.teacher!.id, classId))) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    const roster = await classStudents(classId);

    if (roster.length === 0) {
      res.status(400).json({ error: "Сначала добавьте учеников в класс" });
      return;
    }

    const previous = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.classId, classId), eq(lessons.subjectId, subjectId)))
      .orderBy(asc(lessons.date));

    const stages =
      (req.body?.stages as typeof DEFAULT_STAGES | undefined) ??
      previous.at(-1)?.payload.stages ??
      DEFAULT_STAGES;

    for (const row of previous.filter((item) => item.isActive)) {
      const [closed] = await db
        .update(lessons)
        .set({ isActive: false })
        .where(eq(lessons.id, row.id))
        .returning();
      await upsertLessonGrades(toClassroomLesson(closed));
    }

    const payload = rebuildPayload(stages, roster, {});
    const id = `lesson-${Date.now()}`;
    const [created] = await db
      .insert(lessons)
      .values({
        id,
        classId,
        subjectId,
        title,
        date: new Date().toISOString().slice(0, 10),
        isActive: true,
        payload,
      })
      .returning();

    res.status(201).json({ lesson: toClassroomLesson(created) });
  } catch (error) {
    next(error);
  }
});

classroomRouter.post("/classes", async (req: AuthedRequest, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (name.length < 1) {
      res.status(400).json({ error: "Укажите название класса" });
      return;
    }

    const id = `class-${Date.now()}`;
    const layout = defaultSeatingLayout(0);
    const [created] = await db
      .insert(classes)
      .values({ id, name, teacherId: req.teacher!.id })
      .returning();

    await db.insert(seating).values({
      classId: id,
      rows: layout.rows,
      columns: layout.columns,
      assignments: layout.assignments,
    });

    res.status(201).json({
      class: { id: created.id, name: created.name, students: [] },
    });
  } catch (error) {
    next(error);
  }
});

classroomRouter.patch("/classes/:id", async (req: AuthedRequest, res, next) => {
  try {
    if (!(await assertClassOwner(req.teacher!.id, req.params.id))) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    const name = String(req.body?.name ?? "").trim();
    if (name.length < 1) {
      res.status(400).json({ error: "Укажите название класса" });
      return;
    }

    const [updated] = await db
      .update(classes)
      .set({ name })
      .where(eq(classes.id, req.params.id))
      .returning();

    res.json({ class: { id: updated.id, name: updated.name } });
  } catch (error) {
    next(error);
  }
});

classroomRouter.delete("/classes/:id", async (req: AuthedRequest, res, next) => {
  try {
    if (!(await assertClassOwner(req.teacher!.id, req.params.id))) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    await db.delete(classes).where(eq(classes.id, req.params.id));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

classroomRouter.post("/classes/:id/students", async (req: AuthedRequest, res, next) => {
  try {
    const classId = req.params.id;
    if (!(await assertClassOwner(req.teacher!.id, classId))) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    const name = String(req.body?.name ?? "").trim();
    if (name.length < 2) {
      res.status(400).json({ error: "Укажите ФИО ученика" });
      return;
    }

    const [created] = await db
      .insert(students)
      .values({ id: `student-${Date.now()}`, name, classId })
      .returning();

    await syncClassLessonRosters(classId);
    res.status(201).json({ student: { id: created.id, name: created.name } });
  } catch (error) {
    next(error);
  }
});

classroomRouter.delete("/students/:id", async (req: AuthedRequest, res, next) => {
  try {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, req.params.id))
      .limit(1);

    if (!student?.classId || !(await assertClassOwner(req.teacher!.id, student.classId))) {
      res.status(404).json({ error: "Ученик не найден" });
      return;
    }

    await db.delete(students).where(eq(students.id, student.id));
    await syncClassLessonRosters(student.classId);
    await pruneClassSeating(student.classId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

classroomRouter.post("/import", async (req: AuthedRequest, res, next) => {
  try {
    const classId = String(req.body?.classId ?? "");
    const csv = String(req.body?.csv ?? "");

    if (!classId || !csv.trim()) {
      res.status(400).json({ error: "Нужны класс и CSV-файл журнала" });
      return;
    }
    if (!(await assertClassOwner(req.teacher!.id, classId))) {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }

    let parsed;
    try {
      parsed = parseGradeCsv(csv);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Не удалось разобрать CSV",
      });
      return;
    }

    if (parsed.length === 0) {
      res.status(400).json({ error: "В файле нет строк с оценками" });
      return;
    }

    const roster = await classStudents(classId);
    const studentByName = new Map(
      roster.map((student) => [normalizeName(student.name), student])
    );

    const subjectRows = await db.select().from(subjects);
    const subjectByName = new Map(
      subjectRows.map((subject) => [normalizeName(subject.name), subject])
    );

    let createdStudents = 0;
    let createdSubjects = 0;
    let imported = 0;

    for (const row of parsed) {
      const studentKey = normalizeName(row.name);
      let student = studentByName.get(studentKey);
      if (!student) {
        const [created] = await db
          .insert(students)
          .values({
            id: `student-${Date.now()}-${createdStudents}`,
            name: row.name.trim(),
            classId,
          })
          .returning();
        student = { id: created.id, name: created.name };
        studentByName.set(studentKey, student);
        createdStudents += 1;
      }

      const subjectKey = normalizeName(row.subject);
      let subject = subjectByName.get(subjectKey);
      if (!subject) {
        const id = `subject-${slug(row.subject) || Date.now()}`;
        const [created] = await db
          .insert(subjects)
          .values({ id, name: row.subject.trim() })
          .returning();
        subject = created;
        subjectByName.set(subjectKey, subject);
        createdSubjects += 1;
      }

      const gradeId = `g-${student.id}-${subject.id}-${row.date}`;
      await db
        .insert(grades)
        .values({
          id: gradeId,
          studentId: student.id,
          subjectId: subject.id,
          value: row.value,
          date: row.date,
        })
        .onConflictDoUpdate({
          target: grades.id,
          set: { value: row.value },
        });
      imported += 1;
    }

    await syncClassLessonRosters(classId);

    res.json({
      imported,
      createdStudents,
      createdSubjects,
      classId,
    });
  } catch (error) {
    next(error);
  }
});
