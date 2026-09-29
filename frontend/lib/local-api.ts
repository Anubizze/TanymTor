import { DEFAULT_STAGES, SEED_CLASSES, SEED_LESSONS, SEED_SUBJECTS } from "@/data/seed";
import { buildLocalDemoGrades } from "@/data/seed-grades";
import {
  buildClassSeriesBySubject, buildStudentSeries, createIntervention,
  evaluateStudentSubject, parseGradeCsv, reviewIntervention,
  type Grade, type Intervention,
} from "../../shared/src";
import { ApiError } from "./api-error";
import type { Teacher } from "./auth-types";
import type { ClassGroup, Lesson, Mark, SeatingLayout, Subject } from "./types";
import { calculateClassPercentage, calculateClassStageResults, calculateStudentResult } from "./calculations";
import { defaultSeatingLayout, fillAlphabetically, pruneLayout } from "./seating";

export const LOCAL_DATABASE_KEY = "tanymtor-local-data-v1";

interface LocalTeacher extends Teacher {
  passwordDigest?: string;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

interface Classroom {
  classes: ClassGroup[];
  subjects: Subject[];
  lessons: Lesson[];
  seating: Record<string, SeatingLayout>;
  importedGrades: Grade[];
  interventions: Intervention[];
}

interface LocalDatabase {
  version: 1;
  teachers: LocalTeacher[];
  classrooms: Record<string, Classroom>;
  sessions: Record<string, string>;
}

function seedClassroom(): Classroom {
  return structuredClone({
    classes: SEED_CLASSES, subjects: SEED_SUBJECTS, lessons: SEED_LESSONS,
    seating: Object.fromEntries(SEED_CLASSES.map((group) => [group.id,
      fillAlphabetically(defaultSeatingLayout(group.students.length), group.students)])),
    importedGrades: buildLocalDemoGrades(), interventions: [],
  });
}

function readDatabase(): LocalDatabase {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LOCAL_DATABASE_KEY);
  } catch {
    throw new ApiError(503, "Разрешите сохранение данных в браузере для работы с демо.");
  }
  if (raw) {
    try {
      const data = JSON.parse(raw) as LocalDatabase;
      if (data.version !== 1 || !Array.isArray(data.teachers) || !data.classrooms || !data.sessions) throw new Error();
      return data;
    } catch {
      throw new ApiError(500, "Не удалось прочитать локальные данные. Сохранённые данные не изменены.");
    }
  }
  const now = new Date().toISOString();
  const teachers: LocalTeacher[] = [
    { id: "demo-teacher", email: "teacher@tanymtor.kz", name: "Айгуль Нурланова", school: "СШ №12, Алматы", role: "teacher", status: "approved", createdAt: now, approvedAt: now, approvedBy: null },
    { id: "admin-root", email: "admin@tanymtor.kz", name: "Администратор", school: "TanymTor", role: "admin", status: "approved", createdAt: now, approvedAt: now, approvedBy: null },
  ];
  const data: LocalDatabase = { version: 1, teachers, classrooms: { "demo-teacher": seedClassroom() }, sessions: {} };
  saveDatabase(data);
  return data;
}

function saveDatabase(data: LocalDatabase): void {
  try {
    localStorage.setItem(LOCAL_DATABASE_KEY, JSON.stringify(data));
  } catch {
    throw new ApiError(507, "Не удалось сохранить изменения. Проверьте свободное место и разрешения браузера.");
  }
}

function publicTeacher(user: LocalTeacher) {
  const { passwordDigest: _digest, ...teacher } = user;
  void _digest;
  return teacher;
}

function required<T>(value: T | undefined, message: string): T {
  if (!value) throw new ApiError(404, message);
  return value;
}

