import { defaultConfig } from "./config";
import {
  buildClassSeriesBySubject,
  buildStudentSeries,
  pointAt,
} from "./series";
import { mean, round, stdDev } from "./stats";
import { formatScore, pluralWeeks } from "./text";
import type {
  AnalysisConfig,
  ClassSubjectSeries,
  Grade,
  Signal,
  SignalEvaluation,
  SignalKind,
  SignalLevel,
  StudentSubjectSeries,
  WeeklyPoint,
} from "./types";

export const SIGNAL_DISCLAIMER =
  "Система фиксирует изменение результата, но не устанавливает его причину. Решение о причине и виде дополнительной работы принимает педагог.";

export function evaluateGrades(
  grades: Grade[],
  config: AnalysisConfig = defaultConfig
): SignalEvaluation[] {
  const series = buildStudentSeries(grades);
  const classSeriesBySubject = buildClassSeriesBySubject(series);

  return series.map((studentSeries) =>
    evaluateStudentSubject(
      studentSeries,
      classSeriesBySubject.get(studentSeries.subjectId),
      config
    )
  );
}

export function evaluateStudentSubject(
  series: StudentSubjectSeries,
  classSeries: ClassSubjectSeries | undefined,
  config: AnalysisConfig = defaultConfig
): SignalEvaluation {
  const { studentId, subjectId } = series;
  const points = series.points.filter(
    (point) => point.gradeCount >= config.minGradesPerWeek
  );
  const latest = points[points.length - 1];

  if (!latest) {
    return {
      status: "insufficient_data",
      studentId,
      subjectId,
      weekStart: series.points[series.points.length - 1]?.weekStart ?? null,
      note: `Недостаточно данных: за неделю нужно не менее ${config.minGradesPerWeek} оценок.`,
    };
  }

  const consecutiveDeclines = countConsecutiveDeclines(points);
  const baselineWindow = getBaselineWindow(points, consecutiveDeclines, config);

  if (baselineWindow.length < config.minBaselineWeeks) {
    return {
      status: "insufficient_data",
      studentId,
      subjectId,
      weekStart: latest.weekStart,
      note: `Недостаточно истории: для расчёта личной нормы нужно не менее ${pluralWeeks(
        config.minBaselineWeeks
      )} наблюдений.`,
    };
  }

  const baselineValues = baselineWindow.map((point) => point.average);
  const baseline = round(mean(baselineValues));
  const volatility = round(stdDev(baselineValues));
  const threshold = round(
    Math.max(config.minAbsoluteDrop, config.watchSigmas * volatility)
  );

  const magnitude = round(latest.average - baseline);
  const classMagnitude = classSeries
    ? round(getClassMagnitude(classSeries, baselineWindow, latest.weekStart))
    : 0;
  const adjustedMagnitude = round(magnitude - classMagnitude);
  const previous = points[points.length - 2]?.average ?? latest.average;

  const belowPassing = latest.average < config.scale.passingThreshold;
  const crossesThreshold = adjustedMagnitude <= -threshold;

  if (!crossesThreshold && !belowPassing) {
    return {
      status: "stable",
      studentId,
      subjectId,
      weekStart: latest.weekStart,
      current: latest.average,
      baseline,
      magnitude,
      volatility,
      threshold,
      note: buildStableNote(magnitude, threshold),
    };
  }

  const reasons: string[] = [];
  let level: SignalLevel = "watch";
  let kind: SignalKind = "decline";

  if (crossesThreshold) {
    reasons.push(
      `Средний балл снизился с ${formatScore(baseline)} до ${formatScore(
        latest.average
      )} — это больше обычного разброса результатов ученика (±${formatScore(
        volatility
      )}).`
    );
    if (adjustedMagnitude <= -config.attentionSigmas * volatility) {
      level = "attention";
    }
  }

  if (consecutiveDeclines >= 2) {
    reasons.push(
      `Снижение зафиксировано ${pluralWeeks(consecutiveDeclines)} подряд.`
    );
    level = "attention";
  }

  if (consecutiveDeclines >= 3) {
    level = "intervene";
  }

  if (belowPassing) {
    reasons.push(
      `Текущий результат ${formatScore(
        latest.average
      )} ниже порога успешности ${formatScore(config.scale.passingThreshold)}.`
    );
    level = "intervene";
    kind = crossesThreshold ? "decline" : "below_threshold";
  }

  const classWide = classMagnitude <= -config.classWideDropThreshold;
  if (classWide) {
    reasons.push(
      `За тот же период средний балл всего класса снизился на ${formatScore(
        Math.abs(classMagnitude)
      )} — часть снижения может объясняться сложностью темы или формы контроля, а не индивидуальными затруднениями.`
    );
  }

  const signal: Signal = {
    id: buildSignalId(studentId, subjectId, latest.weekStart),
    studentId,
    subjectId,
    weekStart: latest.weekStart,
    level,
    kind,
    current: latest.average,
    previous,
    baseline,
    magnitude,
    classMagnitude,
    adjustedMagnitude,
    volatility,
    threshold,
    consecutiveDeclines,
    classWide,
    reasons,
    message: buildSignalMessage(level, kind, baseline, latest.average, config),
    disclaimer: SIGNAL_DISCLAIMER,
  };

  return {
    status: "signal",
    studentId,
    subjectId,
    weekStart: latest.weekStart,
    signal,
  };
}

