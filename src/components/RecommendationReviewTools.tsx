'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { ChatMessage, ParticipantData, extractUserMessages } from '@/lib/dataRecorder';
import { Outfit } from '@/lib/outfits';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { isProactiveNoteMessage } from '@/lib/proactiveNotes';
import { OverlayModal } from '@/components/OverlayModal';
import { ResultExplanationView } from '@/components/ResultExplanationView';
import { buildResultContent } from '@/lib/resultContent';
import { ConversationRecap } from '@/components/ConversationRecap';

interface RecommendationReviewToolsProps {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
  chatLog: ChatMessage[];
  participantData?: ParticipantData;
  onViewChatLog?: () => void;
  onViewFullRecommendation?: () => void;
  hintText?: string;
}

function RecommendationFullContent({
  outfit,
  condition,
  recommendationText,
  participantData,
}: {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
  participantData?: ParticipantData;
}) {
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const content = buildResultContent({
    outfit,
    preferenceFormality: participantData?.preferenceFormality ?? '',
    preferenceImpression: participantData?.preferenceImpression ?? '',
    preferenceColor: participantData?.preferenceColor ?? '',
    userMessages: participantData ? extractUserMessages(participantData) : [],
  });
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-600">AI 穿搭推薦</p>
        {lookLabel && <p className="mt-1 text-sm font-semibold text-blue-700">{lookLabel}</p>}
        <p className="mt-1 text-lg font-bold text-gray-900">{outfit.outfitName}</p>
      </div>

      {outfit.outfitImage && (
        <div className="mx-auto flex max-w-sm items-center justify-center rounded-lg border border-gray-200 bg-neutral-50 p-3">
          <img src={outfit.outfitImage} alt={outfit.outfitName} className="max-h-56 w-full object-contain" />
        </div>
      )}

      <ResultExplanationView
        content={content}
        explainability={condition.explainability}
        twoSidedMessage={condition.twoSidedMessage}
      />
      {recommendationText ? <span className="sr-only">{recommendationText}</span> : null}
    </div>
  );
}


export function RecommendationReviewTools({
  outfit,
  condition,
  recommendationText,
  chatLog,
  participantData,
  onViewChatLog,
  onViewFullRecommendation,
  hintText = '填寫問卷前，可隨時用下方按鈕回顧完整推薦說明與對話紀錄，無需離開本頁。',
}: RecommendationReviewToolsProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [recommendationOpen, setRecommendationOpen] = useState(false);

  const visibleChatCount = chatLog.filter((m) => !isProactiveNoteMessage(m.message)).length;

  const openChat = () => {
    setChatOpen(true);
    onViewChatLog?.();
  };

  const openRecommendation = () => {
    setRecommendationOpen(true);
    onViewFullRecommendation?.();
  };

  return (
    <>
      <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-5 py-5">
        <p className="text-base font-semibold leading-relaxed text-blue-950">{hintText}</p>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={openRecommendation}
            className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-6 py-4 text-lg font-black text-white shadow-md transition hover:bg-blue-800"
          >
            查看完整推薦說明
          </button>
          {visibleChatCount > 0 && (
            <button
              type="button"
              onClick={openChat}
              className="flex w-full items-center justify-center rounded-xl border-2 border-slate-400 bg-white px-6 py-3.5 text-base font-bold text-slate-900 transition hover:bg-slate-50"
            >
              查看對話紀錄
            </button>
          )}
        </div>
      </div>

      <OverlayModal open={recommendationOpen} title="完整推薦說明" onClose={() => setRecommendationOpen(false)}>
        <RecommendationFullContent
          outfit={outfit}
          condition={condition}
          recommendationText={recommendationText}
          participantData={participantData}
        />
      </OverlayModal>

      <OverlayModal open={chatOpen} title="完整對話紀錄" size="reading" onClose={() => setChatOpen(false)}>
        {participantData ? (
          <ConversationRecap
            condition={condition}
            participantData={participantData}
            chatLog={chatLog}
          />
        ) : (
          <p className="text-sm text-gray-600">目前沒有可顯示的對話紀錄。</p>
        )}
      </OverlayModal>
    </>
  );
}
