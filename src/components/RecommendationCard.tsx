'use client';

import React, { useState } from 'react';
import { Outfit } from '@/lib/outfits';
import { ParticipantData } from '@/lib/dataRecorder';

interface RecommendationCardProps {
  outfit: Outfit;
  recommendationText: string;
  participantData: ParticipantData;
  onContinue: () => void;
}

export function RecommendationCard({
  outfit,
  recommendationText,
  participantData,
  onContinue,
}: RecommendationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">AI 推薦結果</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">{outfit.outfitName}</h2>
        <p className="mt-2 text-sm text-gray-500">{outfit.styleTags.join(' · ')}</p>
      </div>

      {!imageFailed && outfit.outfitImage ? (
        <img
          src={outfit.outfitImage}
          alt={outfit.outfitName}
          onError={() => setImageFailed(true)}
          className="mx-auto mb-6 max-h-80 rounded-lg border border-gray-200 object-cover"
        />
      ) : (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
          {outfit.outfitId} — 圖片暫未提供
        </div>
      )}

      <div className="rounded-lg bg-blue-50 p-6 text-gray-800">
        <p className="leading-relaxed">{recommendationText}</p>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
        <p>你的預期推薦：{participantData.expectedOutfit}</p>
        <p>AI 實際推薦：{participantData.finalRecommendedOutfit}</p>
        <p>
          是否吻合：
          {participantData.expectationMismatch === 0 ? ' 吻合' : ' 不吻合（風格驚喜）'}
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg"
      >
        完成實驗，前往問卷 →
      </button>
    </div>
  );
}
