"use client";

import { Header } from "@/components/layout/Header";
import { AIAnalysisPanel } from "@/components/analysis/AIAnalysisPanel";
import { SignalPulse } from "@/components/signals/SignalPulse";

export default function AnalysisPage() {
  return (
    <div>
      <Header
        title="ИИ-анализ"
        subtitle="Уроки показывают, где споткнулись. Журнал — кого выбило из нормы."
      />
      <div className="mb-6">
        <SignalPulse />
      </div>
      <AIAnalysisPanel />
    </div>
  );
}
