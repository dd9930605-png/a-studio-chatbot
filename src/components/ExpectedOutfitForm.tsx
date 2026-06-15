'use client';

import React, { useState } from 'react';
import { OutfitGrid } from '@/components/OutfitGrid';

interface ExpectedOutfitFormProps {
  acceptableOutfits: string[];
  onSubmit: (expectedOutfit: string) => void;
}

export function ExpectedOutfitForm({ acceptableOutfits, onSubmit }: ExpectedOutfitFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selected.length !== 1) {
      setError('請選擇 1 套你預期 AI 最可能推薦的穿搭。');
      return;
    }

    setError('');
    onSubmit(selected[0]);
  };

  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-lg">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">預期推薦選擇</h1>
      <p className="mb-6 text-gray-600">
        在你剛剛選擇的可接受穿搭中，你預期 AI 最可能推薦哪一套？
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <OutfitGrid
          outfitIds={acceptableOutfits}
          selectedIds={selected}
          onChange={setSelected}
          mode="single"
        />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={selected.length !== 1}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          開始 AI 穿搭顧問對話
        </button>
      </form>
    </div>
  );
}
