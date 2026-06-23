'use client';

import React, { useState } from 'react';
import { Outfit } from '@/lib/outfits';
import { ParticipantData } from '@/lib/dataRecorder';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';

interface RecommendationCardProps {
  outfit: Outfit;
  recommendationText: string;
  participantData: ParticipantData;
  onSurveyClick: () => void;
}

export function RecommendationCard({
  outfit,
  recommendationText,
  participantData,
  onSurveyClick,
}: RecommendationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const displayTags = outfit.styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          AI 推薦結果
        </p>
        {lookLabel && <p className="mt-1 text-lg font-bold text-blue-700">{lookLabel}</p>}
        <h2 className="mt-2 text-2xl font-bold text-gray-900">{outfit.outfitName}</h2>
        {displayTags.length > 0 && (
          <p className="mt-2 text-sm text-gray-500">{displayTags.join('｜')}</p>
        )}
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
          {lookLabel || outfit.outfitId} — 圖片暫未提供
        </div>
      )}

      <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
        請仔細閱讀以下 AI 推薦說明，完成後將進入正式問卷填答。
      </div>

      <div className="rounded-lg bg-blue-50 p-6 text-gray-800">
        <p className="leading-relaxed whitespace-pre-line">{recommendationText}</p>
      </div>

      <div className="mt-8 border-t pt-8">
        <button
          type="button"
          onClick={onSurveyClick}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-lg font-bold text-white transition hover:shadow-lg"
        >
          繼續填寫問卷 →
        </button>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <p>Participant ID: {participantData.participantId}</p>
        <p>
          Condition: {participantData.conditionId} · Surprise: {participantData.surpriseMode}
        </p>
      </div>
    </div>
  );
}
