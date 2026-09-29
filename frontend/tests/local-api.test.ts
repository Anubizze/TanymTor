import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { api, ApiError, setApiToken } from "../lib/api";
import { LOCAL_DATABASE_KEY, localApi } from "../lib/local-api";
import type { Teacher } from "../lib/auth-types";
import type { ClassGroup, Lesson, SeatingLayout, Subject } from "../lib/types";
import type { InterventionItem, SignalsPayload } from "../lib/signal-types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

type Snapshot = { classes: ClassGroup[]; subjects: Subject[]; lessons: Lesson[]; seating: Record<string, SeatingLayout> };
type Session = { teacher: Teacher; token: string };
const teacherCredentials = { email: "teacher@tanymtor.kz", password: "teacher123" };
const adminCredentials = { email: "admin@tanymtor.kz", password: "admin123" };
const write = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const login = () => localApi<Session>("/api/auth/login", write("POST", teacherCredentials));

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  Object.defineProperty(globalThis, "window", { value: { get localStorage() { return globalThis.localStorage; } }, configurable: true });
  setApiToken(null);
});

test("default API works without any network requests and preserves login errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
  try {
    await assert.rejects(api("/api/auth/login", write("POST", { ...teacherCredentials, password: "wrong" })), (error: unknown) => error instanceof ApiError && error.status === 401 && error.message === "Неверный email или пароль");
    const session = await api<Session>("/api/auth/login", write("POST", teacherCredentials));
    setApiToken(session.token);
    const snapshot = await api<Snapshot>("/api/classroom");
    assert.equal(snapshot.classes.length, 3);
    assert.ok(snapshot.lessons.length > 0);
    const signals = await api<SignalsPayload>("/api/signals");
    assert.ok(signals.results.length > 0);
    assert.ok(signals.counts.signals > 0);
    await api("/api/interventions");
    const logout = api("/api/auth/logout", write("POST"));
    setApiToken(null);
    await logout;
    await assert.rejects(localApi("/api/auth/me", {}, session.token), { status: 401 });
  } finally { globalThis.fetch = originalFetch; }
});

test("marks, seating and session survive a fresh storage instance; logout revokes session", async () => {
  const { token } = await login();
  const snapshot = await localApi<Snapshot>("/api/classroom", {}, token);
  const lesson = snapshot.lessons.find((item) => item.isActive)!;
  const studentId = lesson.studentResults[0].studentId;
  const stageId = lesson.stages[0].id;
  await localApi(`/api/classroom/lessons/${lesson.id}/mark`, write("PATCH", { studentId, stageId, mark: "+" }), token);
  const layout = { rows: 3, columns: 3, assignments: { "0:0:0": studentId } };
  await localApi(`/api/classroom/seating/${lesson.classId}`, write("PUT", layout), token);
  const persisted = localStorage.getItem(LOCAL_DATABASE_KEY)!;
  const fresh = new MemoryStorage();
  fresh.setItem(LOCAL_DATABASE_KEY, persisted);
  Object.defineProperty(globalThis, "localStorage", { value: fresh, configurable: true });
  const me = await localApi<{ teacher: Teacher }>("/api/auth/me", {}, token);
  assert.equal(me.teacher.id, "demo-teacher");
  const restored = await localApi<Snapshot>("/api/classroom", {}, token);
  assert.equal(restored.lessons.find((item) => item.id === lesson.id)!.studentResults[0].stages[0].mark, "+");
  assert.deepEqual(restored.seating[lesson.classId], layout);
  // Returned snapshots must not mutate persisted data.
  restored.classes.length = 0;
  assert.equal((await localApi<Snapshot>("/api/classroom", {}, token)).classes.length, 3);
  await localApi("/api/auth/logout", write("POST"), token);
  await assert.rejects(localApi("/api/auth/me", {}, token), { status: 401 });
});

test("class creation, roster changes, lesson completion and CSV import persist", async () => {
  const { token } = await login();
  const created = await localApi<{ class: ClassGroup }>("/api/classroom/classes", write("POST", { name: "9 А" }), token);
  const classId = created.class.id;
  const { student } = await localApi<{ student: { id: string } }>(`/api/classroom/classes/${classId}/students`, write("POST", { name: "Тестовый ученик" }), token);
  const { lesson } = await localApi<{ lesson: Lesson }>("/api/classroom/lessons", write("POST", { classId, subjectId: "math", title: "Новая тема" }), token);
  await localApi(`/api/classroom/lessons/${lesson.id}/mark`, write("PATCH", { studentId: student.id, stageId: lesson.stages[0].id, mark: "+" }), token);
  await localApi(`/api/classroom/lessons/${lesson.id}/complete`, write("POST"), token);
  const csv = "ученик;предмет;дата;оценка\nТестовый ученик;Математика;2026-09-01;8\nВторой ученик;Химия;02.09.2026;7";
  const imported = await localApi<{ imported: number; createdStudents: number; createdSubjects: number }>("/api/classroom/import", write("POST", { classId, csv }), token);
  assert.equal(imported.imported, 2);
  assert.equal(imported.createdStudents, 1);
  assert.equal(imported.createdSubjects, 1);
  const again = await localApi<{ createdStudents: number }>("/api/classroom/import", write("POST", { classId, csv }), token);
  assert.equal(again.createdStudents, 0);
  const snapshot = await localApi<Snapshot>("/api/classroom", {}, token);
  const completed = snapshot.lessons.find((item) => item.id === lesson.id)!;
  assert.equal(completed.isActive, false);
  assert.equal(completed.classPercentage, 100);
  assert.equal(snapshot.classes.find((item) => item.id === classId)!.students.length, 2);
  await localApi(`/api/classroom/students/${student.id}`, write("DELETE"), token);
  const updated = await localApi<Snapshot>("/api/classroom", {}, token);
  assert.equal(updated.classes.find((item) => item.id === classId)!.students.length, 1);
});

