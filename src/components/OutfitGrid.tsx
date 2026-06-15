'use client';

import React, { useState } from 'react';
import { getOutfit } from '@/lib/outfits';

interface OutfitGridProps {
  outfitIds: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  mode: 'multi' | 'single';
}

export function OutfitGrid({ outfitIds, selectedIds, onChange, mode }: OutfitGridProps) {
  const toggle = (id: string) => {
    if (mode === 'single') {
      onChange([id]);
      return;
    }

    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {outfitIds.map((id) => {
        const outfit = getOutfit(id);
        const selected = selectedIds.includes(id);
        return (
          <OutfitCard
            key={id}
            outfitId={id}
            outfitName={outfit?.outfitName ?? id}
            outfitImage={outfit?.outfitImage ?? ''}
            selected={selected}
            mode={mode}
            onClick={() => toggle(id)}
          />
        );
      })}
    </div>
  );
}

function OutfitCard({
  outfitId,
  outfitName,
  outfitImage,
  selected,
  mode,
  onClick,
}: {
  outfitId: string;
  outfitName: string;
  outfitImage: string;
  selected: boolean;
  mode: 'multi' | 'single';
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 p-2 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {!imageFailed && outfitImage ? (
        <img
          src={outfitImage}
          alt={outfitName}
          onError={() => setImageFailed(true)}
          className="mb-2 h-28 w-full rounded object-cover"
        />
      ) : (
        <div className="mb-2 flex h-28 w-full items-center justify-center rounded bg-gray-100 text-sm text-gray-400">
          {outfitId}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-800">{outfitName}</p>
      {mode === 'multi' && (
        <p className="mt-1 text-xs text-gray-500">{selected ? '✓ 已選擇' : '點擊選擇'}</p>
      )}
    </button>
  );
}
