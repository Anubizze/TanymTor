"use client";

import { useEffect, useMemo, useState } from "react";
import { Eraser, Flame, Minus, Plus, Wand2 } from "lucide-react";
import { EmptyRoster } from "@/components/roster/EmptyRoster";
import {
  SeatingMatrix,
  type SeatSelection,
  type SeatStudent,
} from "@/components/seating/SeatingChart";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { SEATS_PER_DESK, heatBand, shortName } from "@/lib/seating";
import { cn } from "@/lib/utils";
import { useAppStore, useContextLessons, useSeating } from "@/store/useAppStore";

const MAX_ROWS = 8;
const MAX_COLUMNS = 5;

export default function SeatingPage() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const lessons = useContextLessons();
  const layout = useSeating();

  const assignSeat = useAppStore((s) => s.assignSeat);
  const swapSeats = useAppStore((s) => s.swapSeats);
  const setSeatingSize = useAppStore((s) => s.setSeatingSize);
  const autoFillSeating = useAppStore((s) => s.autoFillSeating);
  const clearSeating = useAppStore((s) => s.clearSeating);
  const activeLesson = useAppStore((s) => s.getActiveLesson());
  const toggleMark = useAppStore((s) => s.toggleMark);

  const [heatmap, setHeatmap] = useState(true);
  const [marking, setMarking] = useState(true);
  const [stageId, setStageId] = useState("");
  const [selection, setSelection] = useState<SeatSelection | null>(null);
  const [hoverSeat, setHoverSeat] = useState<string | null>(null);

  const students = useMemo<SeatStudent[]>(() => {
    return classGroup.students.map((student) => {
      const scores = lessons
        .map((lesson) =>
          lesson.studentResults.find((result) => result.studentId === student.id)
        )
        .filter((result) => result && result.plusCount + result.minusCount > 0)
        .map((result) => result!.percentage);

      return {
        id: student.id,
        name: student.name,
        percentage:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
      };
    });
  }, [classGroup, lessons]);

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students]
  );

  const seatedIds = useMemo(
    () => new Set(Object.values(layout.assignments)),
    [layout]
  );

  const unseated = students
    .filter((student) => !seatedIds.has(student.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const capacity = layout.rows * layout.columns * SEATS_PER_DESK;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setSelection(null);
  }, [classGroup.id]);

  useEffect(() => {
    if (!activeLesson) {
      setStageId("");
      return;
    }
    if (!activeLesson.stages.some((stage) => stage.id === stageId)) {
      setStageId(activeLesson.stages[0]?.id ?? "");
    }
  }, [activeLesson, stageId]);

  const placeAt = (seat: string, next: SeatSelection) => {
    if (next.fromSeat) {
      if (next.fromSeat !== seat) swapSeats(next.fromSeat, seat);
    } else {
      assignSeat(seat, next.studentId);
    }
    setSelection(null);
  };

  const handleSeatClick = (seat: string) => {
    const occupant = layout.assignments[seat];

    if (selection) {
      if (selection.fromSeat === seat) {
        setSelection(null);
        return;
      }
      placeAt(seat, selection);
      return;
    }

    if (occupant) {
      setSelection({ studentId: occupant, fromSeat: seat });
    }
  };

  const handleRosterClick = (studentId: string) => {
    if (selection?.studentId === studentId && !selection.fromSeat) {
      setSelection(null);
      return;
    }
    setSelection({ studentId });
  };

  const selectedStudent = selection
    ? studentById.get(selection.studentId)
    : undefined;

  return (
    <div>
      <Header
        title="Матрица мест"
        subtitle={`${classGroup.name} · ${subject.name} · ${seatedIds.size} из ${classGroup.students.length} рассажены`}
      />

      {(!classGroup.id || classGroup.students.length === 0) && (
        <div className="mb-4">
          <EmptyRoster
            title="Некого рассаживать"
            text="Добавьте учеников — и матрица станет кабинетом, а не пустой сеткой."
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]">
        <Stepper
          label="Рядов"
          value={layout.rows}
          min={1}
          max={MAX_ROWS}
          onChange={(rows) => setSeatingSize(rows, layout.columns)}
        />
        <Stepper
          label="Парт в ряду"
          value={layout.columns}
          min={1}
          max={MAX_COLUMNS}
          onChange={(columns) => setSeatingSize(layout.rows, columns)}
        />
        <span className="text-[13px] text-slate-400">{capacity} мест</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setHeatmap((value) => !value)}
            className={cn(
              "ring-focus inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-all",
              heatmap
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <Flame size={15} />
            Тепловая карта
          </button>
          {activeLesson && (
            <>
              <button
                type="button"
                onClick={() => setMarking((value) => !value)}
                className={cn(
                  "ring-focus inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-all",
                  marking
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                +/− на местах
              </button>
              {marking && (
                <select
                  value={stageId}
                  onChange={(event) => setStageId(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700"
                >
                  {activeLesson.stages.map((stage, index) => (
                    <option key={stage.id} value={stage.id}>
                      Этап {index + 1}: {stage.title}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
          <Button variant="secondary" size="sm" onClick={autoFillSeating}>
            <Wand2 size={15} />
            По алфавиту
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              clearSeating();
              setSelection(null);
            }}
            disabled={seatedIds.size === 0}
          >
            <Eraser size={15} />
            Очистить
          </Button>
        </div>
      </div>

      {unseated.length > 0 && (
        <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Без места · нажмите ученика, затем ячейку
            </p>
            {capacity < classGroup.students.length && (
              <p className="text-[12px] text-amber-700">
                Мест меньше, чем учеников
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unseated.map((student) => {
              const active = selection?.studentId === student.id;
              const band = heatBand(student.percentage);

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleRosterClick(student.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[12.5px] font-medium transition-all",
                    active
                      ? "border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                  )}
                >
                  {shortName(student.name)}
                  {heatmap && (
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        band === "high" && "text-emerald-600",
                        band === "mid" && "text-amber-600",
                        band === "low" && "text-rose-600",
                        band === "empty" && "text-slate-400"
                      )}
                    >
                      {student.percentage === null
                        ? "—"
                        : `${student.percentage}%`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selection && selectedStudent && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[13px] text-brand-800">
          <span className="font-semibold">{selectedStudent.name}</span>
          <span className="text-brand-600">
            {selection.fromSeat
              ? "нажмите другую ячейку — поменяются местами"
              : "нажмите ячейку в матрице, чтобы посадить"}
          </span>
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="ml-auto text-[12px] font-medium text-brand-600 hover:text-brand-900"
          >
            Esc — отмена
          </button>
        </div>
      )}

      <SeatingMatrix
        layout={layout}
        studentById={studentById}
        heatmap={heatmap}
        selection={selection}
        hoverSeat={hoverSeat}
        onHoverSeat={setHoverSeat}
        onSeatClick={handleSeatClick}
        onClear={(seat) => {
          assignSeat(seat, null);
          if (selection?.fromSeat === seat) setSelection(null);
        }}
        marking={
          marking && activeLesson && stageId
            ? {
                getMark: (studentId) => {
                  const result = activeLesson.studentResults.find(
                    (item) => item.studentId === studentId
                  );
                  return result?.stages.find((stage) => stage.stageId === stageId)?.mark ?? null;
                },
                onToggle: (studentId, mark) => toggleMark(studentId, stageId, mark),
              }
            : null
        }
      />

      {heatmap && (
        <div className="mt-4 flex flex-wrap items-center gap-4 px-1 text-[12px] text-slate-500">
          <LegendDot className="bg-emerald-500" label="80% и выше" />
          <LegendDot className="bg-amber-400" label="60–79%" />
          <LegendDot className="bg-rose-500" label="ниже 60%" />
          <LegendDot className="bg-slate-300" label="нет данных" />
          <span className="ml-auto hidden text-slate-400 sm:inline">
            Строка — ряд от доски · столбец — место за партой
          </span>
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
        <StepButton
          ariaLabel={`${label}: меньше`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={14} />
        </StepButton>
        <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-800">
          {value}
        </span>
        <StepButton
          ariaLabel={`${label}: больше`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={14} />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  children,
  ariaLabel,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="ring-focus flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}
