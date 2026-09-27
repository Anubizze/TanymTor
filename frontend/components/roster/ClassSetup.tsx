"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Plus, UserPlus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, SectionIcon } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/store/useAppStore";

const SAMPLE_CSV = `ученик,предмет,дата,оценка
Иванов Иван,Математика,01.09.2026,8
Иванов Иван,Математика,08.09.2026,6
Петрова Алия,Математика,01.09.2026,9
Петрова Алия,Математика,08.09.2026,7
`;

export function ClassSetup() {
  const classes = useAppStore((s) => s.classes);
  const classGroup = useAppStore((s) => s.getClassGroup());
  const subject = useAppStore((s) => s.getSubject());
  const createClass = useAppStore((s) => s.createClass);
  const addStudent = useAppStore((s) => s.addStudent);
  const importGrades = useAppStore((s) => s.importGrades);

  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [busy, setBusy] = useState<"class" | "student" | "import" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fail = (err: unknown) => {
    setError(err instanceof ApiError || err instanceof Error ? err.message : "Ошибка");
  };

  const handleCreateClass = async () => {
    if (!className.trim()) return;
    setBusy("class");
    setError(null);
    try {
      await createClass(className.trim());
      setClassName("");
      setMessage(`Класс «${className.trim()}» создан. Теперь добавьте учеников.`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const handleAddStudent = async () => {
    if (!studentName.trim()) return;
    setBusy("student");
    setError(null);
    try {
      await addStudent(studentName.trim());
      setStudentName("");
      setMessage("Ученик в журнале. Можно ставить отметки на уроке.");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (file: File) => {
    setBusy("import");
    setError(null);
    try {
      const csv = await file.text();
      const result = await importGrades(csv);
      setMessage(
        `Загружено ${result.imported} оценок. Новых учеников: ${result.createdStudents}, предметов: ${result.createdSubjects}. Сигналы пересчитаются сразу.`
      );
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {classes.length === 0 && (
        <Card variant="spotlight" className="lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Первый шаг
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">
            Здесь ещё нет ни одного класса
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Демо-данные чужие. Это ваш контур: создайте класс, заведите учеников
            или вкиньте CSV из журнала — и система начнёт ловить падения, а не
            рисовать красивую пустышку.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon>
              <Plus size={17} />
            </SectionIcon>
            <CardTitle>
              {classes.length === 0 ? "Создать класс" : "Ещё один класс"}
            </CardTitle>
          </div>
        </CardHeader>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Название"
              placeholder="7А, 8Б, профильная группа…"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleCreateClass()}
            />
          </div>
          <Button
            onClick={() => void handleCreateClass()}
            disabled={!className.trim() || busy === "class"}
          >
            {busy === "class" ? <Loader2 size={16} className="animate-spin" /> : "Создать"}
          </Button>
        </div>
      </Card>

      <Card className={!classGroup.id ? "pointer-events-none opacity-50" : undefined}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon tone="emerald">
              <UserPlus size={17} />
            </SectionIcon>
            <CardTitle>Добавить ученика</CardTitle>
          </div>
        </CardHeader>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label={classGroup.id ? `В класс ${classGroup.name}` : "Сначала класс"}
              placeholder="Фамилия Имя"
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleAddStudent()}
              disabled={!classGroup.id}
            />
          </div>
          <Button
            variant="success"
            onClick={() => void handleAddStudent()}
            disabled={!studentName.trim() || !classGroup.id || busy === "student"}
          >
            {busy === "student" ? <Loader2 size={16} className="animate-spin" /> : "В журнал"}
          </Button>
        </div>
      </Card>

      <Card className={`lg:col-span-2 ${!classGroup.id ? "pointer-events-none opacity-50" : ""}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon tone="amber">
              <FileSpreadsheet size={17} />
            </SectionIcon>
            <div>
              <CardTitle>Импорт журнала (CSV)</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Обход BilimClass: колонки «ученик, предмет, дата, оценка».
                Незнакомых учеников система заведёт в {classGroup.name || "класс"}{" "}
                сама. Предмет сейчас в интерфейсе: {subject.name}.
              </p>
            </div>
          </div>
        </CardHeader>

        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragOver
              ? "border-brand-400 bg-brand-50"
              : "border-slate-200 bg-slate-50/70 hover:border-brand-300 hover:bg-brand-50/40"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            if (classGroup.id && busy !== "import") setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file && classGroup.id && busy !== "import") void handleFile(file);
          }}
        >
          {busy === "import" ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-800">
                Перетащите файл или нажмите, чтобы выбрать
              </p>
              <p className="mt-1 text-xs text-slate-400">
                CSV или TSV, разделитель запятая или точка с запятой. Даты 01.09.2026 или 2026-09-01.
              </p>
            </>
          )}
          <input
            type="file"
            accept=".csv,.tsv,text/csv,text/plain"
            className="hidden"
            disabled={!classGroup.id || busy === "import"}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-800"
          onClick={() => {
            const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "tanymtor-journal-sample.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Скачать образец CSV
        </button>
      </Card>

      {(message || error) && (
        <div
          className={`lg:col-span-2 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ?? message}
        </div>
      )}
    </div>
  );
}
