export interface ParsedGradeRow {
    name: string;
    subject: string;
    date: string;
    value: number;
}
/** CSV/TSV из журнала: ученик, предмет, дата, оценка. */
export declare function parseGradeCsv(text: string): ParsedGradeRow[];
//# sourceMappingURL=grade-csv.d.ts.map