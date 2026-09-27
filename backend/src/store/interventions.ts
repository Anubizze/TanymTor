import { asc, eq } from "drizzle-orm";
import type { Intervention, InterventionStatus } from "@tanymtor/shared";
import { db, pool } from "../db/client";
import { interventions } from "../db/schema";

type Row = typeof interventions.$inferSelect;

function toDomain(row: Row): Intervention {
  return {
    id: row.id,
    signalId: row.signalId,
    studentId: row.studentId,
    subjectId: row.subjectId,
    teacherId: row.teacherId,
    presumedCause: row.presumedCause,
    action: row.action,
    baseline: row.baseline,
    dropLevel: row.dropLevel,
    startedAt: row.startedAt.toISOString(),
    reviewAfterWeeks: row.reviewAfterWeeks,
    status: row.status as InterventionStatus,
  };
}

export const interventionStore = {
  async list(): Promise<Intervention[]> {
    const rows = await db
      .select()
      .from(interventions)
      .orderBy(asc(interventions.startedAt));
    return rows.map(toDomain);
  },

  async get(id: string): Promise<Intervention | undefined> {
    const [row] = await db
      .select()
      .from(interventions)
      .where(eq(interventions.id, id))
      .limit(1);
    return row ? toDomain(row) : undefined;
  },

  async findBySignal(signalId: string): Promise<Intervention | undefined> {
    const [row] = await db
      .select()
      .from(interventions)
      .where(eq(interventions.signalId, signalId))
      .limit(1);
    return row ? toDomain(row) : undefined;
  },

  async add(intervention: Intervention): Promise<Intervention> {
    const [row] = await db
      .insert(interventions)
      .values({
        ...intervention,
        startedAt: new Date(intervention.startedAt),
      })
      .returning();
    return toDomain(row);
  },

  async nextId(): Promise<string> {
    const result = await pool.query<{ value: string }>(
      "SELECT nextval('interventions_id_seq') AS value"
    );
    return `int-${result.rows[0].value}`;
  },
};
