'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { Outfit } from '@/lib/outfits';
import { ParticipantData } from '@/lib/dataRecorder';
import { buildRecommendationSections } from '@/lib/recommendationText';
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
}: {
  title: string;
  content: string;
  accent: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const accentClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900',
  };

  return (
    <div className={`rounded-lg border p-5 ${accentClasses[accent]}`}>
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
  const lookNumber = getLookNumberFromOutfitId(outfit.outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : '';
  const displayTags = outfit.styleTags.filter(
    (t) => !['男裝', '女裝', '待補'].includes(t),
  );
  const sections = buildRecommendationSections(condition, outfit);

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

      <div className="mb-6 rounded-lg border-2 border-purple-300 bg-purple-50 p-5">
        <p className="text-center text-sm font-bold text-purple-900">
          請仔細閱讀以下 AI 推薦說明
        </p>
        <p className="mt-2 text-center text-xs text-purple-800">
          請依序閱讀各段落後，再點選下方按鈕進入正式問卷。問卷會詢問你對此次 AI 推薦的感受。
        </p>
      </div>

      <div className="space-y-4">
        <SectionBlock
          title={sections.isPersona ? '推薦說明' : '系統推薦摘要'}
          content={`${sections.intro}${sections.styleSummary ? ` ${sections.styleSummary}` : ''}`}
          accent="blue"
        />

        {sections.showReason && sections.reason && (
          <SectionBlock
            title={sections.isPersona ? '為什麼推薦這套？' : '推薦理由'}
            content={sections.reason}
            accent="blue"
          />
        )}

        {sections.showBenefit && sections.benefit && (
          <SectionBlock title="這套搭配的優點" content={sections.benefit} accent="green" />
        )}

        {sections.showLimitation && sections.limitation && (
          <SectionBlock title="需要注意的地方" content={sections.limitation} accent="amber" />
        )}

        {sections.showSuggestion && sections.suggestion && (
          <SectionBlock
            title={sections.isPersona ? '我的穿搭建議' : '系統穿搭建議'}
            content={sections.suggestion}
            accent="purple"
          />
        )}

        {!sections.showReason && !sections.showBenefit && !sections.showLimitation && (
          <div className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
            {recommendationText}
          </div>
        )}
      </div>

      <div className="mt-8 border-t pt-8">
        <button
          type="button"
          onClick={onSurveyClick}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-lg font-bold text-white transition hover:shadow-lg"
        >
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
