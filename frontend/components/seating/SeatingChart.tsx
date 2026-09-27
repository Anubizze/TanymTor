"use client";

import { X } from "lucide-react";
import {
  SEATS_PER_DESK,
  heatBand,
  mean,
  nameParts,
  scoresInDesk,
  scoresInRow,
  seatKey,
} from "@/lib/seating";
import type { Mark, SeatingLayout } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SeatStudent {
  id: string;
  name: string;
  percentage: number | null;
}

export interface SeatSelection {
  studentId: string;
  fromSeat?: string;
}

const heatFill: Record<ReturnType<typeof heatBand>, string> = {
  high: "bg-emerald-50 text-emerald-950",
  mid: "bg-amber-50 text-amber-950",
  low: "bg-rose-50 text-rose-950",
  empty: "bg-slate-50 text-slate-700",
};

const heatBar: Record<ReturnType<typeof heatBand>, string> = {
  high: "bg-emerald-500",
  mid: "bg-amber-400",
  low: "bg-rose-500",
  empty: "bg-slate-300",
};

export interface SeatMarking {
  getMark: (studentId: string) => Mark;
  onToggle: (studentId: string, mark: "+" | "-") => void;
}

interface SeatingMatrixProps {
  layout: SeatingLayout;
  studentById: Map<string, SeatStudent>;
  heatmap: boolean;
  selection: SeatSelection | null;
  hoverSeat: string | null;
  onHoverSeat: (seat: string | null) => void;
  onSeatClick: (seat: string) => void;
  onClear: (seat: string) => void;
  marking?: SeatMarking | null;
}

