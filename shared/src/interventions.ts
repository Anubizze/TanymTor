import { defaultConfig } from "./config";
import { pointAt } from "./series";
import { round } from "./stats";
import { formatScore, pluralWeeks } from "./text";
import type {
  AnalysisConfig,
  ClassSubjectSeries,
  Intervention,
  InterventionOutcome,
  InterventionReview,
  Signal,
  StudentSubjectSeries,
  WeeklyPoint,
} from "./types";

export const REVIEW_CAVEAT =
  "Изменение результата могло произойти и без вмешательства — в том числе за счёт естественного возврата к обычному уровню ученика. Система фиксирует совпадение во времени, а не причинно-следственную связь.";

export interface CreateInterventionInput {
  id: string;
  signal: Signal;
  teacherId: string;
  presumedCause: string;
  action: string;
  startedAt?: string;
  reviewAfterWeeks?: number;
  config?: AnalysisConfig;
}

export function createIntervention(
  input: CreateInterventionInput
): Intervention {
  const config = input.config ?? defaultConfig;
  return {
    id: input.id,
    signalId: input.signal.id,
    studentId: input.signal.studentId,
    subjectId: input.signal.subjectId,
    teacherId: input.teacherId,
    presumedCause: input.presumedCause,
    action: input.action,
    baseline: input.signal.baseline,
    dropLevel: input.signal.current,
    startedAt: input.startedAt ?? input.signal.weekStart,
    reviewAfterWeeks: input.reviewAfterWeeks ?? config.reviewAfterWeeks,
    status: "active",
  };
}

export function reviewIntervention(
  intervention: Intervention,
  series: StudentSubjectSeries,
  classSeries: ClassSubjectSeries | undefined,
  config: AnalysisConfig = defaultConfig,
  reviewedAt: string = new Date().toISOString()
): InterventionReview {
  const observed = series.points.filter(
    (point) =>
      point.weekStart > intervention.startedAt &&
      point.gradeCount >= config.minGradesPerWeek
  );
  const latest = observed[observed.length - 1];

  if (!latest || observed.length < config.sustainedWeeksForOutcome) {
    return {
      interventionId: intervention.id,
      reviewedAt,
      weeksObserved: observed.length,
      levelNow: latest?.average ?? null,
      changeSinceDrop: 0,
      changeVsBaseline: 0,
      classChangeSamePeriod: 0,
      adjustedChange: 0,
      sustainedWeeks: 0,
      outcome: "inconclusive",
      message: `После начала работы прошло ${pluralWeeks(
        observed.length
      )} с достаточным количеством оценок. Для вывода о результате нужно не менее ${pluralWeeks(
        config.sustainedWeeksForOutcome
      )}.`,
      caveat: REVIEW_CAVEAT,
    };
  }

  const classChange = classSeries
    ? getClassChange(classSeries, intervention.startedAt, latest.weekStart)
    : 0;
  const changeSinceDrop = round(latest.average - intervention.dropLevel);
  const changeVsBaseline = round(latest.average - intervention.baseline);
  const adjustedChange = round(changeSinceDrop - classChange);
  const recoveryLevel = intervention.baseline - config.recoveryTolerance;
  const sustainedWeeks = countSustained(observed, recoveryLevel);

  const outcome = decideOutcome({
    changeVsBaseline,
    adjustedChange,
    sustainedWeeks,
    config,
  });

  return {
    interventionId: intervention.id,
    reviewedAt,
    weeksObserved: observed.length,
    levelNow: latest.average,
    changeSinceDrop,
    changeVsBaseline,
    classChangeSamePeriod: round(classChange),
    adjustedChange,
    sustainedWeeks,
    outcome,
    message: buildReviewMessage({
      outcome,
      intervention,
      levelNow: latest.average,
      sustainedWeeks,
      classChange,
      config,
    }),
    caveat: REVIEW_CAVEAT,
  };
}

function decideOutcome(args: {
  changeVsBaseline: number;
  adjustedChange: number;
  sustainedWeeks: number;
  config: AnalysisConfig;
}): InterventionOutcome {
  const { changeVsBaseline, adjustedChange, sustainedWeeks, config } = args;

  if (adjustedChange <= -config.minAbsoluteDrop) return "worsened";

  const reachedBaseline = changeVsBaseline >= -config.recoveryTolerance;
  const heldLongEnough = sustainedWeeks >= config.sustainedWeeksForOutcome;
  if (reachedBaseline && heldLongEnough && adjustedChange > 0) {
    return "recovered";
  }

  if (adjustedChange >= config.minAbsoluteDrop) return "partial";
  return "no_change";
}

function countSustained(points: WeeklyPoint[], level: number): number {
  let count = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].average < level) break;
    count++;
  }
  return count;
}

function getClassChange(
  classSeries: ClassSubjectSeries,
  fromWeek: string,
  toWeek: string
): number {
  const from =
    pointAt(classSeries.points, fromWeek) ??
    classSeries.points.find((point) => point.weekStart >= fromWeek);
  const to = pointAt(classSeries.points, toWeek);
  if (!from || !to) return 0;
  return to.average - from.average;
}

function buildReviewMessage(args: {
  outcome: InterventionOutcome;
  intervention: Intervention;
  levelNow: number;
  sustainedWeeks: number;
  classChange: number;
  config: AnalysisConfig;
}): string {
  const { outcome, intervention, levelNow, sustainedWeeks, classChange } = args;
  const from = formatScore(intervention.dropLevel);
  const to = formatScore(levelNow);
  const baseline = formatScore(intervention.baseline);

  const classNote =
    Math.abs(classChange) >= args.config.classWideDropThreshold
      ? ` За тот же период средний балл класса изменился на ${formatScore(
          classChange
        )} — это учтено при оценке.`
      : "";

  switch (outcome) {
    case "recovered":
      return `После дополнительной работы наблюдается положительная динамика: средний результат повысился с ${from} до ${to} и держится ${pluralWeeks(
        sustainedWeeks
      )} на уровне до снижения (${baseline}).${classNote}`;
    case "partial":
      return `Наблюдается положительная динамика: средний результат повысился с ${from} до ${to}, но пока не закрепился на уровне до снижения (${baseline}). Рекомендуется продолжить работу.${classNote}`;
    case "worsened":
      return `После начала дополнительной работы результат продолжил снижаться: ${from} → ${to}. Рекомендуется пересмотреть принятое решение и провести повторную диагностику.${classNote}`;
    default:
      return `Значимого изменения результата не зафиксировано: ${from} → ${to}. Рекомендуется пересмотреть характер дополнительной работы.${classNote}`;
  }
}
