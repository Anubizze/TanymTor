import type { AnalysisConfig } from "./types";

export const defaultConfig: AnalysisConfig = {
  scale: { min: 0, max: 10, passingThreshold: 5 },
  minGradesPerWeek: 3,
  baselineWeeks: 8,
  minBaselineWeeks: 3,
  watchSigmas: 1,
  attentionSigmas: 1.5,
  minAbsoluteDrop: 0.5,
  classWideDropThreshold: 0.5,
  recoveryTolerance: 0.3,
  sustainedWeeksForOutcome: 2,
  reviewAfterWeeks: 3,
};

export function withConfig(overrides: Partial<AnalysisConfig>): AnalysisConfig {
  return { ...defaultConfig, ...overrides };
}
