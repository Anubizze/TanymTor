import { LOCAL_DATA_MODE } from "@/lib/data-mode";

export function LocalDataNotice() {
  if (!LOCAL_DATA_MODE) return null;
  return (
    <p className="mb-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
      Демо-режим. Изменения сохраняются только в этом браузере и исчезнут при очистке данных сайта.
    </p>
  );
}