export function buildSignalId(
  studentId: string,
  subjectId: string,
  weekStart: string
): string {
  return `${studentId}:${subjectId}:${weekStart}`;
}

export function countConsecutiveDeclines(points: WeeklyPoint[]): number {
  let count = 0;
  for (let i = points.length - 1; i > 0; i--) {
    if (points[i].average >= points[i - 1].average) break;
    count++;
  }
  return count;
}

function getBaselineWindow(
  points: WeeklyPoint[],
  consecutiveDeclines: number,
  config: AnalysisConfig
): WeeklyPoint[] {
  const end = points.length - Math.max(consecutiveDeclines, 1);
  if (end <= 0) return [];
  const start = Math.max(0, end - config.baselineWeeks);
  return points.slice(start, end);
}

function getClassMagnitude(
  classSeries: ClassSubjectSeries,
  baselineWindow: WeeklyPoint[],
  weekStart: string
): number {
  const classNow = pointAt(classSeries.points, weekStart);
  if (!classNow) return 0;

  const classBaseline = baselineWindow
    .map((point) => pointAt(classSeries.points, point.weekStart)?.average)
    .filter((value): value is number => value !== undefined);

  if (classBaseline.length === 0) return 0;
  return classNow.average - mean(classBaseline);
}

function buildStableNote(magnitude: number, threshold: number): string {
  if (magnitude >= threshold) {
    return `Положительная динамика: результат выше обычного уровня на ${formatScore(
      magnitude
    )}.`;
  }
  return `Отклонение ${formatScore(
    magnitude
  )} не выходит за пределы обычного разброса (порог ${formatScore(
    threshold
  )}). Сигнал не подаётся.`;
}

function buildSignalMessage(
  level: SignalLevel,
  kind: SignalKind,
  baseline: number,
  current: number,
  config: AnalysisConfig
): string {
  const from = formatScore(baseline);
  const to = formatScore(current);

  if (kind === "below_threshold") {
    return `Результат ${to} ниже порога успешности ${formatScore(
      config.scale.passingThreshold
    )}. Рекомендуется провести диагностику и определить объём дополнительной работы.`;
  }

  switch (level) {
    case "intervene":
      return `Выявлена устойчивая отрицательная динамика учебных результатов: средний балл снизился с ${from} до ${to}. Рекомендуется провести дополнительную диагностику для определения причины снижения и принять решение о дополнительной работе.`;
    case "attention":
      return `Выявлена отрицательная динамика учебных результатов: средний балл снизился с ${from} до ${to}. Рекомендуется обратить внимание на ученика и уточнить причину снижения.`;
    default:
      return `Зафиксировано снижение среднего балла с ${from} до ${to}. Отклонение небольшое — рекомендуется наблюдение без дополнительных мер.`;
  }
}
