import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CLASS_ID, DEFAULT_SUBJECT_ID } from "@/data/seed";
import { api } from "@/lib/api";
import { LOCAL_DATA_MODE } from "@/lib/data-mode";
import {
  calculateClassPercentage,
  calculateClassStageResults,
  calculateStudentResult,
} from "@/lib/calculations";
import {
  defaultSeatingLayout,
  fillAlphabetically,
  pruneLayout,
} from "@/lib/seating";
import type {
  ClassGroup,
  Lesson,
  Mark,
  SeatingLayout,
  Stage,
  Subject,
} from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface ClassroomSnapshot {
  classes: ClassGroup[];
  subjects: Subject[];
  lessons: Lesson[];
  seating: Record<string, SeatingLayout>;
}

export interface ImportResult {
  imported: number;
  createdStudents: number;
  createdSubjects: number;
  classId: string;
}

interface AppState extends ClassroomSnapshot {
  activeClassId: string;
  activeSubjectId: string;
  status: LoadStatus;
  error: string | null;

  hydrate: () => Promise<void>;
  setActiveClass: (classId: string) => void;
  setActiveSubject: (subjectId: string) => void;

  setSeatingSize: (rows: number, columns: number) => void;
  assignSeat: (seat: string, studentId: string | null) => void;
  swapSeats: (from: string, to: string) => void;
  autoFillSeating: () => void;
  clearSeating: () => void;

  getClassGroup: () => ClassGroup;
  getSubject: () => Subject;
  getActiveLesson: () => Lesson | undefined;

  setMark: (studentId: string, stageId: string, mark: Mark) => void;
  toggleMark: (studentId: string, stageId: string, mark: "+" | "-") => void;
  completeLesson: () => void;
  startNewLesson: (title: string, stages?: Stage[]) => Promise<string | null>;
  resetData: () => void;
  refresh: () => Promise<void>;

  createClass: (name: string) => Promise<string>;
  addStudent: (name: string) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  importGrades: (csv: string) => Promise<ImportResult>;

  notice: string | null;
  setNotice: (notice: string | null) => void;
}

function syncLessonResults(
  lesson: Lesson,
  marks: Record<string, Mark>,
  classGroup: ClassGroup
): Lesson {
  const studentResults = classGroup.students.map((student) =>
    calculateStudentResult(student.id, lesson.stages, marks)
  );
  const classStageResults = calculateClassStageResults(
    lesson.stages,
    classGroup.students,
    marks
  );
  const classPercentage = calculateClassPercentage(studentResults);

  return {
    ...lesson,
    studentResults,
    classStageResults,
    classPercentage,
  };
}

function marksFromLesson(lesson: Lesson): Record<string, Mark> {
  const marks: Record<string, Mark> = {};
  for (const result of lesson.studentResults) {
    for (const stage of result.stages) {
      marks[`${result.studentId}-${stage.stageId}`] = stage.mark;
    }
  }
  return marks;
}

function readLayout(
  state: Pick<AppState, "seating">,
  classGroup: ClassGroup
): SeatingLayout {
  return (
    state.seating[classGroup.id] ??
    defaultSeatingLayout(classGroup.students.length)
  );
}

function writeLayout(
  state: Pick<AppState, "seating">,
  classId: string,
  layout: SeatingLayout
): Pick<AppState, "seating"> {
  return { seating: { ...state.seating, [classId]: layout } };
}

function persistSeating(classId: string, layout: SeatingLayout): void {
  void api(`/api/classroom/seating/${classId}`, {
    method: "PUT",
    body: JSON.stringify(layout),
  }).catch((error) => console.error("Не удалось сохранить рассадку:", error));
}

function replaceLesson(lessons: Lesson[], lesson: Lesson): Lesson[] {
  return lessons.map((item) => (item.id === lesson.id ? lesson : item));
}