export function SeatingMatrix({
  layout,
  studentById,
  heatmap,
  selection,
  hoverSeat,
  onHoverSeat,
  onSeatClick,
  onClear,
  marking,
}: SeatingMatrixProps) {
  const rows = Array.from({ length: layout.rows }, (_, row) => row);
  const columns = Array.from({ length: layout.columns }, (_, column) => column);

  const percentageByStudent = new Map(
    [...studentById.values()].map((student) => [student.id, student.percentage])
  );

  const rowAverages = rows.map((row) =>
    mean(scoresInRow(layout, row, percentageByStudent))
  );
  const deskAverages = columns.map((column) =>
    mean(scoresInDesk(layout, column, percentageByStudent))
  );
  const seatedScores = Object.values(layout.assignments)
    .map((studentId) => studentById.get(studentId)?.percentage)
    .filter((value): value is number => typeof value === "number");
  const seatedAverage = mean(seatedScores);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80">
      <div className="bg-gradient-to-r from-ink-900 via-slate-800 to-ink-900 px-4 py-2.5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
          Доска
        </p>
      </div>

      <div className="overflow-x-auto">
          <table className="w-max min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-14 border-b border-r border-slate-200 bg-slate-50 px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Ряд
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  colSpan={SEATS_PER_DESK}
                  className={cn(
                    "border-b border-slate-200 bg-slate-50/95 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500",
                    column < layout.columns - 1 && "border-r border-slate-200"
                  )}
                >
                  Парта {column + 1}
                </th>
              ))}
              <th className="w-[4.75rem] border-b border-l border-slate-200 bg-slate-50/95 px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Ряд ср.
              </th>
            </tr>
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-1.5" />
              {columns.map((column) =>
                ["Л", "П"].map((side, seat) => (
                  <th
                    key={`${column}-${seat}`}
                    className={cn(
                      "border-b border-slate-100 bg-white py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400",
                      seat === 0 && "border-l border-slate-100",
                      column < layout.columns - 1 &&
                        seat === 1 &&
                        "border-r border-slate-200"
                    )}
                  >
                    {side}
                  </th>
                ))
              )}
              <th className="border-b border-l border-slate-200 bg-white" />
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row} className="group/row">
                <th className="sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-2 text-left text-[13px] font-semibold text-slate-600 shadow-[4px_0_8px_-6px_rgb(15_23_42/0.2)]">
                  <span className="tabular-nums">{row + 1}</span>
                  {row === 0 && (
                    <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wider text-slate-300">
                      у доски
                    </span>
                  )}
                </th>

                {columns.map((column) =>
                  Array.from({ length: SEATS_PER_DESK }, (_, seat) => {
                    const key = seatKey(row, column, seat);
                    const studentId = layout.assignments[key];
                    const student = studentId
                      ? studentById.get(studentId)
                      : undefined;

                    return (
                      <td
                        key={key}
                        className={cn(
                          "min-w-[7.5rem] border-b border-slate-100 p-1.5 align-middle",
                          seat === 0 && "border-l border-slate-100",
                          column < layout.columns - 1 &&
                            seat === 1 &&
                            "border-r border-slate-200"
                        )}
                      >
                        <SeatCell
                          seat={key}
                          student={student}
                          heatmap={heatmap}
                          placing={Boolean(selection)}
                          isSource={selection?.fromSeat === key}
                          isHover={hoverSeat === key}
                          onHover={onHoverSeat}
                          onClick={() => onSeatClick(key)}
                          onClear={() => onClear(key)}
                          mark={
                            marking && student
                              ? marking.getMark(student.id)
                              : undefined
                          }
                          onToggleMark={
                            marking && student
                              ? (mark) => marking.onToggle(student.id, mark)
                              : undefined
                          }
                        />
                      </td>
                    );
                  })
                )}

                <td className="border-b border-l border-slate-200 bg-slate-50/60 px-3 text-center">
                  <AverageChip
                    value={heatmap ? rowAverages[rowIndex] : null}
                    heatmap={heatmap}
                  />
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th className="sticky left-0 z-10 border-r border-t border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Парта ср.
              </th>
              {columns.map((column) => (
                <td
                  key={column}
                  colSpan={SEATS_PER_DESK}
                  className={cn(
                    "border-t border-slate-200 bg-slate-50 px-2 py-3 text-center",
                    column < layout.columns - 1 && "border-r border-slate-200"
                  )}
                >
                  <AverageChip
                    value={heatmap ? deskAverages[column] : null}
                    heatmap={heatmap}
                  />
                </td>
              ))}
              <td className="border-l border-t border-slate-200 bg-slate-100 px-3 py-3 text-center">
                <AverageChip
                  value={heatmap ? seatedAverage : null}
                  heatmap={heatmap}
                  strong
                />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SeatCell({
  seat,
  student,
  heatmap,
  placing,
  isSource,
  isHover,
  onHover,
  onClick,
  onClear,
  mark,
  onToggleMark,
}: {
  seat: string;
  student: SeatStudent | undefined;
  heatmap: boolean;
  placing: boolean;
  isSource: boolean;
  isHover: boolean;
  onHover: (seat: string | null) => void;
  onClick: () => void;
  onClear: () => void;
  mark?: Mark;
  onToggleMark?: (mark: "+" | "-") => void;
}) {
  const band = heatmap ? heatBand(student?.percentage ?? null) : "empty";
  const parts = student ? nameParts(student.name) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => onHover(seat)}
      onMouseLeave={() => onHover(null)}
      title={student?.name ?? "Свободное место"}
      className={cn(
        "group relative flex min-h-[70px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border px-1 py-2 text-center transition-all duration-150",
        onToggleMark && "min-h-[92px]",
        student
          ? cn(heatmap ? heatFill[band] : "bg-white text-slate-800", "border-transparent")
          : "border-dashed border-slate-200 bg-white text-slate-300",
        placing && !student && "border-brand-300 bg-brand-50/70",
        placing && student && !isSource && "ring-2 ring-brand-200",
        isSource && "ring-2 ring-brand-500 ring-offset-2",
        isHover && placing && "scale-[1.03] border-brand-400 bg-brand-50 shadow-md",
        "hover:shadow-[0_8px_20px_-12px_rgb(15_23_42/0.25)]"
      )}
    >
      {student && heatmap && (
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-1 rounded-t-xl",
            heatBar[band]
          )}
        />
      )}

      {student && parts ? (
        <>
          <span className="max-w-full px-0.5 text-[12.5px] font-semibold leading-tight">
            {parts.last}
          </span>
          <span className="mt-0.5 text-[11px] font-medium leading-tight opacity-75">
            {parts.initial}
            {heatmap && (
              <span className="tabular-nums">
                {student.percentage === null ? "" : ` · ${student.percentage}%`}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            aria-label={`Убрать ${student.name}`}
            className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white opacity-0 transition-opacity hover:bg-rose-600 group-hover:flex group-hover:opacity-100"
          >
            <X size={11} />
          </button>
          {onToggleMark && (
            <div className="mt-1.5 flex gap-1">
              {(["+", "-"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMark(value);
                  }}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg text-[12px] font-bold transition-colors",
                    mark === value
                      ? value === "+"
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : "bg-white/80 text-slate-400 hover:text-slate-700"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <span className="text-[11px] font-medium">
          {placing ? "посадить" : "пусто"}
        </span>
      )}
    </div>
  );
}

function AverageChip({
  value,
  heatmap,
  strong,
}: {
  value: number | null;
  heatmap: boolean;
  strong?: boolean;
}) {
  if (!heatmap || value === null) {
    return (
      <span className="text-[12px] font-medium tabular-nums text-slate-400">
        —
      </span>
    );
  }

  const band = heatBand(value);

  return (
    <span
      className={cn(
        "inline-flex min-w-[3rem] items-center justify-center rounded-lg px-2 py-1 text-[12px] font-semibold tabular-nums",
        strong && "text-[13px]",
        band === "high" && "bg-emerald-100 text-emerald-800",
        band === "mid" && "bg-amber-100 text-amber-800",
        band === "low" && "bg-rose-100 text-rose-800"
      )}
    >
      {value}%
    </span>
  );
}
