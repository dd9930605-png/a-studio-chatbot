'use client';

import React from 'react';
import Link from 'next/link';
import { ALL_LOOK_NUMBERS } from '@/lib/looks';
import { getOutfitIdFromLook, getLookLabel } from '@/lib/looks';
import { getOutfit } from '@/lib/outfits';
import { LookCard } from '@/components/LookCard';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">面試穿搭選購</h1>
          <p className="mt-2 text-gray-600">請瀏覽以下 12 套面試穿搭選項</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_LOOK_NUMBERS.map((lookNumber) => {
            const outfitId = getOutfitIdFromLook(lookNumber);
            const outfit = outfitId ? getOutfit(outfitId) : undefined;
            if (!outfit) return null;
            return (
              <LookCard
                key={lookNumber}
                lookLabel={getLookLabel(lookNumber)}
                outfit={outfit}
              />
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/pre"
            className="inline-block rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-10 py-4 font-bold text-lg text-white shadow-lg transition hover:shadow-xl"
          >
            我已完成瀏覽，前往 AI 穿搭顧問
          </Link>
        </div>
      </div>
    </div>
  );
}
