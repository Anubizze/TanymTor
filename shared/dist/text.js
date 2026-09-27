"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatScore = formatScore;
exports.pluralWeeks = pluralWeeks;
function formatScore(value) {
    return value.toFixed(1).replace(".", ",");
}
function pluralWeeks(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11)
        return `${count} неделю`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return `${count} недели`;
    }
    return `${count} недель`;
}