const emptyClass: ClassGroup = { id: "", name: "—", students: [] };
const emptySubject: Subject = { id: "", name: "—" };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      classes: [],
      subjects: [],
      lessons: [],
      seating: {},
      activeClassId: DEFAULT_CLASS_ID,
      activeSubjectId: DEFAULT_SUBJECT_ID,
      status: "idle",
      error: null,
      notice: null,

      setNotice: (notice) => set({ notice }),

      hydrate: async () => {
        set({ status: "loading", error: null });
        try {
          const snapshot = await api<ClassroomSnapshot>("/api/classroom");
          const state = get();
          const classId = snapshot.classes.some(
            (item) => item.id === state.activeClassId
          )
            ? state.activeClassId
            : (snapshot.classes[0]?.id ?? "");
          const subjectId = snapshot.subjects.some(
            (item) => item.id === state.activeSubjectId
          )
            ? state.activeSubjectId
            : (snapshot.subjects[0]?.id ?? "");

          set({
            ...snapshot,
            activeClassId: classId,
            activeSubjectId: subjectId,
            status: "ready",
            error: null,
          });
        } catch (error) {
          set({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить данные",
          });
        }
      },

      setActiveClass: (classId) => set({ activeClassId: classId }),
      setActiveSubject: (subjectId) => set({ activeSubjectId: subjectId }),

      setSeatingSize: (rows, columns) => {
        const classGroup = get().getClassGroup();
        if (!classGroup.id) return;
        const layout = pruneLayout(
          { ...readLayout(get(), classGroup), rows, columns },
          new Set(classGroup.students.map((s) => s.id))
        );
        set(writeLayout(get(), classGroup.id, layout));
        persistSeating(classGroup.id, layout);
      },

      assignSeat: (seat, studentId) => {
        const classGroup = get().getClassGroup();
        if (!classGroup.id) return;
        const layout = readLayout(get(), classGroup);
        const assignments = { ...layout.assignments };

        if (studentId === null) {
          delete assignments[seat];
        } else {
          for (const [key, value] of Object.entries(assignments)) {
            if (value === studentId) delete assignments[key];
          }
          assignments[seat] = studentId;
        }

        const next = { ...layout, assignments };
        set(writeLayout(get(), classGroup.id, next));
        persistSeating(classGroup.id, next);
      },

      swapSeats: (from, to) => {
        const classGroup = get().getClassGroup();
        if (!classGroup.id) return;
        const layout = readLayout(get(), classGroup);
        const assignments = { ...layout.assignments };
        const moving = assignments[from];
        const target = assignments[to];
        if (!moving) return;

        assignments[to] = moving;
        if (target) assignments[from] = target;
        else delete assignments[from];

        const next = { ...layout, assignments };
        set(writeLayout(get(), classGroup.id, next));
        persistSeating(classGroup.id, next);
      },

      autoFillSeating: () => {
        const classGroup = get().getClassGroup();
        if (!classGroup.id) return;
        const next = fillAlphabetically(
          readLayout(get(), classGroup),
          classGroup.students
        );
        set(writeLayout(get(), classGroup.id, next));
        persistSeating(classGroup.id, next);
      },

      clearSeating: () => {
        const classGroup = get().getClassGroup();
        if (!classGroup.id) return;
        const next = { ...readLayout(get(), classGroup), assignments: {} };
        set(writeLayout(get(), classGroup.id, next));
        persistSeating(classGroup.id, next);
      },

      getClassGroup: () => {
        const { classes, activeClassId } = get();
        return classes.find((c) => c.id === activeClassId) ?? classes[0] ?? emptyClass;
      },

      getSubject: () => {
        const { subjects, activeSubjectId } = get();
        return (
          subjects.find((s) => s.id === activeSubjectId) ??
          subjects[0] ??
          emptySubject
        );
      },

      getActiveLesson: () => {
        const { lessons, activeClassId, activeSubjectId } = get();
        return lessons.find(
          (lesson) =>
            lesson.isActive &&
            lesson.classId === activeClassId &&
            lesson.subjectId === activeSubjectId
        );
      },

      setMark: (studentId, stageId, mark) => {
        const lesson = get().getActiveLesson();
        if (!lesson) return;

        const classGroup = get().getClassGroup();
        const marks = marksFromLesson(lesson);
        marks[`${studentId}-${stageId}`] = mark;
        const updated = syncLessonResults(lesson, marks, classGroup);

        set((state) => ({ lessons: replaceLesson(state.lessons, updated) }));

        void api<{ lesson: Lesson }>(`/api/classroom/lessons/${lesson.id}/mark`, {
          method: "PATCH",
          body: JSON.stringify({ studentId, stageId, mark }),
        })
          .then((data) => {
            set((state) => ({
              lessons: replaceLesson(state.lessons, data.lesson),
            }));
          })
          .catch((error) =>
            console.error("Не удалось сохранить отметку:", error)
          );
      },

      toggleMark: (studentId, stageId, mark) => {
        const lesson = get().getActiveLesson();
        if (!lesson) return;
        const current = marksFromLesson(lesson)[`${studentId}-${stageId}`];
        get().setMark(studentId, stageId, current === mark ? null : mark);
      },

      completeLesson: () => {
        const lesson = get().getActiveLesson();
        if (!lesson) return;

        set((state) => ({
          lessons: state.lessons.map((item) =>
            item.id === lesson.id ? { ...item, isActive: false } : item
          ),
        }));

        void api<{ lesson: Lesson }>(
          `/api/classroom/lessons/${lesson.id}/complete`,
          { method: "POST" }
        )
          .then(async (data) => {
            set((state) => ({
              lessons: replaceLesson(state.lessons, data.lesson),
            }));
            await get().refresh();
          })
          .catch((error) => {
            console.error("Не удалось завершить урок:", error);
            set({
              notice:
                error instanceof Error
                  ? error.message
                  : "Не удалось завершить урок",
            });
            void get().refresh();
          });
      },

      startNewLesson: async (title, stages) => {
        const { activeClassId, activeSubjectId } = get();
        if (!activeClassId || !title.trim()) {
          return "Выберите класс и укажите тему урока";
        }

        try {
          const data = await api<{ lesson: Lesson }>("/api/classroom/lessons", {
            method: "POST",
            body: JSON.stringify({
              title: title.trim(),
              classId: activeClassId,
              subjectId: activeSubjectId,
              stages,
            }),
          });
          set((state) => ({
            notice: null,
            lessons: [
              ...state.lessons.map((item) =>
                item.isActive &&
                item.classId === activeClassId &&
                item.subjectId === activeSubjectId
                  ? { ...item, isActive: false }
                  : item
              ),
              data.lesson,
            ],
          }));
          return null;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Не удалось создать урок";
          set({ notice: message });
          return message;
        }
      },

      resetData: () => {
        void get().hydrate();
      },

      refresh: async () => {
        const snapshot = await api<ClassroomSnapshot>("/api/classroom");
        const state = get();
        const classId = snapshot.classes.some(
          (item) => item.id === state.activeClassId
        )
          ? state.activeClassId
          : (snapshot.classes[0]?.id ?? "");
        const subjectId = snapshot.subjects.some(
          (item) => item.id === state.activeSubjectId
        )
          ? state.activeSubjectId
          : (snapshot.subjects[0]?.id ?? "");
        set({
          ...snapshot,
          activeClassId: classId,
          activeSubjectId: subjectId,
          status: "ready",
          error: null,
        });
      },

      createClass: async (name) => {
        const data = await api<{ class: ClassGroup }>("/api/classroom/classes", {
          method: "POST",
          body: JSON.stringify({ name: name.trim() }),
        });
        await get().refresh();
        set({ activeClassId: data.class.id });
        return data.class.id;
      },

      addStudent: async (name) => {
        const classId = get().activeClassId;
        if (!classId) throw new Error("Сначала создайте класс");
        await api(`/api/classroom/classes/${classId}/students`, {
          method: "POST",
          body: JSON.stringify({ name: name.trim() }),
        });
        await get().refresh();
      },

      removeStudent: async (studentId) => {
        await api(`/api/classroom/students/${studentId}`, { method: "DELETE" });
        await get().refresh();
      },

      importGrades: async (csv) => {
        const classId = get().activeClassId;
        if (!classId) throw new Error("Сначала создайте класс");
        const data = await api<ImportResult>("/api/classroom/import", {
          method: "POST",
          body: JSON.stringify({ classId, csv }),
        });
        await get().refresh();
        return data;
      },
    }),
    {
      name: LOCAL_DATA_MODE ? "tanymtor-local-selection" : "tanymtor-storage",
      version: 5,
      partialize: (state) => ({
        activeClassId: state.activeClassId,
        activeSubjectId: state.activeSubjectId,
      }),
    }
  )
);

export function useContextLessons(): Lesson[] {
  const lessons = useAppStore((s) => s.lessons);
  const activeClassId = useAppStore((s) => s.activeClassId);
  const activeSubjectId = useAppStore((s) => s.activeSubjectId);

  return useMemo(
    () =>
      lessons.filter(
        (lesson) =>
          lesson.classId === activeClassId &&
          lesson.subjectId === activeSubjectId
      ),
    [lessons, activeClassId, activeSubjectId]
  );
}

export function useSeating(): SeatingLayout {
  const seating = useAppStore((s) => s.seating);
  const classes = useAppStore((s) => s.classes);
  const activeClassId = useAppStore((s) => s.activeClassId);

  return useMemo(() => {
    const classGroup =
      classes.find((c) => c.id === activeClassId) ?? classes[0];
    if (!classGroup) {
      return defaultSeatingLayout(0);
    }
    return readLayout({ seating }, classGroup);
  }, [seating, classes, activeClassId]);
}
