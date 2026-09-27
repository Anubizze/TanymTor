import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const teachers = pgTable("teachers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  school: text("school"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("teacher"),
  status: text("status").notNull().default("approved"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const classes = pgTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  teacherId: text("teacher_id").references(() => teachers.id, {
    onDelete: "cascade",
  }),
});

export const students = pgTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  classId: text("class_id").references(() => classes.id, {
    onDelete: "cascade",
  }),
});

export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const grades = pgTable("grades", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  date: date("date").notNull(),
});

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  classId: text("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: date("date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  payload: jsonb("payload").notNull().$type<LessonPayload>(),
});

export const seating = pgTable("seating", {
  classId: text("class_id")
    .primaryKey()
    .references(() => classes.id, { onDelete: "cascade" }),
  rows: integer("rows").notNull(),
  columns: integer("columns").notNull(),
  assignments: jsonb("assignments")
    .notNull()
    .$type<Record<string, string>>()
    .default({}),
});

export const interventions = pgTable("interventions", {
  id: text("id").primaryKey(),
  signalId: text("signal_id").notNull().unique(),
  studentId: text("student_id").notNull(),
  subjectId: text("subject_id").notNull(),
  teacherId: text("teacher_id").notNull(),
  presumedCause: text("presumed_cause").notNull(),
  action: text("action").notNull(),
  baseline: real("baseline").notNull(),
  dropLevel: real("drop_level").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  reviewAfterWeeks: integer("review_after_weeks").notNull(),
  status: text("status").notNull(),
});

export interface Stage {
  id: string;
  title: string;
  order: number;
}

export type Mark = "+" | "-" | null;

export interface LessonPayload {
  stages: Stage[];
  studentResults: {
    studentId: string;
    stages: { stageId: string; mark: Mark }[];
    plusCount: number;
    minusCount: number;
    percentage: number;
  }[];
  classStageResults: {
    stageId: string;
    plusCount: number;
    minusCount: number;
    percentage: number;
  }[];
  classPercentage: number;
}

export interface ClassroomLesson {
  id: string;
  title: string;
  date: string;
  classId: string;
  subjectId: string;
  isActive: boolean;
  stages: Stage[];
  studentResults: LessonPayload["studentResults"];
  classStageResults: LessonPayload["classStageResults"];
  classPercentage: number;
}
