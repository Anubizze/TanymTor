import { desc, eq, ne } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { teachers } from "../db/schema";
import { publicTeacher, type AuthedRequest } from "../middleware/auth";

export const adminRouter = Router();

adminRouter.get("/teachers", async (req: AuthedRequest, res, next) => {
  try {
    const rows = await db
      .select()
      .from(teachers)
      .where(ne(teachers.role, "admin"))
      .orderBy(desc(teachers.createdAt));

    res.json({
      teachers: rows.map((row) => ({
        ...publicTeacher(row),
        createdAt: row.createdAt,
        approvedAt: row.approvedAt,
        approvedBy: row.approvedBy,
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/teachers/:id/approve", async (req: AuthedRequest, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, req.params.id))
      .limit(1);

    if (!user || user.role === "admin") {
      res.status(404).json({ error: "Учитель не найден" });
      return;
    }

    const [updated] = await db
      .update(teachers)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedBy: req.teacher!.id,
      })
      .where(eq(teachers.id, user.id))
      .returning();

    res.json({ teacher: publicTeacher(updated) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/teachers/:id/reject", async (req: AuthedRequest, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, req.params.id))
      .limit(1);

    if (!user || user.role === "admin") {
      res.status(404).json({ error: "Учитель не найден" });
      return;
    }

    const [updated] = await db
      .update(teachers)
      .set({
        status: "rejected",
        approvedAt: new Date(),
        approvedBy: req.teacher!.id,
      })
      .where(eq(teachers.id, user.id))
      .returning();

    res.json({ teacher: publicTeacher(updated) });
  } catch (error) {
    next(error);
  }
});
