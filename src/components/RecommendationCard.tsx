'use client';

import React, { useState } from 'react';
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google';
import { Condition } from '@/lib/conditions';
import { Outfit } from '@/lib/outfits';
import { ChatMessage, ParticipantData, generateCompletionCode } from '@/lib/dataRecorder';
import { getAllOutfitIds, getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { isExternalSurveyMode } from '@/lib/surveyMode';
import { OverlayModal } from '@/components/OverlayModal';
import { OutfitGrid } from '@/components/OutfitGrid';
import { isProactiveNoteMessage } from '@/lib/proactiveNotes';

const recommendationSans = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
});

const recommendationSerif = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

interface RecommendationCardProps {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
  participantData: ParticipantData;
  chatLog: ChatMessage[];
  onSurveyClick: () => void;
  onViewChatLog?: () => void;
}

/** 各實驗組共用說明卡片：低彩度語意色，強化層級但不做強烈操弄 */
function ExplanationBlock({
  title,
  content,
  tone,
}: {
  title: string;
  content: string;
  tone: 'reason' | 'benefit' | 'caution';
}) {
  const toneClass = {
    // 藍系：信任／說明（常見於專業服務與電商信任研究）
    reason: 'border-sky-200 bg-sky-50',
    // 青綠：正向但不採交通號誌綠
    benefit: 'border-teal-200 bg-teal-50',
    // 暖石色：提醒注意力，避免警示黃／橘造成威脅感
    caution: 'border-stone-300 bg-stone-50',
  }[tone];

  const titleClass = {
    reason: 'text-sky-950',
    benefit: 'text-teal-950',
    caution: 'text-stone-900',
  }[tone];

  return (
    <div className={`rounded-xl border p-5 sm:p-6 ${toneClass}`}>
      <h4 className={`text-base font-bold sm:text-lg ${titleClass}`}>{title}</h4>
      <p
        className={`${recommendationSerif.className} mt-3 text-base leading-[1.85] text-slate-800 sm:text-lg sm:leading-[1.9]`}
      >
        {content}
      </p>
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

export function RecommendationCard({
  outfit,
  condition: _condition,
  recommendationText: _recommendationText,
  participantData,
  chatLog,
  onSurveyClick,
  onViewChatLog,
}: RecommendationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasReadExplanation, setHasReadExplanation] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const displayTags = outfit.styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );
  const externalSurvey = isExternalSurveyMode();
  const completionCode =
    participantData.completionCode || generateCompletionCode(participantData.participantId);

  const visibleChatCount = chatLog.filter((m) => !isProactiveNoteMessage(m.message)).length;

  // 三塊固定說明：使用穿搭資料既有文案，版型各組相同（不改文字產生邏輯）
  const explanationBlocks: {
    title: string;
    content: string;
    tone: 'reason' | 'benefit' | 'caution';
  }[] = [
    { title: '推薦原因', content: outfit.reason, tone: 'reason' },
    { title: '這套搭配的優點', content: outfit.benefit, tone: 'benefit' },
    { title: '需要注意的地方', content: outfit.limitation, tone: 'caution' },
  ];

  // 推薦重點：短句，不取代下方三塊完整說明
  const highlightText =
    displayTags.includes('韓系') && displayTags.includes('層次穿搭')
      ? '這套穿搭兼顧韓系風格、層次感與面試場合需求。'
      : displayTags.length >= 2
        ? `這套穿搭兼顧${displayTags[0]}、${displayTags[1]}與面試場合需求。`
        : '這套穿搭兼顧風格特色與面試場合需求。';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(completionCode);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const openChat = () => {
    setChatOpen(true);
    onViewChatLog?.();
  };

  return (
    <div className={`${recommendationSans.className} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8`}>
      {/* 1. 頂部：標題、Look、名稱、標籤、圖片 */}
      <div className="mb-5 text-center sm:mb-6">
        <p className="text-sm font-semibold tracking-wide text-slate-600 sm:text-base">
          AI 穿搭顧問推薦結果
        </p>
        {lookLabel && (
          <p className="mt-2 text-xl font-bold text-slate-800 sm:text-2xl">{lookLabel}</p>
        )}
        <h2
          className={`${recommendationSerif.className} mt-2 text-2xl font-bold leading-snug text-slate-950 sm:mt-3 sm:text-3xl`}
        >
          {outfit.outfitName}
        </h2>
        {displayTags.length > 0 && (
          <p className="mt-3 text-sm text-slate-600 sm:text-base">{displayTags.join('｜')}</p>
        )}
      </div>

      {!imageFailed && outfit.outfitImage ? (
        <div className="mx-auto mb-6 flex max-w-md items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mb-8 sm:max-w-lg sm:p-4">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            onError={() => setImageFailed(true)}
            className="max-h-[20rem] w-full object-contain sm:max-h-[26rem]"
          />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 sm:mb-8">
          {lookLabel || outfit.outfitId} — 圖片暫未提供
        </div>
      )}

      {/* 2. 推薦重點（短，不取代完整說明） */}
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 sm:mb-8">
        <p className="text-sm font-semibold text-indigo-900">推薦重點</p>
        <p className={`${recommendationSerif.className} mt-2 text-base leading-relaxed text-slate-900 sm:text-lg`}>
          {highlightText}
        </p>
      </div>

      {/* 3. 完整推薦說明（直接展開，三塊固定版型） */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">完整推薦說明</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          請完整閱讀以下內容，後續問卷將根據本頁體驗作答。
        </p>
      </div>

      <div className="space-y-4">
        {explanationBlocks.map((block) => (
          <ExplanationBlock
            key={block.title}
            title={block.title}
            content={block.content}
            tone={block.tone}
          />
        ))}
      </div>

      {/* 4. 次要功能：弱化 */}
      <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center sm:gap-4">
        {visibleChatCount > 0 && (
          <button
            type="button"
            onClick={openChat}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            查看對話紀錄
          </button>
        )}
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          回顧剛才的 12 套穿搭
        </button>
      </div>

      {/* 5. 單一主要按鈕動線 */}
      <div className="mt-8 border-t border-slate-200 pt-8">
        {!hasReadExplanation ? (
          <button
            type="button"
            onClick={() => setHasReadExplanation(true)}
            className="w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-800 sm:py-5 sm:text-xl"
          >
            我已閱讀完整推薦說明
          </button>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-6 text-center sm:px-6">
              <p className="text-lg font-bold text-slate-950 sm:text-xl">請記下您的實驗完成編號</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
                體驗後問卷的第一題將要求您輸入此編號，請記下或截圖保存。
              </p>
              <p className="mt-5 font-mono text-5xl font-black tracking-[0.2em] text-blue-950 sm:text-6xl">
                {completionCode}
              </p>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="mt-4 inline-flex items-center justify-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
              >
                {copyState === 'copied' ? '已複製' : copyState === 'failed' ? '複製失敗，請手動記下' : '複製編號'}
              </button>
            </div>

            <button
              type="button"
              onClick={onSurveyClick}
              className="w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-800 sm:py-5 sm:text-xl"
            >
              {externalSurvey
                ? `我已記下編號 ${completionCode}，前往體驗後問卷 →`
                : `我已記下編號 ${completionCode}，繼續填寫問卷 →`}
            </button>
          </div>
        )}
      </div>

      <OverlayModal open={chatOpen} title="剛才的對話紀錄" onClose={() => setChatOpen(false)}>
        <ChatLogContent chatLog={chatLog} />
      </OverlayModal>

      <OverlayModal
        open={catalogOpen}
        title="回顧剛才的 12 套穿搭"
        onClose={() => setCatalogOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            以下是剛才網站中的面試穿搭。本次推薦為
            <strong className="mx-1">{lookLabel || outfit.outfitName}</strong>
            ，可再對照看一次後關閉此視窗。
          </p>
          <OutfitGrid
            outfitIds={getAllOutfitIds()}
            selectedIds={[outfit.outfitId]}
            onChange={() => undefined}
            mode="single"
            showLookLabels
          />
        </div>
      </OverlayModal>
    </div>
  );
}
