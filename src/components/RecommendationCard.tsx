'use client';

import React, { useState } from 'react';
import { ParticipantData } from '@/lib/dataRecorder';

interface RecommendationCardProps {
  recommendation: string;
  recommendationText: string;
  recommendationImage: string;
  participantData: ParticipantData;
  onClickSurvey: () => void;
}

export function RecommendationCard({
  recommendation,
  recommendationText,
  recommendationImage,
  participantData,
  onClickSurvey,
}: RecommendationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">AI 推薦結果</p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">{recommendation}</h2>
      </div>

      {!imageFailed && recommendationImage ? (
        <img
          src={recommendationImage}
          alt={recommendation}
          onError={() => setImageFailed(true)}
          className="mx-auto mb-6 max-h-80 rounded-lg border border-gray-200 object-cover"
        />
      ) : (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
          推薦穿搭圖片暫未提供
        </div>
      )}

      <div className="rounded-lg bg-blue-50 p-6 text-gray-800">
        <p className="leading-relaxed">{recommendationText}</p>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
        <p>你的預期推薦：{participantData.expectedOutfit || '未填寫'}</p>
        <p>AI 實際推薦：{recommendation}</p>
      </div>

      <button
        type="button"
        onClick={onClickSurvey}
        className="mt-8 w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg"
      >
        繼續填寫風格驚喜感量表
      </button>
    </div>
  );
}
