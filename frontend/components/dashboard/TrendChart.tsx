"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardHeader, CardTitle, SectionIcon } from "@/components/ui/Card";
import { formatShortDate } from "@/lib/calculations";
import type { Lesson } from "@/lib/types";
import { Activity } from "lucide-react";

const tooltipStyle = {
  borderRadius: "14px",
  border: "1px solid rgb(226 232 240)",
  boxShadow: "0 14px 30px -10px rgb(15 23 42 / 0.2)",
  padding: "10px 14px",
  fontSize: "13px",
} as const;

interface ClassTrendChartProps {
  lessons: Lesson[];
}

export function ClassTrendChart({ lessons }: ClassTrendChartProps) {
  const data = lessons
    .filter((l) => !l.isActive && l.classPercentage > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({
      name: formatShortDate(l.date),
      result: l.classPercentage,
      title: l.title,
    }));

  const average =
    data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d.result, 0) / data.length)
      : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon tone="brand">
            <Activity size={17} />
          </SectionIcon>
          <div>
            <CardTitle>Динамика класса</CardTitle>
            {data.length > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                Средний результат за период —{" "}
                <span className="font-semibold tabular-nums text-slate-700">
                  {average}%
                </span>
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      {data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
          <p className="text-sm font-medium text-slate-500">
            Недостаточно данных для графика
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Проведите хотя бы один урок
          </p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.32} />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={52}
              />
              <Tooltip
                cursor={{ stroke: "#c7d2fe", strokeWidth: 2 }}
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value}%`, "Результат"]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.title ? `${label} — ${item.title}` : label;
                }}
              />
              <Area
                type="monotone"
                dataKey="result"
                stroke="url(#lineStroke)"
                strokeWidth={2.5}
                fill="url(#areaFill)"
                dot={{ r: 3, fill: "#ffffff", stroke: "#6366f1", strokeWidth: 2 }}
                activeDot={{
                  r: 6,
                  fill: "#ffffff",
                  stroke: "#4f46e5",
                  strokeWidth: 3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

interface StudentTrendChartProps {
  data: { name: string; result: number }[];
  studentName: string;
}

export function StudentTrendChart({ data, studentName }: StudentTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
        <p className="text-sm text-slate-400">Недостаточно данных</p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="studentStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            dy={4}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "#c7d2fe", strokeWidth: 2 }}
            contentStyle={tooltipStyle}
            formatter={(value: number) => [`${value}%`, studentName]}
          />
          <Line
            type="monotone"
            dataKey="result"
            stroke="url(#studentStroke)"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "#ffffff", stroke: "#6366f1", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#ffffff", stroke: "#4f46e5", strokeWidth: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
