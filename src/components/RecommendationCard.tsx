'use client';

import React, { useState } from 'react';
import { Noto_Sans_TC, Noto_Serif_TC } from 'next/font/google';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { Outfit } from '@/lib/outfits';
import { ChatMessage, ParticipantData, generateCompletionCode } from '@/lib/dataRecorder';
import { RecommendationReviewTools } from '@/components/RecommendationReviewTools';
import {
  buildRecommendationSections,
  countRecommendationBlocks,
} from '@/lib/recommendationText';
import { getAllOutfitIds, getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { isExternalSurveyMode } from '@/lib/surveyMode';
import { OverlayModal } from '@/components/OverlayModal';
import { OutfitGrid } from '@/components/OutfitGrid';

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

function SectionBlock({
  title,
  content,
  accent,
  emphasized = false,
  isPersona,
}: {
  title: string;
  content: string;
  accent: 'blue' | 'green' | 'amber' | 'purple' | 'slate';
  emphasized?: boolean;
  isPersona: boolean;
}) {
  const accentClasses = {
    blue: 'border-blue-300 bg-blue-50 text-blue-950',
    green: 'border-green-300 bg-green-50 text-green-950',
    amber: 'border-amber-300 bg-amber-50 text-amber-950',
    purple: 'border-rose-300 bg-rose-50 text-rose-950',
    slate: 'border-slate-400 bg-white text-slate-950',
  };

  return (
    <div
      className={`rounded-xl border-2 p-6 sm:p-7 ${accentClasses[accent]} ${
        emphasized ? 'shadow-sm' : ''
      }`}
    >
      <h3
        className={`mb-3 text-lg font-bold tracking-wide sm:text-xl ${
          isPersona ? '' : 'tracking-normal'
        }`}
      >
        {title}
      </h3>
      <p
        className={`${recommendationSerif.className} text-lg leading-[1.9] text-slate-900 sm:text-xl sm:leading-[1.85]`}
      >
        {content}
      </p>
    </div>
  );
}

export function RecommendationCard({
  outfit,
  condition,
  recommendationText,
  participantData,
  chatLog,
  onSurveyClick,
  onViewChatLog,
}: RecommendationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const theme = getConditionTheme(condition);
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const displayTags = outfit.styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );
  const sections = buildRecommendationSections(condition, outfit);
  const blockCount = countRecommendationBlocks(sections);
  const externalSurvey = isExternalSurveyMode();
  const completionCode =
    participantData.completionCode || generateCompletionCode(participantData.participantId);

  const surveyButtonClass = theme.isPersona
    ? 'w-full rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-5 text-xl font-bold text-white transition hover:shadow-lg'
    : 'w-full rounded-lg bg-slate-900 px-6 py-5 text-xl font-bold text-white transition hover:bg-slate-800';

  return (
    <div className={`${recommendationSans.className} p-6 sm:p-8 ${theme.recommendationCardClass}`}>
      <div className="mb-6 text-center">
        <p className={`text-base font-bold tracking-wide ${theme.recommendationAccent}`}>
          {sections.isPersona ? 'Emma 的推薦結果' : '系統推薦結果'}
        </p>
        {lookLabel && (
          <p className={`mt-2 text-2xl font-black ${theme.recommendationAccent}`}>{lookLabel}</p>
        )}
        <h2
          className={`${recommendationSerif.className} mt-3 text-3xl font-bold leading-snug sm:text-4xl ${
            theme.isPersona ? 'text-rose-950' : 'text-slate-950'
          }`}
        >
          {outfit.outfitName}
        </h2>
        {displayTags.length > 0 && !sections.isUltraMinimal && (
          <p className="mt-3 text-base text-gray-600">{displayTags.join('｜')}</p>
        )}
        {!sections.isUltraMinimal && (
          <p className="mt-4 inline-flex rounded-md bg-white/90 px-4 py-1.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
            本次說明共 {blockCount} 段　請慢慢往下閱讀
          </p>
        )}
      </div>

      {!imageFailed && outfit.outfitImage ? (
        <div className="mx-auto mb-8 flex max-w-lg items-center justify-center rounded-xl border border-gray-200 bg-neutral-50 p-4">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            onError={() => setImageFailed(true)}
            className="max-h-[32rem] w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
          {lookLabel || outfit.outfitId} — 圖片暫未提供
        </div>
      )}

      {!sections.isUltraMinimal && (
        <div
          className={`mb-7 rounded-xl border-2 p-6 ${
            theme.isPersona
              ? 'border-rose-300 bg-rose-50'
              : 'border-slate-500 bg-slate-100'
          }`}
        >
          <p
            className={`text-center text-xl font-black ${
              theme.isPersona ? 'text-rose-950' : 'text-slate-950'
            }`}
          >
            請仔細閱讀以下推薦說明
          </p>
          <p className="mt-3 text-center text-base leading-relaxed text-slate-800">
            後續問卷會問到這些內容。請依序把每一段看完，再往下繼續。
          </p>
        </div>
      )}

      <div className="space-y-5">
        {!sections.isUltraMinimal && (
          <SectionBlock
            title={sections.isPersona ? '推薦說明' : '系統推薦摘要'}
            content={`${sections.intro}${sections.styleSummary ? ` ${sections.styleSummary}` : ''}`}
            accent={theme.isPersona ? 'blue' : 'slate'}
            emphasized={sections.showReason}
            isPersona={theme.isPersona}
          />
        )}

        {sections.isUltraMinimal && (
          <div className="rounded-xl border-2 border-slate-400 bg-white p-8 text-center">
            <p className={`${recommendationSerif.className} text-2xl font-bold leading-relaxed text-slate-950`}>
              {sections.intro}
            </p>
            {lookLabel && <p className="mt-3 text-lg text-slate-700">{lookLabel}</p>}
          </div>
        )}

        {sections.showReason && sections.reason && (
          <SectionBlock
            title={sections.isPersona ? '為什麼推薦這套？' : '推薦理由'}
            content={sections.reason}
            accent="blue"
            emphasized
            isPersona={theme.isPersona}
          />
        )}

        {sections.showBenefit && sections.benefit && (
          <SectionBlock
            title="這套搭配的優點"
            content={sections.benefit}
            accent="green"
            emphasized
            isPersona={theme.isPersona}
          />
        )}

        {sections.showLimitation && sections.limitation && (
          <SectionBlock
            title="需要注意的地方"
            content={sections.limitation}
            accent="amber"
            emphasized
            isPersona={theme.isPersona}
          />
        )}

        {sections.showSuggestion && sections.suggestion && (
          <SectionBlock
            title={sections.isPersona ? '我的穿搭建議' : '系統穿搭建議'}
            content={sections.suggestion}
            accent="purple"
            emphasized
            isPersona={theme.isPersona}
          />
        )}

        {!sections.showReason &&
          !sections.showBenefit &&
          !sections.showLimitation &&
          !sections.isUltraMinimal && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p
                className={`${recommendationSerif.className} text-lg leading-[1.9] text-slate-900 sm:text-xl`}
              >
                {recommendationText}
              </p>
            </div>
          )}
      </div>

      <div className="mt-10 space-y-5 border-t border-slate-200 pt-8">
        <RecommendationReviewTools
          outfit={outfit}
          condition={condition}
          recommendationText={recommendationText}
          chatLog={chatLog}
          onViewChatLog={onViewChatLog}
          hintText="進入問卷前，建議先點下方大按鈕再看一次完整推薦說明；也可回顧對話紀錄。"
        />

        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="w-full rounded-xl border-2 border-slate-400 bg-white px-6 py-4 text-lg font-bold text-slate-900 transition hover:bg-slate-50"
        >
          回顧網站上的穿搭商品
        </button>
        <p className="-mt-2 text-center text-sm leading-relaxed text-slate-600">
          若對商品印象不夠清楚，可在此再看一次；也可以回到剛才的電商／前導問卷頁面確認商品後再回來。
        </p>

        {externalSurvey && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5 text-amber-950 shadow-sm sm:p-6">
            <p className="text-center text-xl font-black">請先記下你的編號</p>
            <p className="mt-2 text-center text-base leading-relaxed text-amber-900">
              下一份問卷的<strong>第一題</strong>會請你填這個編號。
              <br />
              只要三碼，請先記住或截圖，再點下方按鈕。
            </p>
            <p className="mt-5 text-center text-sm font-semibold tracking-wider text-amber-800">
              你的編號
            </p>
            <p className="mt-1 text-center font-mono text-5xl font-black tracking-[0.35em] text-amber-950">
              {completionCode}
            </p>
            <div className="mt-5 rounded-lg border border-amber-300 bg-white/80 px-4 py-3 text-sm leading-relaxed text-amber-950 sm:text-base">
              <p className="font-bold">填問卷前小提醒</p>
              <p className="mt-1">
                若覺得對商品印象還不夠清楚，可以先回到剛才的<strong>電商網站／前導問卷</strong>
                再看一次商品，或點上方「回顧網站上的穿搭商品」，加深印象後再繼續填後測問卷。
              </p>
            </div>
          </div>
        )}

        <button type="button" onClick={onSurveyClick} className={surveyButtonClass}>
          {externalSurvey
            ? `我已記住編號 ${completionCode}，前往後測問卷 →`
            : '我已閱讀完畢，繼續填寫問卷 →'}
        </button>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <p>Participant ID: {participantData.participantId}</p>
        {externalSurvey && <p>編號: {completionCode}</p>}
        <p>
          Condition: {participantData.conditionId} · Surprise: {participantData.surpriseMode}
        </p>
      </div>

      <OverlayModal
        open={catalogOpen}
        title="回顧網站穿搭商品"
        onClose={() => setCatalogOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-slate-700">
            以下是網站中的面試穿搭。本次推薦為
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
