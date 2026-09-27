"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mean = mean;
exports.stdDev = stdDev;
exports.round = round;
function mean(values) {
    if (values.length === 0)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function stdDev(values) {
    if (values.length < 2)
        return 0;
    const average = mean(values);
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
        (values.length - 1);
    return Math.sqrt(variance);
}
function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}
