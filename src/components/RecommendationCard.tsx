'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { Outfit } from '@/lib/outfits';
import { ParticipantData } from '@/lib/dataRecorder';
import {
  buildRecommendationSections,
  countRecommendationBlocks,
} from '@/lib/recommendationText';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';

interface RecommendationCardProps {
  outfit: Outfit;
  condition: Condition;
  recommendationText: string;
  participantData: ParticipantData;
  onSurveyClick: () => void;
}

function SectionBlock({
  title,
  content,
  accent,
  emphasized = false,
}: {
  title: string;
  content: string;
  accent: 'blue' | 'green' | 'amber' | 'purple' | 'slate';
  emphasized?: boolean;
}) {
  const accentClasses = {
    blue: 'border-blue-300 bg-blue-50 text-blue-900',
    green: 'border-green-300 bg-green-50 text-green-900',
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    purple: 'border-purple-300 bg-purple-50 text-purple-900',
    slate: 'border-slate-300 bg-slate-100 text-slate-900',
  };

  return (
    <div
      className={`rounded-lg border p-5 ${accentClasses[accent]} ${
        emphasized ? 'border-2 shadow-sm' : ''
      }`}
    >
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-800">{content}</p>
    </div>
  );
}

export function RecommendationCard({
  outfit,
  condition,
  recommendationText,
  participantData,
  onSurveyClick,
}: RecommendationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const theme = getConditionTheme(condition);
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const displayTags = outfit.styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );
  const sections = buildRecommendationSections(condition, outfit);
  const blockCount = countRecommendationBlocks(sections);

  const surveyButtonClass = theme.isPersona
    ? 'w-full rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 text-lg font-bold text-white transition hover:shadow-lg'
    : 'w-full rounded-md bg-slate-800 px-6 py-4 font-mono text-lg font-bold text-white transition hover:bg-slate-900';

  return (
    <div className={`p-8 ${theme.recommendationCardClass}`}>
      <div className="mb-6 text-center">
        <p className={`text-sm font-semibold uppercase tracking-wide ${theme.recommendationAccent}`}>
          {sections.isPersona ? 'Emma 的推薦結果' : '系統推薦結果'}
        </p>
        {lookLabel && (
          <p className={`mt-1 text-lg font-bold ${theme.recommendationAccent}`}>{lookLabel}</p>
        )}
        <h2 className={`mt-2 text-2xl font-bold ${theme.isPersona ? 'text-rose-950' : 'font-mono text-slate-900'}`}>
          {outfit.outfitName}
        </h2>
        {displayTags.length > 0 && !sections.isUltraMinimal && (
          <p className="mt-2 text-sm text-gray-500">{displayTags.join('｜')}</p>
        )}
        {!sections.isUltraMinimal && (
          <p className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
            本次說明共 {blockCount} 段
          </p>
        )}
      </div>

      {!imageFailed && outfit.outfitImage ? (
        <div className="mx-auto mb-6 flex max-w-md items-center justify-center rounded-lg border border-gray-200 bg-neutral-50 p-3">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            onError={() => setImageFailed(true)}
            className="max-h-[28rem] w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
          {lookLabel || outfit.outfitId} — 圖片暫未提供
        </div>
      )}

      {!sections.isUltraMinimal && (
        <div
          className={`mb-6 rounded-lg border-2 p-5 ${
            theme.isPersona
              ? 'border-purple-200 bg-purple-50'
              : 'border-slate-400 bg-slate-200'
          }`}
        >
          <p
            className={`text-center text-sm font-bold ${
              theme.isPersona ? 'text-purple-900' : 'font-mono text-slate-900'
            }`}
          >
            請仔細閱讀以下 AI 推薦說明
          </p>
          <p className="mt-2 text-center text-xs text-gray-700">
            請依序閱讀各段落後，再點選下方按鈕進入正式問卷。
          </p>
        </div>
      )}

      <div className="space-y-4">
        {!sections.isUltraMinimal && (
          <SectionBlock
            title={sections.isPersona ? '推薦說明' : '系統推薦摘要'}
            content={`${sections.intro}${sections.styleSummary ? ` ${sections.styleSummary}` : ''}`}
            accent={theme.isPersona ? 'blue' : 'slate'}
            emphasized={sections.showReason}
          />
        )}

        {sections.isUltraMinimal && (
          <div className="rounded-lg border border-slate-300 bg-white p-6 text-center">
            <p className="font-mono text-lg font-bold text-slate-900">{sections.intro}</p>
            {lookLabel && <p className="mt-2 text-sm text-slate-600">{lookLabel}</p>}
          </div>
        )}

        {sections.showReason && sections.reason && (
          <SectionBlock
            title={sections.isPersona ? '為什麼推薦這套？' : '推薦理由'}
            content={sections.reason}
            accent="blue"
            emphasized
          />
        )}

        {sections.showBenefit && sections.benefit && (
          <SectionBlock title="✅ 這套搭配的優點" content={sections.benefit} accent="green" emphasized />
        )}

        {sections.showLimitation && sections.limitation && (
          <SectionBlock
            title="⚠️ 需要注意的地方"
            content={sections.limitation}
            accent="amber"
            emphasized
          />
        )}

        {sections.showSuggestion && sections.suggestion && (
          <SectionBlock
            title={sections.isPersona ? '💡 我的穿搭建議' : '系統穿搭建議'}
            content={sections.suggestion}
            accent="purple"
            emphasized
          />
        )}

        {!sections.showReason &&
          !sections.showBenefit &&
          !sections.showLimitation &&
          !sections.isUltraMinimal && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
              {recommendationText}
            </div>
          )}
      </div>

      <div className="mt-8 border-t pt-8">
        <button type="button" onClick={onSurveyClick} className={surveyButtonClass}>
          我已閱讀完畢，繼續填寫問卷 →
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
