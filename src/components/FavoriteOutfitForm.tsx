'use client';

import React, { useState } from 'react';
import { OutfitGrid } from '@/components/OutfitGrid';
import { getAllOutfitIds } from '@/lib/looks';

interface FavoriteOutfitFormProps {
  onSubmit: (favoriteOutfitId: string) => void;
}

export function FavoriteOutfitForm({ onSubmit }: FavoriteOutfitFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selected.length !== 1) {
      setError('請選擇 1 套您自己最喜歡的穿搭。');
      return;
    }

    setError('');
    onSubmit(selected[0]);
  };

  return (
    <div className="mx-auto max-w-6xl rounded-xl border-2 border-emerald-100 bg-white p-6 shadow-lg sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">前置問題 2</p>

      <h2 className="mt-3 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
        這 12 套穿搭中，你自己最喜歡哪一套？
      </h2>

      <p className="mt-3 text-base text-gray-600 sm:text-lg">
        請依您個人喜好選擇，這題與「AI 會推薦哪一套」無關。
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
          className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          下一題
        </button>
      </form>
    </div>
  );
}
