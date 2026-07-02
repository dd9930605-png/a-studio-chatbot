'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BotHeader } from '@/components/BotHeader';
import { ChatInterface } from '@/components/ChatInterface';
import { RecommendationCard } from '@/components/RecommendationCard';
import {
  ParticipantData,
  getParticipantDraft,
  saveParticipantData,
  saveParticipantDraft,
} from '@/lib/dataRecorder';
import { getCondition } from '@/lib/conditions';
import { getOutfit } from '@/lib/outfits';

type Step = 'greeting' | 'chat' | 'recommendation';

const GREETING_DISPLAY_MS = 3200;
const MIN_CHAT_MS = 3 * 60 * 1000;
const MAX_CHAT_MS = 5 * 60 * 1000;

export default function ChatPageContent() {
  const router = useRouter();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [condition, setCondition] = useState<ReturnType<typeof getCondition>>(undefined);
  const [currentStep, setCurrentStep] = useState<Step>('greeting');
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timingNotice, setTimingNotice] = useState('');

  useEffect(() => {
    const draft = getParticipantDraft();
    if (!draft || !draft.favoriteOutfitBeforeAI) {
      router.push('/pre');
      return;
    }

    const cond = getCondition(draft.conditionId);
    if (!cond) {
      router.push('/');
      return;
    }

    setParticipantData(draft);
    setCondition(cond);

    const timer = setTimeout(() => {
      setCurrentStep('chat');
      const enteredAt = new Date().toISOString();
      const startMs = Date.now();
      setChatStartedAt(startMs);
      const updatedDraft: ParticipantData = {
        ...draft,
        chatPageEnteredAt: enteredAt,
      };
      setParticipantData(updatedDraft);
      saveParticipantDraft(updatedDraft);
    }, GREETING_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [router]);

  if (!participantData || !condition) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-gray-600">準備 AI 穿搭顧問...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (currentStep !== 'chat' || !chatStartedAt) return;

    const timer = window.setInterval(() => {
      const nextElapsed = Date.now() - chatStartedAt;
      setElapsedMs(nextElapsed);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentStep, chatStartedAt]);

  const handleViewRecommendation = () => {
    if (elapsedMs < MIN_CHAT_MS) {
      setTimingNotice('您尚未完成本階段互動，請繼續與 AI 穿搭顧問聊天。');
      return;
    }

    const exitedAt = new Date().toISOString();
    const durationSec = Math.min(Math.floor(elapsedMs / 1000), Math.floor(MAX_CHAT_MS / 1000));
    const saved: ParticipantData = {
      ...participantData,
      chatPageExitedAt: exitedAt,
      chatDurationSec: durationSec,
      metMinimumChatDuration: durationSec >= Math.floor(MIN_CHAT_MS / 1000),
      clickedViewRecommendation: true,
      viewRecommendationClickedAt: exitedAt,
      finalRecommendationVersion: `${participantData.conditionId}-${participantData.finalRecommendedOutfit}`,
      sessionEndTime: exitedAt,
    };

    setParticipantData(saved);
    saveParticipantDraft(saved);
    void saveParticipantData(saved);
    setCurrentStep('recommendation');
  };

  const handleSurveyClick = () => {
    const readyForSurvey: ParticipantData = {
      ...participantData,
      clickedSurveyButton: true,
      surveyClickedAt: new Date().toISOString(),
      surveyRedirectUrl: '/survey',
      sessionEndTime: new Date().toISOString(),
    };
    setParticipantData(readyForSurvey);
    saveParticipantDraft(readyForSurvey);
    void saveParticipantData(readyForSurvey);
    router.push('/survey');
  };

  const displayOutfit = getOutfit(participantData.finalRecommendedOutfit);
  const chatLocked = elapsedMs >= MAX_CHAT_MS;
  const canViewRecommendation = elapsedMs >= MIN_CHAT_MS;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {currentStep === 'greeting' && (
          <div className="space-y-6 py-8">
            <BotHeader condition={condition} greeting={condition.greetingText} />
            <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-6 text-center text-sm text-gray-600">
              正在為你準備對話…請先確認上方的 AI 顧問類型
            </div>
          </div>
        )}

        {currentStep === 'chat' && (
          <div className="space-y-4">
            <BotHeader condition={condition} variant="compact" />
            {timingNotice && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {timingNotice}
              </div>
            )}
            <ChatInterface
              participantData={participantData}
              condition={condition}
              onUpdateData={(data) => {
                setParticipantData(data);
                saveParticipantDraft(data);
              }}
              chatLocked={chatLocked}
              minChatMs={MIN_CHAT_MS}
              maxChatMs={MAX_CHAT_MS}
              elapsedMs={elapsedMs}
            />
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">
                請至少互動 3 分鐘，最多互動 5 分鐘。達到 3 分鐘後即可查看推薦結果。
              </p>
              {chatLocked && (
                <p className="mt-2 text-sm font-semibold text-rose-700">
                  已達互動上限（5 分鐘），請查看推薦結果。
                </p>
              )}
              <button
                type="button"
                onClick={handleViewRecommendation}
                disabled={!canViewRecommendation}
                className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                查看推薦結果
              </button>
            </div>
          </div>
        )}

        {currentStep === 'recommendation' && displayOutfit && (
          <RecommendationCard
            outfit={displayOutfit}
            condition={condition}
            recommendationText={participantData.finalRecommendationText}
            participantData={participantData}
            onSurveyClick={handleSurveyClick}
          />
        )}
      </div>
    </div>
  );
}
