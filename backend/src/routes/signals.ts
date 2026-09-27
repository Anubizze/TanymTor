import { Router } from "express";
import { evaluateSnapshot, loadAnalysis } from "../services/analysis";
import type { AuthedRequest } from "../middleware/auth";

export const signalsRouter = Router();

signalsRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const snapshot = await loadAnalysis(req.teacher?.id);
    const nameById = new Map(
      snapshot.students.map((student) => [student.id, student.name])
    );

    const results = evaluateSnapshot(snapshot).map((evaluation) => ({
      ...evaluation,
      studentName: nameById.get(evaluation.studentId) ?? evaluation.studentId,
    }));

    res.json({
      source: snapshot.source.name,
      generatedAt: new Date().toISOString(),
      counts: {
        signals: results.filter((r) => r.status === "signal").length,
        stable: results.filter((r) => r.status === "stable").length,
        insufficientData: results.filter(
          (r) => r.status === "insufficient_data"
        ).length,
      },
      results,
    });
  } catch (error) {
    next(error);
  }
});

signalsRouter.get("/series/:studentId/:subjectId", async (req: AuthedRequest, res, next) => {
  try {
    const snapshot = await loadAnalysis(req.teacher?.id);
    const series = snapshot.series.find(
      (item) =>
        item.studentId === req.params.studentId &&
        item.subjectId === req.params.subjectId
    );

    if (!series) {
      res.status(404).json({ error: "Данные по ученику и предмету не найдены" });
      return;
    }

    res.json({
      series,
      classSeries: snapshot.classSeriesBySubject.get(req.params.subjectId),
    });
  } catch (error) {
    next(error);
  }
});
