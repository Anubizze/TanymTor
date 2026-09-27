import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Не задан DATABASE_URL. Скопируйте backend/.env.example в backend/.env и укажите строку подключения."
  );
}

export const pool = new Pool({
  connectionString,
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

export const db = drizzle(pool, { schema });

export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id            text PRIMARY KEY,
      email         text NOT NULL UNIQUE,
      name          text NOT NULL,
      school        text,
      password_hash text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'teacher';
    ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
    ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS approved_at timestamptz;
    ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS approved_by text;

    CREATE TABLE IF NOT EXISTS classes (
      id   text PRIMARY KEY,
      name text NOT NULL
    );

    ALTER TABLE classes
      ADD COLUMN IF NOT EXISTS teacher_id text REFERENCES teachers(id) ON DELETE CASCADE;

    UPDATE classes
       SET teacher_id = 'demo-teacher'
     WHERE teacher_id IS NULL
       AND EXISTS (SELECT 1 FROM teachers WHERE id = 'demo-teacher');

    CREATE TABLE IF NOT EXISTS students (
      id   text PRIMARY KEY,
      name text NOT NULL
    );

    ALTER TABLE students
      ADD COLUMN IF NOT EXISTS class_id text REFERENCES classes(id) ON DELETE CASCADE;

    CREATE TABLE IF NOT EXISTS subjects (
      id   text PRIMARY KEY,
      name text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grades (
      id         text PRIMARY KEY,
      student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject_id text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      value      real NOT NULL,
      date       date NOT NULL
    );

    CREATE INDEX IF NOT EXISTS grades_student_subject_idx
      ON grades (student_id, subject_id, date);

    CREATE TABLE IF NOT EXISTS lessons (
      id         text PRIMARY KEY,
      class_id   text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      title      text NOT NULL,
      date       date NOT NULL,
      is_active  boolean NOT NULL DEFAULT false,
      payload    jsonb NOT NULL
    );

    CREATE INDEX IF NOT EXISTS lessons_class_subject_idx
      ON lessons (class_id, subject_id, date);

    CREATE TABLE IF NOT EXISTS seating (
      class_id    text PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
      rows        integer NOT NULL,
      columns     integer NOT NULL,
      assignments jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE SEQUENCE IF NOT EXISTS interventions_id_seq;

    CREATE TABLE IF NOT EXISTS interventions (
      id                 text PRIMARY KEY,
      signal_id          text NOT NULL UNIQUE,
      student_id         text NOT NULL,
      subject_id         text NOT NULL,
      teacher_id         text NOT NULL,
      presumed_cause     text NOT NULL,
      action             text NOT NULL,
      baseline           real NOT NULL,
      drop_level         real NOT NULL,
      started_at         timestamptz NOT NULL,
      review_after_weeks integer NOT NULL,
      status             text NOT NULL
    );
  `);
}
