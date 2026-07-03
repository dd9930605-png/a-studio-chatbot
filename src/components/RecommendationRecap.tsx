'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { ChatMessage } from '@/lib/dataRecorder';
import { Outfit } from '@/lib/outfits';
import { buildRecommendationSections } from '@/lib/recommendationText';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { RecommendationReviewTools } from '@/components/RecommendationReviewTools';

interface RecommendationRecapProps {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
  chatLog: ChatMessage[];
  onViewChatLog?: () => void;
}

export function RecommendationRecap({
  outfit,
  condition,
  recommendationText,
  chatLog,
  onViewChatLog,
}: RecommendationRecapProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const theme = getConditionTheme(condition);
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const sections = buildRecommendationSections(condition, outfit);
  const summary = `${sections.intro}${sections.styleSummary ? ` ${sections.styleSummary}` : ''}`.trim();

  return (
    <aside className="rounded-xl border-2 border-blue-100 bg-gradient-to-b from-blue-50 to-white p-5 shadow-sm">
      <p className="text-sm font-bold text-blue-800">剛才 AI 推薦給您的穿搭</p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        {!imageFailed && outfit.outfitImage && (
          <div className="mx-auto flex w-full max-w-[10rem] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 sm:mx-0">
            <img
              src={outfit.outfitImage}
              alt={outfit.outfitName}
              onError={() => setImageFailed(true)}
              className="max-h-36 w-full object-contain"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {lookLabel && <p className="text-xs font-semibold text-blue-700">{lookLabel}</p>}
          <h2 className="mt-1 text-lg font-bold text-gray-900">{outfit.outfitName}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{summary}</p>
          <p className={`mt-2 text-xs ${theme.isPersona ? 'text-rose-600' : 'text-slate-500'}`}>
            下方按鈕可查看完整推薦說明與對話紀錄，字級適中、不需跳轉頁面。
          </p>
        </div>
      </div>

      <div className="mt-4">
        <RecommendationReviewTools
          outfit={outfit}
          condition={condition}
          recommendationText={recommendationText}
          chatLog={chatLog}
          onViewChatLog={onViewChatLog}
          hintText="填寫問卷時，可用下方按鈕隨時回顧完整推薦說明或對話紀錄，無需離開問卷頁面。"
        />
      </div>
    </aside>
  );
}
