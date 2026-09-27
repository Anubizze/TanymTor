"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut, X } from "lucide-react";
import { api } from "@/lib/api";
import type { AccountStatus, Teacher } from "@/lib/auth-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/store/useAuthStore";

interface AdminTeacher extends Teacher {
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  pending: "Ждёт одобрения",
  approved: "Одобрен",
  rejected: "Отклонён",
};

export default function AdminPage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [items, setItems] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ teachers: AdminTeacher[] }>("/api/admin/teachers");
      setItems(data.teachers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    return {
      pending: items.filter((item) => item.status === "pending"),
      approved: items.filter((item) => item.status === "approved"),
      rejected: items.filter((item) => item.status === "rejected"),
    };
  }, [items]);

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/teachers/${id}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить заявку");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Учителя
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Новая регистрация — заявка. Одобрили — человек входит в журнал.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            logout();
            router.push("/admin/login");
          }}
        >
          <LogOut size={16} />
          Выйти
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          <Section title="Заявки" count={grouped.pending.length}>
            {grouped.pending.length === 0 ? (
              <Empty text="Новых заявок нет" />
            ) : (
              grouped.pending.map((teacher) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                  busy={busyId === teacher.id}
                  onApprove={() => void decide(teacher.id, "approve")}
                  onReject={() => void decide(teacher.id, "reject")}
                />
              ))
            )}
          </Section>

          <Section title="Одобрены" count={grouped.approved.length}>
            {grouped.approved.length === 0 ? (
              <Empty text="Пока никого не одобрили" />
            ) : (
              grouped.approved.map((teacher) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                  busy={busyId === teacher.id}
                  onReject={() => void decide(teacher.id, "reject")}
                />
              ))
            )}
          </Section>

          <Section title="Отклонены" count={grouped.rejected.length}>
            {grouped.rejected.length === 0 ? (
              <Empty text="Отклонённых нет" />
            ) : (
              grouped.rejected.map((teacher) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                  busy={busyId === teacher.id}
                  onApprove={() => void decide(teacher.id, "approve")}
                />
              ))
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="text-sm tabular-nums text-slate-400">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
}

function TeacherRow({
  teacher,
  busy,
  onApprove,
  onReject,
}: {
  teacher: AdminTeacher;
  busy: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{teacher.name}</p>
          <Badge
            variant={
              teacher.status === "approved"
                ? "success"
                : teacher.status === "rejected"
                  ? "danger"
                  : "warning"
            }
          >
            {STATUS_LABEL[teacher.status]}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {teacher.email}
          {teacher.school ? ` · ${teacher.school}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        {onApprove && teacher.status !== "approved" && (
          <Button size="sm" variant="success" disabled={busy} onClick={onApprove}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Одобрить
          </Button>
        )}
        {onReject && teacher.status !== "rejected" && (
          <Button size="sm" variant="danger" disabled={busy} onClick={onReject}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Отклонить
          </Button>
        )}
      </div>
    </div>
  );
}
