"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.withConfig = withConfig;
exports.defaultConfig = {
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
function withConfig(overrides) {
    return { ...exports.defaultConfig, ...overrides };
}
