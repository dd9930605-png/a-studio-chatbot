'use client';

import React, { useState } from 'react';
import { getOutfit } from '@/lib/outfits';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';

interface OutfitGridProps {
  outfitIds: string[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  mode: 'multi' | 'single';
  /** 前台顯示 Look 編號，不顯示 M/F */
  showLookLabels?: boolean;
}

export function OutfitGrid({
  outfitIds,
  selectedIds,
  onChange,
  mode,
  showLookLabels = true,
}: OutfitGridProps) {
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
        const lookNumber = getLookNumberFromOutfitId(id);
        const title = showLookLabels && lookNumber ? getLookLabel(lookNumber) : id;
        const selected = selectedIds.includes(id);
        return (
          <OutfitCard
            key={id}
            title={title}
            outfitName={outfit?.outfitName ?? ''}
            styleTags={outfit?.styleTags ?? []}
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
  title,
  outfitName,
  styleTags,
  outfitImage,
  selected,
  mode,
  onClick,
}: {
  title: string;
  outfitName: string;
  styleTags: string[];
  outfitImage: string;
  selected: boolean;
  mode: 'multi' | 'single';
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayTags = styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );

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
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600">{title}</p>
      {!imageFailed && outfitImage ? (
        <img
          src={outfitImage}
          alt={outfitName}
          onError={() => setImageFailed(true)}
          className="mb-2 h-28 w-full rounded object-cover"
        />
      ) : (
        <div className="mb-2 flex h-28 w-full items-center justify-center rounded bg-gray-100 text-sm text-gray-400">
          {title}
        </div>
      )}
      <p className="line-clamp-2 text-sm font-medium text-gray-800">{outfitName}</p>
      {displayTags.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">{displayTags.join('｜')}</p>
      )}
      {mode === 'multi' && (
        <p className="mt-1 text-xs text-gray-500">{selected ? '✓ 已選擇' : '點擊選擇'}</p>
      )}
    </button>
  );
}
