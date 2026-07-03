'use client';

import React, { useState } from 'react';
import { OutfitGrid } from '@/components/OutfitGrid';
import { getAllOutfitIds } from '@/lib/looks';

interface ExpectedOutfitFormProps {
  onSubmit: (expectedOutfitBeforeAI: string) => void;
}

export function ExpectedOutfitForm({ onSubmit }: ExpectedOutfitFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selected.length !== 1) {
      setError('請選擇 1 套您預期 AI 最可能推薦的穿搭。');
      return;
    }

    setError('');
    onSubmit(selected[0]);
  };

  return (
    <div className="mx-auto max-w-6xl rounded-xl border-2 border-indigo-100 bg-white p-6 shadow-lg sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">前置問題 2</p>

      <h2 className="mt-3 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
        在使用 AI 穿搭顧問前，您預期 AI 最可能推薦給您的穿搭是哪一套？
      </h2>

      <p className="mt-3 text-base text-gray-600 sm:text-lg">
        請依照您的直覺判斷 AI 會推薦哪一套，而不是選您個人最喜歡的一套。
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <OutfitGrid
          outfitIds={getAllOutfitIds()}
          selectedIds={selected}
          onChange={setSelected}
          mode="single"
          showLookLabels
        />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={selected.length !== 1}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-lg font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          開始 AI 穿搭顧問對話
        </button>
      </form>
    </div>
  );
}
