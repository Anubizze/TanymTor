"use client";

import { BookOpen, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { ReactNode } from "react";

interface PickerProps {
  label: string;
  value: string;
  icon: ReactNode;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
  className?: string;
}

function Picker({
  label,
  value,
  icon,
  options,
  onChange,
  className,
}: PickerProps) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/90 py-1.5 pl-2.5 pr-8 transition-all hover:border-brand-300 hover:shadow-[0_6px_18px_-10px_rgb(79_70_229/0.5)] focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/12",
        className
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="block truncate text-[13px] font-semibold text-slate-800">
          {options.find((option) => option.id === value)?.name ?? "—"}
        </span>
      </span>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 text-slate-400 transition-colors group-hover:text-brand-500"
      />

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ContextSwitcher() {
  const classes = useAppStore((s) => s.classes);
  const subjects = useAppStore((s) => s.subjects);
  const activeClassId = useAppStore((s) => s.activeClassId);
  const activeSubjectId = useAppStore((s) => s.activeSubjectId);
  const setActiveClass = useAppStore((s) => s.setActiveClass);
  const setActiveSubject = useAppStore((s) => s.setActiveSubject);

  if (classes.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Picker
        label="Класс"
        value={activeClassId}
        icon={<Users size={14} />}
        options={classes}
        onChange={setActiveClass}
        className="min-w-[148px]"
      />
      {subjects.length > 0 && (
        <Picker
          label="Предмет"
          value={activeSubjectId}
          icon={<BookOpen size={14} />}
          options={subjects}
          onChange={setActiveSubject}
          className="min-w-[140px]"
        />
      )}
    </div>
  );
}