test("registration, admin approval and teacher data remain isolated", async () => {
  const credentials = { email: "new@example.com", password: "local-test-password", name: "Новый учитель" };
  await localApi("/api/auth/register", write("POST", credentials));
  assert.ok(!localStorage.getItem(LOCAL_DATABASE_KEY)!.includes(credentials.password));
  await assert.rejects(localApi("/api/auth/login", write("POST", credentials)), { status: 403 });
  const admin = await localApi<Session>("/api/auth/admin/login", write("POST", adminCredentials));
  const { teachers } = await localApi<{ teachers: Teacher[] }>("/api/admin/teachers", {}, admin.token);
  const registered = teachers.find((teacher) => teacher.email === credentials.email)!;
  assert.ok(!("passwordDigest" in registered));
  await localApi(`/api/admin/teachers/${registered.id}/approve`, write("POST"), admin.token);
  const session = await localApi<Session>("/api/auth/login", write("POST", credentials));
  assert.equal((await localApi<Snapshot>("/api/classroom", {}, session.token)).classes.length, 0);
  await assert.rejects(localApi("/api/admin/teachers", {}, session.token), { status: 403 });
  await localApi(`/api/admin/teachers/${registered.id}/reject`, write("POST"), admin.token);
  await assert.rejects(localApi("/api/classroom", {}, session.token), { status: 401 });
});

test("signals support persisted interventions and reject duplicates", async () => {
  const { token } = await login();
  const signals = await localApi<SignalsPayload>("/api/signals", {}, token);
  const signal = signals.results.find((result) => result.signal)!.signal!;
  const body = { signalId: signal.id, presumedCause: "Не усвоена тема", action: "Индивидуальная консультация" };
  await localApi("/api/interventions", write("POST", body), token);
  await assert.rejects(localApi("/api/interventions", write("POST", body), token), { status: 409 });
  const { interventions } = await localApi<{ interventions: InterventionItem[] }>("/api/interventions", {}, token);
  assert.equal(interventions.length, 1);
  assert.equal(interventions[0].intervention.signalId, signal.id);
  assert.ok(interventions[0].review);
});

test("concurrent saves preserve both marks and corrupt storage is never overwritten", async () => {
  const { token } = await login();
  const { lessons } = await localApi<Snapshot>("/api/classroom", {}, token);
  const lesson = lessons.find((item) => item.isActive)!;
  await Promise.all(lesson.stages.slice(0, 2).map((stage) => localApi(`/api/classroom/lessons/${lesson.id}/mark`, write("PATCH", { studentId: lesson.studentResults[0].studentId, stageId: stage.id, mark: "+" }), token)));
  const saved = await localApi<Snapshot>("/api/classroom", {}, token);
  assert.equal(saved.lessons.find((item) => item.id === lesson.id)!.studentResults[0].plusCount, 2);
  localStorage.setItem(LOCAL_DATABASE_KEY, "corrupt");
  await assert.rejects(localApi("/api/classroom", {}, token), { status: 500 });
  assert.equal(localStorage.getItem(LOCAL_DATABASE_KEY), "corrupt");
});

test("storage failure is reported rather than acknowledging an unsaved mutation", async () => {
  const { token } = await login();
  const previous = localStorage.getItem(LOCAL_DATABASE_KEY);
  localStorage.setItem = () => { throw new Error("Quota exceeded"); };
  await assert.rejects(localApi("/api/classroom/classes", write("POST", { name: "Не сохранён" }), token), { status: 507 });
  assert.equal(localStorage.getItem(LOCAL_DATABASE_KEY), previous);
});

test("UI stores can log in, hydrate, save marks, complete a lesson and restore the session", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
  try {
    const { useAuthStore } = await import("../store/useAuthStore");
    const { useAppStore } = await import("../store/useAppStore");
    await useAuthStore.getState().restoreSession();
    const result = await useAuthStore.getState().login(teacherCredentials.email, teacherCredentials.password);
    assert.equal(result.success, true);
    await useAppStore.getState().hydrate();
    assert.equal(useAppStore.getState().status, "ready");
    const lesson = useAppStore.getState().getActiveLesson()!;
    useAppStore.getState().setMark(lesson.studentResults[0].studentId, lesson.stages[0].id, "+");
    await new Promise<void>((resolve) => setImmediate(resolve));
    await useAppStore.getState().refresh();
    assert.equal(useAppStore.getState().getActiveLesson()!.studentResults[0].stages[0].mark, "+");
    useAppStore.getState().completeLesson();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await useAppStore.getState().refresh();
    assert.equal(useAppStore.getState().getActiveLesson(), undefined);
    assert.equal(await useAppStore.getState().startNewLesson("Проверка локального режима"), null);
    assert.equal(useAppStore.getState().getActiveLesson()!.title, "Проверка локального режима");
    const token = useAuthStore.getState().token!;
    assert.equal(JSON.parse(localStorage.getItem("tanymtor-local-auth")!).state.token, token);
    await useAuthStore.persist.rehydrate();
    await useAuthStore.getState().restoreSession();
    assert.equal(useAuthStore.getState().currentUser!.id, "demo-teacher");
    useAuthStore.getState().logout();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await assert.rejects(localApi("/api/auth/me", {}, token), { status: 401 });
    assert.equal(useAuthStore.getState().currentUser, null);
  } finally { globalThis.fetch = originalFetch; }
});
