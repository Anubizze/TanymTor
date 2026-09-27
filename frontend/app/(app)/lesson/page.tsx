"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { LessonMatrix } from "@/components/lesson/LessonMatrix";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { studentsInSeatOrder } from "@/lib/seating";
import { useAppStore, useSeating } from "@/store/useAppStore";
import { CheckCircle, Plus, RotateCcw } from "lucide-react";
import { EmptyRoster } from "@/components/roster/EmptyRoster";

export default function LessonPage() {
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const seating = useSeating();
  const activeLesson = useAppStore((s) => s.getActiveLesson());
  const completeLesson = useAppStore((s) => s.completeLesson);
  const startNewLesson = useAppStore((s) => s.startNewLesson);
  const resetData = useAppStore((s) => s.resetData);
  const notice = useAppStore((s) => s.notice);
  const setNotice = useAppStore((s) => s.setNotice);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const emptyClass = !classGroup.id || classGroup.students.length === 0;

  const handleComplete = () => {
    if (confirm("Завершить урок? Результаты уйдут в историю и в журнал оценок.")) {
      completeLesson();
    }
  };

  const handleStartNew = async () => {
    if (!newTitle.trim()) return;
    const error = await startNewLesson(newTitle.trim());
    if (!error) {
      setNewTitle("");
      setShowNewLesson(false);
    }
  };

  return (
    <div>
      <Header
        title="Матрица урока"
        subtitle={
          activeLesson
            ? `${subject.name} · ${activeLesson.title} — отмечайте «+» (справился) и «−» (не справился)`
            : `${classGroup.name} · ${subject.name} — начните новый урок для отметок`
        }
        actions={
          <div className="flex gap-2">
            {activeLesson && (
              <Button variant="success" onClick={handleComplete}>
                <CheckCircle size={16} />
                Завершить урок
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowNewLesson(!showNewLesson)}
            >
              <Plus size={16} />
              Новый урок
            </Button>
            <Button variant="ghost" size="sm" onClick={resetData} title="Обновить с сервера">
              <RotateCcw size={16} />
            </Button>
          </div>
        }
      />

      {emptyClass && (
        <div className="mb-6">
          <EmptyRoster
            title="Некого отмечать"
            text="Сначала класс и ученики. Потом матрица плюсов и минусов имеет смысл."
          />
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {notice}
          <button
            type="button"
            className="ml-3 font-medium underline"
            onClick={() => setNotice(null)}
          >
            закрыть
          </button>
        </div>
      )}

      {showNewLesson && (
        <Card className="mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Название урока
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Например: Квадратные уравнения"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                onKeyDown={(e) => e.key === "Enter" && void handleStartNew()}
              />
            </div>
            <Button onClick={() => void handleStartNew()} disabled={!newTitle.trim()}>
              Начать
            </Button>
          </div>
        </Card>
      )}

      <LessonMatrix students={studentsInSeatOrder(classGroup.students, seating)} />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
              +
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Справился</p>
              <p className="text-xs text-slate-400">Ученик выполнил этап</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-sm font-bold text-white">
              −
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Не справился</p>
              <p className="text-xs text-slate-400">Ученик не выполнил этап</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Повторный клик снимает отметку
            </p>
            <p className="text-xs text-slate-400">
              Результаты обновляются автоматически
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
