'use client';

import React, { useState } from 'react';
import { OutfitGrid } from '@/components/OutfitGrid';

interface FavoriteOutfitFormProps {
  outfitIds: string[];
  onSubmit: (favoriteOutfitId: string) => void;
}

export function FavoriteOutfitForm({ outfitIds, onSubmit }: FavoriteOutfitFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selected.length !== 1) {
      setError('請選擇 1 套您自己最喜歡的穿搭。');
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
    <div className="mx-auto max-w-6xl rounded-xl border-2 border-emerald-200 bg-white p-6 shadow-lg sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">前置問題 2｜個人喜好</p>

      <h2 className="mt-3 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
        請選出
        <span className="mx-1 text-emerald-700 underline decoration-emerald-400 decoration-4 underline-offset-4">
          你自己最喜歡
        </span>
        的一套穿搭
      </h2>

      <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-base text-emerald-950 sm:text-lg">
        此題請依照你自己的喜好選擇。
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
          className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          下一題
        </button>
      </form>
    </div>
  );
}
