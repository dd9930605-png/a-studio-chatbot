'use client';

import React, { useState } from 'react';
import { Outfit } from '@/lib/outfits';
import { ParticipantData } from '@/lib/dataRecorder';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';

interface RecommendationCardProps {
  outfit: Outfit;
  recommendationText: string;
  participantData: ParticipantData;
  surveyConfigured: boolean;
  onSurveyClick: () => void;
}

export function RecommendationCard({
  outfit,
  recommendationText,
  participantData,
  surveyConfigured,
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

      <div className="rounded-lg bg-blue-50 p-6 text-gray-800">
        <p className="leading-relaxed">{recommendationText}</p>
      </div>

      <div className="mt-8 border-t pt-8">
        <button
          type="button"
          onClick={onSurveyClick}
          disabled={!surveyConfigured}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 font-bold text-lg text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {surveyConfigured ? '前往正式問卷 →' : '問卷網址尚未設定'}
        </button>
        {!surveyConfigured && (
          <p className="mt-3 text-center text-sm text-red-600">
            目前為範例網址，請研究者設定正式問卷 URL。
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <p>Participant ID: {participantData.participantId}</p>
        <p>Condition: {participantData.conditionId} · Surprise: {participantData.surpriseMode}</p>
      </div>
    </div>
  );
}
