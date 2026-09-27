export interface Subject {
    id: string;
    name: string;
}
export interface StudentRef {
    id: string;
    name: string;
}
export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    value: number;
    date: string;
}
export interface GradingScale {
    min: number;
    max: number;
    passingThreshold: number;
}
export interface AnalysisConfig {
    scale: GradingScale;
    minGradesPerWeek: number;
    baselineWeeks: number;
    minBaselineWeeks: number;
    watchSigmas: number;
    attentionSigmas: number;
    minAbsoluteDrop: number;
    classWideDropThreshold: number;
    recoveryTolerance: number;
    sustainedWeeksForOutcome: number;
    reviewAfterWeeks: number;
}
export interface WeeklyPoint {
    weekStart: string;
    average: number;
    gradeCount: number;
}
export interface StudentSubjectSeries {
    studentId: string;
    subjectId: string;
    points: WeeklyPoint[];
}
export interface ClassSubjectSeries {
    subjectId: string;
    points: WeeklyPoint[];
}
export type SignalLevel = "watch" | "attention" | "intervene";
export type SignalKind = "decline" | "below_threshold";
export interface Signal {
    id: string;
    studentId: string;
    subjectId: string;
    weekStart: string;
    level: SignalLevel;
    kind: SignalKind;
    current: number;
    previous: number;
    baseline: number;
    magnitude: number;
    classMagnitude: number;
    adjustedMagnitude: number;
    volatility: number;
    threshold: number;
    consecutiveDeclines: number;
    classWide: boolean;
    reasons: string[];
    message: string;
    disclaimer: string;
}
export type SignalEvaluation = {
    status: "insufficient_data";
    studentId: string;
    subjectId: string;
    weekStart: string | null;
    note: string;
} | {
    status: "stable";
    studentId: string;
    subjectId: string;
    weekStart: string;
    current: number;
    baseline: number;
    magnitude: number;
    volatility: number;
    threshold: number;
    note: string;
} | {
    status: "signal";
    studentId: string;
    subjectId: string;
    weekStart: string;
    signal: Signal;
};
export type InterventionStatus = "active" | "under_review" | "completed" | "cancelled";
export type InterventionOutcome = "recovered" | "partial" | "no_change" | "worsened" | "inconclusive";
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
    status: InterventionStatus;
}
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
//# sourceMappingURL=types.d.ts.map