function text(value: unknown): string { return String(value ?? "").trim(); }
function normalized(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function id(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }

function rebuildLesson(lesson: Lesson, group: ClassGroup): void {
  const marks: Record<string, Mark> = {};
  for (const result of lesson.studentResults) {
    for (const stage of result.stages) marks[`${result.studentId}-${stage.stageId}`] = stage.mark;
  }
  lesson.studentResults = group.students.map((student) => calculateStudentResult(student.id, lesson.stages, marks));
  lesson.classStageResults = calculateClassStageResults(lesson.stages, group.students, marks);
  lesson.classPercentage = calculateClassPercentage(lesson.studentResults);
}

function syncRoster(room: Classroom, group: ClassGroup): void {
  for (const lesson of room.lessons.filter((item) => item.classId === group.id && item.isActive)) rebuildLesson(lesson, group);
  if (room.seating[group.id]) room.seating[group.id] = pruneLayout(room.seating[group.id], new Set(group.students.map((student) => student.id)));
}

function analysis(room: Classroom) {
  const students = room.classes.flatMap((group) => group.students);
  const names = new Map(students.map((student) => [student.id, student.name]));
  const lessonGrades: Grade[] = room.lessons.filter((lesson) => !lesson.isActive).flatMap((lesson) =>
    lesson.studentResults.filter((result) => names.has(result.studentId) && result.plusCount + result.minusCount > 0).map((result) => ({
      id: `${lesson.id}-${result.studentId}`, studentId: result.studentId, subjectId: lesson.subjectId,
      date: lesson.date, value: Math.max(1, Math.round(result.percentage) / 10),
    })));
  const series = buildStudentSeries([...lessonGrades, ...room.importedGrades]);
  const classSeries = buildClassSeriesBySubject(series);
  const results = series.map((item) => ({ ...evaluateStudentSubject(item, classSeries.get(item.subjectId)), studentName: names.get(item.studentId) ?? item.studentId }));
  return { series, classSeries, results, names };
}

// This is a browser demo, not server authentication. Everything stays in this browser.
export async function localApi<T>(path: string, init: RequestInit = {}, token: string | null = null): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const body = (typeof init.body === "string" ? JSON.parse(init.body) : {}) as Record<string, unknown>;
  const password = String(body.password ?? "");
  const email = text(body.email).toLowerCase();
  // Finish asynchronous work before reading storage so concurrent requests cannot overwrite newer changes.
  let passwordDigest = "";
  if (path === "/api/auth/register" || path.endsWith("/login")) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email}:${password}`));
    passwordDigest = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const data = readDatabase();
  const result = dispatch(data, path, method, body, token, passwordDigest);
  if (method !== "GET") saveDatabase(data);
  return structuredClone(result) as T;
}

function dispatch(data: LocalDatabase, path: string, method: string, body: Record<string, unknown>, token: string | null, passwordDigest: string): unknown {
  const email = text(body.email).toLowerCase();
  if (method === "POST" && (path === "/api/auth/login" || path === "/api/auth/admin/login")) {
    const user = data.teachers.find((item) => item.email === email);
    const demoPasswords: Record<string, string> = { "demo-teacher": "teacher123", "admin-root": "admin123" };
    if (!user || (user.passwordDigest ? user.passwordDigest !== passwordDigest : demoPasswords[user.id] !== body.password)) throw new ApiError(401, "Неверный email или пароль");
    if (path === "/api/auth/login" && user.role === "admin") throw new ApiError(403, "Это админ-аккаунт. Войдите через /admin/login");
    if (path === "/api/auth/admin/login" && user.role !== "admin") throw new ApiError(403, "Учителя входят на обычной странице входа.");
    if (user.status !== "approved") throw new ApiError(403, user.status === "pending" ? "Аккаунт ждёт одобрения администратора." : "Заявка отклонена.");
    // One local session per account; old entries do not accumulate on each login.
    for (const [key, userId] of Object.entries(data.sessions)) if (userId === user.id) delete data.sessions[key];
    const session = id("local-session");
    data.sessions[session] = user.id;
    return { token: session, teacher: publicTeacher(user) };
  }
  if (method === "POST" && path === "/api/auth/register") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || text(body.name).length < 2 || String(body.password ?? "").length < 6) throw new ApiError(400, "Проверьте имя, email и пароль (минимум 6 символов).");
    if (data.teachers.some((user) => user.email === email)) throw new ApiError(409, "Пользователь с таким email уже существует");
    const user: LocalTeacher = { id: id("teacher"), email, name: text(body.name), school: text(body.school) || null, passwordDigest, role: "teacher", status: "pending", createdAt: new Date().toISOString(), approvedAt: null, approvedBy: null };
    data.teachers.push(user);
    data.classrooms[user.id] = { classes: [], subjects: structuredClone(SEED_SUBJECTS), lessons: [], seating: {}, importedGrades: [], interventions: [] };
    return { pending: true };
  }
  if (method === "POST" && path === "/api/auth/logout") {
    if (token) delete data.sessions[token];
    return { ok: true };
  }
  const user = data.teachers.find((item) => item.id === (token ? data.sessions[token] : undefined));
  if (!user || user.status !== "approved") throw new ApiError(401, "Нужно войти в аккаунт");
  if (path === "/api/auth/me" && method === "GET") return { teacher: publicTeacher(user) };

  if (path.startsWith("/api/admin/")) {
    if (user.role !== "admin") throw new ApiError(403, "Нужны права администратора");
    if (path === "/api/admin/teachers" && method === "GET") return { teachers: data.teachers.filter((item) => item.role === "teacher").map(publicTeacher) };
    const decision = path.match(/^\/api\/admin\/teachers\/([^/]+)\/(approve|reject)$/);
    if (decision && method === "POST") {
      const teacher = required(data.teachers.find((item) => item.id === decision[1] && item.role === "teacher"), "Учитель не найден");
      teacher.status = decision[2] === "approve" ? "approved" : "rejected";
      teacher.approvedAt = teacher.status === "approved" ? new Date().toISOString() : null;
      teacher.approvedBy = user.id;
      return { teacher: publicTeacher(teacher) };
    }
    throw new ApiError(404, "Действие не найдено");
  }

  if (user.role !== "teacher") throw new ApiError(403, "Войдите как учитель");
  const room = required(data.classrooms[user.id], "Локальные данные учителя не найдены");
  if (path === "/api/classroom" && method === "GET") {
    return { classes: room.classes, subjects: room.subjects, lessons: room.lessons, seating: room.seating };
  }
  if (path === "/api/classroom/classes" && method === "POST") {
    if (!text(body.name)) throw new ApiError(400, "Укажите название класса");
    const group: ClassGroup = { id: id("class"), name: text(body.name), students: [] };
    room.classes.push(group);
    room.seating[group.id] = defaultSeatingLayout(0);
    return { class: group };
  }
  const roster = path.match(/^\/api\/classroom\/classes\/([^/]+)\/students$/);
  if (roster && method === "POST") {
    const group = required(room.classes.find((item) => item.id === roster[1]), "Класс не найден");
    if (text(body.name).length < 2) throw new ApiError(400, "Укажите ФИО ученика");
    const student = { id: id("student"), name: text(body.name) };
    group.students.push(student);
    syncRoster(room, group);
    return { student };
  }
  const removed = path.match(/^\/api\/classroom\/students\/([^/]+)$/);
  if (removed && method === "DELETE") {
    const group = required(room.classes.find((item) => item.students.some((student) => student.id === removed[1])), "Ученик не найден");
    group.students = group.students.filter((student) => student.id !== removed[1]);
    room.importedGrades = room.importedGrades.filter((grade) => grade.studentId !== removed[1]);
    room.interventions = room.interventions.filter((item) => item.studentId !== removed[1]);
    syncRoster(room, group);
    return { ok: true };
  }
  const seating = path.match(/^\/api\/classroom\/seating\/([^/]+)$/);
  if (seating && method === "PUT") {
    const group = required(room.classes.find((item) => item.id === seating[1]), "Класс не найден");
    const rows = Number(body.rows), columns = Number(body.columns);
    if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) throw new ApiError(400, "Укажите размер сетки");
    const layout = pruneLayout({ rows, columns, assignments: (body.assignments ?? {}) as Record<string, string> }, new Set(group.students.map((student) => student.id)));
    room.seating[group.id] = layout;
    return { layout };
  }
  if (path === "/api/classroom/lessons" && method === "POST") {
    const group = required(room.classes.find((item) => item.id === body.classId), "Класс не найден");
    required(room.subjects.find((item) => item.id === body.subjectId), "Предмет не найден");
    if (!text(body.title) || !group.students.length) throw new ApiError(400, "Укажите тему и добавьте учеников в класс");
    const previous = room.lessons.filter((item) => item.classId === group.id && item.subjectId === body.subjectId);
    const stages = (body.stages ?? previous.at(-1)?.stages ?? DEFAULT_STAGES) as Lesson["stages"];
    if (!Array.isArray(stages) || !stages.length || stages.some((stage) => !stage.id || !text(stage.title))) throw new ApiError(400, "Добавьте этапы урока");
    for (const item of previous) item.isActive = false;
    const lesson: Lesson = { id: id("lesson"), title: text(body.title), classId: group.id, subjectId: String(body.subjectId), date: new Date().toISOString().slice(0, 10), stages, isActive: true, studentResults: [], classStageResults: [], classPercentage: 0 };
    rebuildLesson(lesson, group);
    room.lessons.push(lesson);
    return { lesson };
  }
  const lessonAction = path.match(/^\/api\/classroom\/lessons\/([^/]+)\/(mark|complete)$/);
  if (lessonAction && ((method === "PATCH" && lessonAction[2] === "mark") || (method === "POST" && lessonAction[2] === "complete"))) {
    const lesson = required(room.lessons.find((item) => item.id === lessonAction[1]), "Урок не найден");
    if (lessonAction[2] === "complete") lesson.isActive = false;
    else {
      if (!lesson.isActive) throw new ApiError(400, "Урок уже завершён");
      const result = required(lesson.studentResults.find((item) => item.studentId === body.studentId), "Ученик не найден");
      const stage = required(result.stages.find((item) => item.stageId === body.stageId), "Этап не найден");
      if (body.mark !== null && body.mark !== "+" && body.mark !== "-") throw new ApiError(400, "Некорректная отметка");
      stage.mark = body.mark;
      rebuildLesson(lesson, required(room.classes.find((item) => item.id === lesson.classId), "Класс не найден"));
    }
    return { lesson };
  }
  if (path === "/api/classroom/import" && method === "POST") {
    const group = required(room.classes.find((item) => item.id === body.classId), "Класс не найден");
    const parsed = parseGradeCsv(text(body.csv));
    if (!parsed.length) throw new ApiError(400, "В файле нет строк с оценками");
    let createdStudents = 0, createdSubjects = 0;
    for (const row of parsed) {
      let student = group.students.find((item) => normalized(item.name) === normalized(row.name));
      if (!student) { student = { id: id("student"), name: row.name }; group.students.push(student); createdStudents++; }
      let subject = room.subjects.find((item) => normalized(item.name) === normalized(row.subject));
      if (!subject) { subject = { id: id("subject"), name: row.subject }; room.subjects.push(subject); createdSubjects++; }
      const grade: Grade = { id: `import-${student.id}-${subject.id}-${row.date}`, studentId: student.id, subjectId: subject.id, date: row.date, value: row.value };
      room.importedGrades = room.importedGrades.filter((item) => item.id !== grade.id);
      room.importedGrades.push(grade);
    }
    syncRoster(room, group);
    return { imported: parsed.length, createdStudents, createdSubjects, classId: group.id };
  }
  if (path === "/api/signals" && method === "GET") {
    const { results } = analysis(room);
    return { source: "Локальные данные", generatedAt: new Date().toISOString(), counts: {
      signals: results.filter((item) => item.status === "signal").length,
      stable: results.filter((item) => item.status === "stable").length,
      insufficientData: results.filter((item) => item.status === "insufficient_data").length,
    }, results };
  }
  if (path === "/api/interventions") {
    const snapshot = analysis(room);
    if (method === "GET") return { interventions: room.interventions.map((intervention) => {
      const series = snapshot.series.find((item) => item.studentId === intervention.studentId && item.subjectId === intervention.subjectId);
      return { intervention, studentName: snapshot.names.get(intervention.studentId) ?? intervention.studentId,
        review: series ? reviewIntervention(intervention, series, snapshot.classSeries.get(intervention.subjectId)) : null };
    }) };
    if (method === "POST") {
      if (!text(body.presumedCause) || !text(body.action)) throw new ApiError(400, "Укажите предполагаемую причину и действие");
      const found = snapshot.results.find((item) => item.status === "signal" && item.signal.id === body.signalId);
      if (!found || found.status !== "signal") throw new ApiError(404, "Сигнал не найден");
      if (room.interventions.some((item) => item.signalId === body.signalId)) throw new ApiError(409, "По этому сигналу уже зарегистрировано вмешательство");
      const intervention = createIntervention({ id: id("intervention"), signal: found.signal, teacherId: user.id, presumedCause: text(body.presumedCause), action: text(body.action) });
      room.interventions.push(intervention);
      return { intervention };
    }
  }
  throw new ApiError(404, "Действие не найдено в локальном режиме");
}
