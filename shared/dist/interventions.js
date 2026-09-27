"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_CAVEAT = void 0;
exports.createIntervention = createIntervention;
exports.reviewIntervention = reviewIntervention;
const config_1 = require("./config");
const series_1 = require("./series");
const stats_1 = require("./stats");
const text_1 = require("./text");
exports.REVIEW_CAVEAT = "Изменение результата могло произойти и без вмешательства — в том числе за счёт естественного возврата к обычному уровню ученика. Система фиксирует совпадение во времени, а не причинно-следственную связь.";
function createIntervention(input) {
    const config = input.config ?? config_1.defaultConfig;
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
function reviewIntervention(intervention, series, classSeries, config = config_1.defaultConfig, reviewedAt = new Date().toISOString()) {
    const observed = series.points.filter((point) => point.weekStart > intervention.startedAt &&
        point.gradeCount >= config.minGradesPerWeek);
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
            message: `После начала работы прошло ${(0, text_1.pluralWeeks)(observed.length)} с достаточным количеством оценок. Для вывода о результате нужно не менее ${(0, text_1.pluralWeeks)(config.sustainedWeeksForOutcome)}.`,
            caveat: exports.REVIEW_CAVEAT,
        };
    }
    const classChange = classSeries
        ? getClassChange(classSeries, intervention.startedAt, latest.weekStart)
        : 0;
    const changeSinceDrop = (0, stats_1.round)(latest.average - intervention.dropLevel);
    const changeVsBaseline = (0, stats_1.round)(latest.average - intervention.baseline);
    const adjustedChange = (0, stats_1.round)(changeSinceDrop - classChange);
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
        classChangeSamePeriod: (0, stats_1.round)(classChange),
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
        caveat: exports.REVIEW_CAVEAT,
    };
}
function decideOutcome(args) {
    const { changeVsBaseline, adjustedChange, sustainedWeeks, config } = args;
    if (adjustedChange <= -config.minAbsoluteDrop)
        return "worsened";
    const reachedBaseline = changeVsBaseline >= -config.recoveryTolerance;
    const heldLongEnough = sustainedWeeks >= config.sustainedWeeksForOutcome;
    if (reachedBaseline && heldLongEnough && adjustedChange > 0) {
        return "recovered";
    }
    if (adjustedChange >= config.minAbsoluteDrop)
        return "partial";
    return "no_change";
}
function countSustained(points, level) {
    let count = 0;
    for (let i = points.length - 1; i >= 0; i--) {
        if (points[i].average < level)
            break;
        count++;
    }
    return count;
}
function getClassChange(classSeries, fromWeek, toWeek) {
    const from = (0, series_1.pointAt)(classSeries.points, fromWeek) ??
        classSeries.points.find((point) => point.weekStart >= fromWeek);
    const to = (0, series_1.pointAt)(classSeries.points, toWeek);
    if (!from || !to)
        return 0;
    return to.average - from.average;
}
function buildReviewMessage(args) {
    const { outcome, intervention, levelNow, sustainedWeeks, classChange } = args;
    const from = (0, text_1.formatScore)(intervention.dropLevel);
    const to = (0, text_1.formatScore)(levelNow);
    const baseline = (0, text_1.formatScore)(intervention.baseline);
    const classNote = Math.abs(classChange) >= args.config.classWideDropThreshold
        ? ` За тот же период средний балл класса изменился на ${(0, text_1.formatScore)(classChange)} — это учтено при оценке.`
        : "";
    switch (outcome) {
        case "recovered":
            return `После дополнительной работы наблюдается положительная динамика: средний результат повысился с ${from} до ${to} и держится ${(0, text_1.pluralWeeks)(sustainedWeeks)} на уровне до снижения (${baseline}).${classNote}`;
        case "partial":
            return `Наблюдается положительная динамика: средний результат повысился с ${from} до ${to}, но пока не закрепился на уровне до снижения (${baseline}). Рекомендуется продолжить работу.${classNote}`;
        case "worsened":
            return `После начала дополнительной работы результат продолжил снижаться: ${from} → ${to}. Рекомендуется пересмотреть принятое решение и провести повторную диагностику.${classNote}`;
        default:
            return `Значимого изменения результата не зафиксировано: ${from} → ${to}. Рекомендуется пересмотреть характер дополнительной работы.${classNote}`;
    }
}
