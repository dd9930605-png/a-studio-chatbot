'use client';

import React, { useState } from 'react';
import { OutfitGrid } from '@/components/OutfitGrid';

interface AcceptableOutfitsFormProps {
  allowedOutfits: string[];
  onSubmit: (acceptableOutfits: string[]) => void;
}

export function AcceptableOutfitsForm({ allowedOutfits, onSubmit }: AcceptableOutfitsFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selected.length < 3) {
      setError('請至少選擇 3 套你可以接受或願意考慮的穿搭，以便 AI 進行推薦。');
      return;
    }

    setError('');
    onSubmit(selected);
  };

  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-lg">
      <h2 className="mb-2 text-xl font-bold text-gray-900">前置問題 2</h2>
      <p className="mb-2 text-gray-700">
        剛才看到的穿搭中，哪些是你可以接受或願意考慮的？請至少選擇 3 套。
      </p>
      <p className="mb-6 text-sm text-gray-500">已選擇 {selected.length} 套（至少 3 套）</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <OutfitGrid
          outfitIds={allowedOutfits}
          selectedIds={selected}
          onChange={setSelected}
          mode="multi"
          showLookLabels
        />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={selected.length < 3}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          下一步
        </button>
      </form>
    </div>
  );
}
