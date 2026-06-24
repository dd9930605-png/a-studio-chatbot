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

export default function ChatPageContent() {
  const router = useRouter();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [condition, setCondition] = useState<ReturnType<typeof getCondition>>(undefined);
  const [currentStep, setCurrentStep] = useState<Step>('greeting');
  const [chatStep, setChatStep] = useState('stylePreference');

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

  const handleChatStepChange = (step: string) => {
    setChatStep(step);
    if (step === 'recommendation') {
      const saved = {
        ...participantData,
        sessionEndTime: new Date().toISOString(),
      };
      setParticipantData(saved);
      saveParticipantDraft(saved);
      void saveParticipantData(saved);
      setCurrentStep('recommendation');
    }
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
          <div className="space-y-6">
            <BotHeader condition={condition} greeting={condition.greetingText} />
            <ChatInterface
              participantData={participantData}
              condition={condition}
              onUpdateData={(data) => {
                setParticipantData(data);
                saveParticipantDraft(data);
              }}
              onStepChange={handleChatStepChange}
              currentStep={chatStep}
            />
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
