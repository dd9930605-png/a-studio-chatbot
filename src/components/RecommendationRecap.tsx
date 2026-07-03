'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { ChatMessage } from '@/lib/dataRecorder';
import { Outfit } from '@/lib/outfits';
import { buildRecommendationSections } from '@/lib/recommendationText';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { ChatLogPanel } from '@/components/ChatLogPanel';

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
      {lookLabel && <p className="mt-1 text-xs font-semibold text-blue-700">{lookLabel}</p>}
      <h2 className="mt-2 text-lg font-bold text-gray-900">{outfit.outfitName}</h2>

      {!imageFailed && outfit.outfitImage && (
        <div className="mx-auto mt-4 flex max-w-xs items-center justify-center rounded-lg border border-gray-200 bg-white p-2">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            onError={() => setImageFailed(true)}
            className="max-h-48 w-full object-contain"
          />
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-gray-700">{summary || recommendationText}</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-blue-700">
          展開完整推薦說明
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {recommendationText}
        </p>
      </details>

      <div className="mt-4">
        <ChatLogPanel
          chatLog={chatLog}
          onToggle={(open) => {
            if (open) onViewChatLog?.();
          }}
        />
      </div>

      <p className={`mt-3 text-xs ${theme.isPersona ? 'text-rose-600' : 'text-slate-500'}`}>
        填寫問卷時可隨時回顧此區塊，對照 AI 的推薦內容與說明。
      </p>
    </aside>
  );
}
