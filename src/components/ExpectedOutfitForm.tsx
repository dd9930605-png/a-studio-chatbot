'use client';

import React, { useState } from 'react';
import { OutfitGrid } from '@/components/OutfitGrid';

interface ExpectedOutfitFormProps {
  outfitIds: string[];
  onSubmit: (expectedOutfitBeforeAI: string) => void;
}

export function ExpectedOutfitForm({ outfitIds, onSubmit }: ExpectedOutfitFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selected.length !== 1) {
      setError('請選擇 1 套您預期 AI 最可能推薦的穿搭。');
      return;
    }

    if (!outfitIds.includes(selected[0])) {
      setError('請從畫面顯示的穿搭中選擇。');
      return;
    }

    setError('');
    onSubmit(selected[0]);
  };

  return (
    <div className="mx-auto max-w-6xl rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-lg sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">前置問題 4｜預測 AI</p>

      <h2 className="mt-3 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
        請預測
        <span className="mx-1 text-indigo-700 underline decoration-indigo-400 decoration-4 underline-offset-4">
          AI 最可能推薦給你
        </span>
        的一套穿搭
      </h2>

      <p className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-base text-indigo-950 sm:text-lg">
        此題不是詢問你最喜歡哪套，請預測 AI 顧問最後最可能推薦哪一套。
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <OutfitGrid
          outfitIds={outfitIds}
          selectedIds={selected}
          onChange={setSelected}
          mode="single"
          showLookLabels
        />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={selected.length !== 1}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-lg font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          開始 AI 穿搭顧問對話
        </button>
      </form>
    </div>
  );
}
