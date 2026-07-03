'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { ChatMessage } from '@/lib/dataRecorder';
import { Outfit } from '@/lib/outfits';
import { buildRecommendationSections } from '@/lib/recommendationText';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { isProactiveNoteMessage } from '@/lib/proactiveNotes';
import { OverlayModal } from '@/components/OverlayModal';

interface RecommendationReviewToolsProps {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
  chatLog: ChatMessage[];
  onViewChatLog?: () => void;
  onViewFullRecommendation?: () => void;
  hintText?: string;
}

function RecommendationFullContent({
  outfit,
  condition,
  recommendationText,
}: {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
}) {
  const theme = getConditionTheme(condition);
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const sections = buildRecommendationSections(condition, outfit);

  const blocks: { title: string; content: string }[] = [
    {
      title: sections.isPersona ? '推薦說明' : '系統推薦摘要',
      content: `${sections.intro}${sections.styleSummary ? ` ${sections.styleSummary}` : ''}`.trim(),
    },
  ];

  if (sections.showReason && sections.reason) {
    blocks.push({ title: sections.isPersona ? '為什麼推薦這套？' : '推薦理由', content: sections.reason });
  }
  if (sections.showBenefit && sections.benefit) {
    blocks.push({ title: '這套搭配的優點', content: sections.benefit });
  }
  if (sections.showLimitation && sections.limitation) {
    blocks.push({ title: '需要注意的地方', content: sections.limitation });
  }
  if (sections.showSuggestion && sections.suggestion) {
    blocks.push({ title: sections.isPersona ? '穿搭建議' : '系統穿搭建議', content: sections.suggestion });
  }

  if (blocks.length === 1 && recommendationText) {
    blocks[0].content = recommendationText;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        {lookLabel && (
          <p className={`text-sm font-semibold ${theme.recommendationAccent}`}>{lookLabel}</p>
        )}
        <p className="mt-1 text-lg font-bold text-gray-900">{outfit.outfitName}</p>
      </div>

      {outfit.outfitImage && (
        <div className="mx-auto flex max-w-sm items-center justify-center rounded-lg border border-gray-200 bg-neutral-50 p-3">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            className="max-h-56 w-full object-contain"
          />
        </div>
      )}

      {blocks.map((block) => (
        <div key={block.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-bold text-gray-900">{block.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-gray-800 sm:text-base">{block.content}</p>
        </div>
      ))}
    </div>
  );
}

function ChatLogContent({ chatLog }: { chatLog: ChatMessage[] }) {
  const visibleMessages = chatLog.filter((message) => !isProactiveNoteMessage(message.message));

  if (visibleMessages.length === 0) {
    return <p className="text-sm text-gray-600">目前沒有可顯示的對話紀錄。</p>;
  }

  return (
    <div className="space-y-3">
      {visibleMessages.map((message, index) => (
        <div
          key={`${message.timestamp}-${index}`}
          className={`rounded-lg px-4 py-3 text-sm leading-relaxed sm:text-base ${
            message.sender === 'user'
              ? 'ml-6 bg-slate-800 text-white'
              : 'mr-6 border border-gray-200 bg-gray-50 text-gray-900'
          }`}
        >
          <p className="mb-1 text-xs font-semibold opacity-70">
            {message.sender === 'user' ? '您' : 'AI 顧問'}
          </p>
          {message.message}
        </div>
      ))}
    </div>
  );
}

export function RecommendationReviewTools({
  outfit,
  condition,
  recommendationText,
  chatLog,
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
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
        <p className="text-sm leading-relaxed text-blue-900">{hintText}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openRecommendation}
            className="inline-flex items-center rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50"
          >
            查看完整推薦說明
          </button>
          {visibleChatCount > 0 && (
            <button
              type="button"
              onClick={openChat}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
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
        />
      </OverlayModal>

      <OverlayModal open={chatOpen} title="剛才的對話紀錄" onClose={() => setChatOpen(false)}>
        <ChatLogContent chatLog={chatLog} />
      </OverlayModal>
    </>
  );
}
