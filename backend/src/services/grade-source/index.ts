import { dbSource } from "./db-source";
import { demoSource } from "./demo-source";
import type { GradeSource } from "./types";

const sources: Record<string, GradeSource> = {
  db: dbSource,
  demo: demoSource,
};

export function getGradeSource(): GradeSource {
  const key = process.env.GRADE_SOURCE ?? "db";
  const source = sources[key];

  if (!source) {
    throw new Error(
      `Неизвестный источник оценок: "${key}". Доступны: ${Object.keys(sources).join(", ")}.`
    );
  }

  return source;
}

export type { GradeSource };
