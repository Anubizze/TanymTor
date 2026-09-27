"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoWeekStart = isoWeekStart;
exports.addDays = addDays;
exports.addWeeks = addWeeks;
exports.buildStudentSeries = buildStudentSeries;
exports.buildClassSeries = buildClassSeries;
exports.buildClassSeriesBySubject = buildClassSeriesBySubject;
exports.pointAt = pointAt;
const stats_1 = require("./stats");
function isoWeekStart(dateISO) {
    const date = new Date(dateISO);
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const weekday = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() - (weekday - 1));
    return utc.toISOString().slice(0, 10);
}
function addDays(dateISO, count) {
    const date = new Date(`${dateISO.slice(0, 10)}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
}
function addWeeks(weekStart, count) {
    return addDays(weekStart, count * 7);
}
function buildStudentSeries(grades) {
    const buckets = new Map();
    for (const grade of grades) {
        const key = `${grade.studentId}::${grade.subjectId}`;
        const week = isoWeekStart(grade.date);
        const weeks = buckets.get(key) ?? new Map();
        const values = weeks.get(week) ?? [];
        values.push(grade.value);
        weeks.set(week, values);
        buckets.set(key, weeks);
    }
    return Array.from(buckets.entries()).map(([key, weeks]) => {
        const [studentId, subjectId] = key.split("::");
        return { studentId, subjectId, points: toPoints(weeks) };
    });
}
function buildClassSeries(series, subjectId) {
    const weeks = new Map();
    for (const studentSeries of series) {
        if (studentSeries.subjectId !== subjectId)
            continue;
        for (const point of studentSeries.points) {
            const entry = weeks.get(point.weekStart) ?? {
                averages: [],
                gradeCount: 0,
            };
            entry.averages.push(point.average);
            entry.gradeCount += point.gradeCount;
            weeks.set(point.weekStart, entry);
        }
    }
    const points = Array.from(weeks.entries())
        .map(([weekStart, entry]) => ({
        weekStart,
        average: (0, stats_1.round)((0, stats_1.mean)(entry.averages)),
        gradeCount: entry.gradeCount,
    }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    return { subjectId, points };
}
function buildClassSeriesBySubject(series) {
    const subjectIds = Array.from(new Set(series.map((s) => s.subjectId)));
    return new Map(subjectIds.map((subjectId) => [
        subjectId,
        buildClassSeries(series, subjectId),
    ]));
}
function pointAt(points, weekStart) {
    return points.find((point) => point.weekStart === weekStart);
}
function toPoints(weeks) {
    return Array.from(weeks.entries())
        .map(([weekStart, values]) => ({
        weekStart,
        average: (0, stats_1.round)((0, stats_1.mean)(values)),
        gradeCount: values.length,
    }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
