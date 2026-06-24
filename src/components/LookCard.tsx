'use client';

import React, { useState } from 'react';
import { Outfit } from '@/lib/outfits';

interface LookCardProps {
  lookLabel: string;
  outfit: Outfit;
}

export function LookCard({ lookLabel, outfit }: LookCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayTags = outfit.styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );

  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="bg-gray-50 px-4 py-2">
        <p className="text-sm font-bold text-blue-600">{lookLabel}</p>
      </div>
      {!imageFailed && outfit.outfitImage ? (
        <div className="flex aspect-[3/4] w-full items-center justify-center bg-neutral-50">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            onError={() => setImageFailed(true)}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center bg-gray-100 text-gray-400">
          {lookLabel}
        </div>
      )}
      <div className="p-4">
        <p className="font-medium text-gray-900">{outfit.outfitName}</p>
        {displayTags.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">{displayTags.join('｜')}</p>
        )}
      </div>
    </article>
  );
}
