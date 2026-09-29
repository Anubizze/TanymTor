"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGradeCsv = parseGradeCsv;
const NAME_HEADERS = ["ученик", "фио", "имя", "name", "student", "учащийся"];
const SUBJECT_HEADERS = ["предмет", "subject", "дисциплина"];
const DATE_HEADERS = ["дата", "date", "день"];
const VALUE_HEADERS = ["оценка", "балл", "grade", "value", "отметка"];
function detectDelimiter(line) {
    const commas = (line.match(/,/g) ?? []).length;
    const semis = (line.match(/;/g) ?? []).length;
    return semis > commas ? ";" : ",";
}
function splitLine(line, delimiter) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            quoted = !quoted;
            continue;
        }
        if (char === delimiter && !quoted) {
            cells.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    cells.push(current.trim());
    return cells;
}
function normalizeHeader(value) {
    return value.toLowerCase().replace(/\s+/g, "");
}
function parseDate(raw) {
    const value = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
    const dotted = value.match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
    if (dotted) {
        const day = dotted[1].padStart(2, "0");
        const month = dotted[2].padStart(2, "0");
        return `${dotted[3]}-${month}-${day}`;
    }
    const slash = value.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/);
    if (slash) {
        const day = slash[1].padStart(2, "0");
        const month = slash[2].padStart(2, "0");
        return `${slash[3]}-${month}-${day}`;
    }
    return null;
}
function parseValue(raw) {
    const normalized = raw.replace(",", ".").replace(/[^\d.-]/g, "");
    const value = Number(normalized);
    if (!Number.isFinite(value))
        return null;
    if (value < 0 || value > 10)
        return null;
    return value;
}
function indexOfHeader(headers, aliases) {
    return headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
}
/** CSV/TSV из журнала: ученик, предмет, дата, оценка. */
function parseGradeCsv(text) {
    const lines = text
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length < 2)
        return [];
    const delimiter = detectDelimiter(lines[0]);
    const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
    const nameIndex = indexOfHeader(headers, NAME_HEADERS);
    const subjectIndex = indexOfHeader(headers, SUBJECT_HEADERS);
    const dateIndex = indexOfHeader(headers, DATE_HEADERS);
    const valueIndex = indexOfHeader(headers, VALUE_HEADERS);
    if (nameIndex < 0 || subjectIndex < 0 || dateIndex < 0 || valueIndex < 0) {
        throw new Error("В первой строке нужны колонки: ученик, предмет, дата, оценка");
    }
    const rows = [];
    for (const line of lines.slice(1)) {
        const cells = splitLine(line, delimiter);
        const name = cells[nameIndex] ?? "";
        const subject = cells[subjectIndex] ?? "";
        const date = parseDate(cells[dateIndex] ?? "");
        const value = parseValue(cells[valueIndex] ?? "");
        if (!name || !subject || !date || value === null)
            continue;
        rows.push({ name, subject, date, value });
    }
    return rows;
}
