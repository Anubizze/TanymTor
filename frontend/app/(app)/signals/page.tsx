"use client";

import { Header } from "@/components/layout/Header";
import { SignalsBoard } from "@/components/signals/SignalsBoard";

export default function SignalsPage() {
  return (
    <div>
      <Header
        title="Сигналы"
        subtitle="Падение относительно личной нормы → ваша гипотеза → проверка через недели"
      />
      <SignalsBoard />
    </div>
  );
}
