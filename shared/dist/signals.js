"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNAL_DISCLAIMER = void 0;
exports.evaluateGrades = evaluateGrades;
exports.evaluateStudentSubject = evaluateStudentSubject;
exports.buildSignalId = buildSignalId;
exports.countConsecutiveDeclines = countConsecutiveDeclines;
const config_1 = require("./config");
const series_1 = require("./series");
const stats_1 = require("./stats");
const text_1 = require("./text");
exports.SIGNAL_DISCLAIMER = "Система фиксирует изменение результата, но не устанавливает его причину. Решение о причине и виде дополнительной работы принимает педагог.";
function evaluateGrades(grades, config = config_1.defaultConfig) {
    const series = (0, series_1.buildStudentSeries)(grades);
    const classSeriesBySubject = (0, series_1.buildClassSeriesBySubject)(series);
    return series.map((studentSeries) => evaluateStudentSubject(studentSeries, classSeriesBySubject.get(studentSeries.subjectId), config));
}
function evaluateStudentSubject(series, classSeries, config = config_1.defaultConfig) {
    const { studentId, subjectId } = series;
    const points = series.points.filter((point) => point.gradeCount >= config.minGradesPerWeek);
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
            note: `Недостаточно истории: для расчёта личной нормы нужно не менее ${(0, text_1.pluralWeeks)(config.minBaselineWeeks)} наблюдений.`,
        };
    }
    const baselineValues = baselineWindow.map((point) => point.average);
    const baseline = (0, stats_1.round)((0, stats_1.mean)(baselineValues));
    const volatility = (0, stats_1.round)((0, stats_1.stdDev)(baselineValues));
    const threshold = (0, stats_1.round)(Math.max(config.minAbsoluteDrop, config.watchSigmas * volatility));
    const magnitude = (0, stats_1.round)(latest.average - baseline);
    const classMagnitude = classSeries
        ? (0, stats_1.round)(getClassMagnitude(classSeries, baselineWindow, latest.weekStart))
        : 0;
    const adjustedMagnitude = (0, stats_1.round)(magnitude - classMagnitude);
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
    const reasons = [];
    let level = "watch";
    let kind = "decline";
    if (crossesThreshold) {
        reasons.push(`Средний балл снизился с ${(0, text_1.formatScore)(baseline)} до ${(0, text_1.formatScore)(latest.average)} — это больше обычного разброса результатов ученика (±${(0, text_1.formatScore)(volatility)}).`);
        if (adjustedMagnitude <= -config.attentionSigmas * volatility) {
            level = "attention";
        }
    }
    if (consecutiveDeclines >= 2) {
        reasons.push(`Снижение зафиксировано ${(0, text_1.pluralWeeks)(consecutiveDeclines)} подряд.`);
        level = "attention";
    }
    if (consecutiveDeclines >= 3) {
        level = "intervene";
    }
    if (belowPassing) {
        reasons.push(`Текущий результат ${(0, text_1.formatScore)(latest.average)} ниже порога успешности ${(0, text_1.formatScore)(config.scale.passingThreshold)}.`);
        level = "intervene";
        kind = crossesThreshold ? "decline" : "below_threshold";
    }
    const classWide = classMagnitude <= -config.classWideDropThreshold;
    if (classWide) {
        reasons.push(`За тот же период средний балл всего класса снизился на ${(0, text_1.formatScore)(Math.abs(classMagnitude))} — часть снижения может объясняться сложностью темы или формы контроля, а не индивидуальными затруднениями.`);
    }
    const signal = {
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
        disclaimer: exports.SIGNAL_DISCLAIMER,
    };
    return {
        status: "signal",
        studentId,
        subjectId,
        weekStart: latest.weekStart,
        signal,
    };
}
function buildSignalId(studentId, subjectId, weekStart) {
    return `${studentId}:${subjectId}:${weekStart}`;
}
function countConsecutiveDeclines(points) {
    let count = 0;
    for (let i = points.length - 1; i > 0; i--) {
        if (points[i].average >= points[i - 1].average)
            break;
        count++;
    }
    return count;
}
function getBaselineWindow(points, consecutiveDeclines, config) {
    const end = points.length - Math.max(consecutiveDeclines, 1);
    if (end <= 0)
        return [];
    const start = Math.max(0, end - config.baselineWeeks);
    return points.slice(start, end);
}
function getClassMagnitude(classSeries, baselineWindow, weekStart) {
    const classNow = (0, series_1.pointAt)(classSeries.points, weekStart);
    if (!classNow)
        return 0;
    const classBaseline = baselineWindow
        .map((point) => (0, series_1.pointAt)(classSeries.points, point.weekStart)?.average)
        .filter((value) => value !== undefined);
    if (classBaseline.length === 0)
        return 0;
    return classNow.average - (0, stats_1.mean)(classBaseline);
}
function buildStableNote(magnitude, threshold) {
    if (magnitude >= threshold) {
        return `Положительная динамика: результат выше обычного уровня на ${(0, text_1.formatScore)(magnitude)}.`;
    }
    return `Отклонение ${(0, text_1.formatScore)(magnitude)} не выходит за пределы обычного разброса (порог ${(0, text_1.formatScore)(threshold)}). Сигнал не подаётся.`;
}
function buildSignalMessage(level, kind, baseline, current, config) {
    const from = (0, text_1.formatScore)(baseline);
    const to = (0, text_1.formatScore)(current);
    if (kind === "below_threshold") {
        return `Результат ${to} ниже порога успешности ${(0, text_1.formatScore)(config.scale.passingThreshold)}. Рекомендуется провести диагностику и определить объём дополнительной работы.`;
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
