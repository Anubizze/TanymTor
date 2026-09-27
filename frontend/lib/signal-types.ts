export type SignalLevel = "watch" | "attention" | "intervene";

export interface Signal {
  id: string;
  studentId: string;
  subjectId: string;
  weekStart: string;
  level: SignalLevel;
  kind: "decline" | "below_threshold";
  current: number;
  previous: number;
  baseline: number;
  magnitude: number;
  classMagnitude: number;
  adjustedMagnitude: number;
  consecutiveDeclines: number;
  classWide: boolean;
  reasons: string[];
  message: string;
  disclaimer: string;
}

export interface SignalResult {
  status: "signal" | "stable" | "insufficient_data";
  studentId: string;
  subjectId: string;
  studentName: string;
  weekStart?: string | null;
  note?: string;
  current?: number;
  baseline?: number;
  signal?: Signal;
}

export interface SignalsPayload {
  source: string;
  generatedAt: string;
  counts: {
    signals: number;
    stable: number;
    insufficientData: number;
  };
  results: SignalResult[];
}

export interface Intervention {
  id: string;
  signalId: string;
  studentId: string;
  subjectId: string;
  teacherId: string;
  presumedCause: string;
  action: string;
  baseline: number;
  dropLevel: number;
  startedAt: string;
  reviewAfterWeeks: number;
  status: "active" | "under_review" | "completed" | "cancelled";
}

export type InterventionOutcome =
  | "recovered"
  | "partial"
  | "no_change"
  | "worsened"
  | "inconclusive";

export interface InterventionReview {
  interventionId: string;
  reviewedAt: string;
  weeksObserved: number;
  levelNow: number | null;
  changeSinceDrop: number;
  changeVsBaseline: number;
  classChangeSamePeriod: number;
  adjustedChange: number;
  sustainedWeeks: number;
  outcome: InterventionOutcome;
  message: string;
  caveat: string;
}

export interface InterventionItem {
  intervention: Intervention;
  studentName: string;
  review: InterventionReview | null;
}

export const CAUSE_PRESETS = [
  "Не усвоена тема",
  "Пропуски занятий",
  "Сложность контрольной / темы",
  "Нужна диагностика — причина пока неясна",
  "Личные обстоятельства (без деталей в системе)",
];

export const ACTION_PRESETS = [
  "Индивидуальная консультация",
  "Повтор темы на уроке",
  "Дополнительные задания",
  "Работа в паре / группе",
  "Разговор с родителем",
  "Наблюдение без дополнительных мер",
];

export const LEVEL_LABEL: Record<SignalLevel, string> = {
  watch: "Наблюдение",
  attention: "Внимание",
  intervene: "Действовать",
};

export const OUTCOME_LABEL: Record<InterventionOutcome, string> = {
  recovered: "Восстановление",
  partial: "Частичный сдвиг",
  no_change: "Без изменения",
  worsened: "Ухудшение",
  inconclusive: "Пока рано судить",
};
