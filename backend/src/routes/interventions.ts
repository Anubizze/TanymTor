import { Router } from "express";
import { createIntervention, reviewIntervention } from "@tanymtor/shared";
import type { Intervention, InterventionReview } from "@tanymtor/shared";
import {
  evaluateSnapshot,
  findSeries,
  isSignal,
  loadAnalysis,
  type AnalysisSnapshot,
} from "../services/analysis";
import { interventionStore } from "../store/interventions";
import type { AuthedRequest } from "../middleware/auth";

export const interventionsRouter = Router();

interventionsRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const snapshot = await loadAnalysis(req.teacher?.id);
    const nameById = new Map(
      snapshot.students.map((student) => [student.id, student.name])
    );

    const items = (await interventionStore.list()).filter(
      (item) => item.teacherId === req.teacher?.id
    );

    res.json({
      interventions: items.map((intervention) => ({
        intervention,
        studentName:
          nameById.get(intervention.studentId) ?? intervention.studentId,
        review: buildReview(intervention, snapshot),
      })),
    });
  } catch (error) {
    next(error);
  }
});

interventionsRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { signalId, presumedCause, action } = req.body ?? {};

    if (!signalId || !presumedCause || !action) {
      res.status(400).json({
        error:
          "Нужно указать signalId, presumedCause (предполагаемая причина) и action (что делает учитель).",
      });
      return;
    }

    const snapshot = await loadAnalysis(req.teacher?.id);
    const found = evaluateSnapshot(snapshot)
      .filter(isSignal)
      .find((evaluation) => evaluation.signal.id === signalId);

    if (!found) {
      res.status(404).json({ error: `Сигнал ${signalId} не найден` });
      return;
    }

    const existing = await interventionStore.findBySignal(signalId);
    if (existing) {
      res.status(409).json({
        error: "По этому сигналу уже зарегистрировано вмешательство",
        intervention: existing,
      });
      return;
    }

    const intervention = await interventionStore.add(
      createIntervention({
        id: await interventionStore.nextId(),
        signal: found.signal,
        teacherId: req.teacher?.id ?? "unknown",
        presumedCause,
        action,
      })
    );

    res.status(201).json({ intervention });
  } catch (error) {
    next(error);
  }
});

interventionsRouter.get("/:id/review", async (req: AuthedRequest, res, next) => {
  try {
    const intervention = await interventionStore.get(req.params.id);
    if (!intervention || intervention.teacherId !== req.teacher?.id) {
      res.status(404).json({ error: `Вмешательство ${req.params.id} не найдено` });
      return;
    }

    const snapshot = await loadAnalysis(req.teacher?.id);
    const review = buildReview(intervention, snapshot);

    if (!review) {
      res.status(404).json({ error: "Нет данных по ученику для проверки результата" });
      return;
    }

    res.json({ intervention, review });
  } catch (error) {
    next(error);
  }
});

function buildReview(
  intervention: Intervention,
  snapshot: AnalysisSnapshot
): InterventionReview | null {
  const series = findSeries(
    snapshot.series,
    intervention.studentId,
    intervention.subjectId
  );
  if (!series) return null;

  return reviewIntervention(
    intervention,
    series,
    snapshot.classSeriesBySubject.get(intervention.subjectId)
  );
}
