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
} from '@/lib/dataRecorder';
import {
  buildSurveyUrl,
  getCondition,
  hasValidSurveyUrl,
} from '@/lib/conditions';
import { getOutfit } from '@/lib/outfits';
import { returnToSurveyCake } from '@/lib/surveyReturn';

type Step = 'greeting' | 'chat' | 'recommendation';

export default function ChatPageContent() {
  const router = useRouter();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [condition, setCondition] = useState<ReturnType<typeof getCondition>>(undefined);
  const [currentStep, setCurrentStep] = useState<Step>('greeting');
  const [chatStep, setChatStep] = useState('stylePreference');

  useEffect(() => {
    const draft = getParticipantDraft();
    if (!draft || !draft.expectedOutfit) {
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
    }, 1500);

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
      void saveParticipantData(saved);
      setCurrentStep('recommendation');
    }
  };

  const handleSurveyClick = () => {
    const surveyUrl = buildSurveyUrl(condition.surveyUrl, {
      participantId: participantData.participantId,
      conditionId: participantData.conditionId,
      surpriseMode: participantData.surpriseMode,
      expectedOutfit: participantData.expectedOutfit,
      finalRecommendedOutfit: participantData.finalRecommendedOutfit,
      expectationMismatch: participantData.expectationMismatch,
      selectedOutfitCategory: participantData.selectedOutfitCategory,
    });

    if (!surveyUrl) {
      alert('問卷網址尚未設定。請研究者先設定有效的問卷連結。');
      return;
    }

    const completed: ParticipantData = {
      ...participantData,
      clickedSurveyButton: true,
      surveyClickedAt: new Date().toISOString(),
      surveyRedirectUrl: surveyUrl,
      sessionEndTime: new Date().toISOString(),
    };
    setParticipantData(completed);
    void saveParticipantData(completed);
    returnToSurveyCake(surveyUrl, {
      participantId: participantData.participantId,
      conditionId: participantData.conditionId,
      surpriseMode: participantData.surpriseMode,
      expectedOutfit: participantData.expectedOutfit,
      finalRecommendedOutfit: participantData.finalRecommendedOutfit,
      expectationMismatch: participantData.expectationMismatch,
      selectedOutfitCategory: participantData.selectedOutfitCategory,
    }, condition.surveyContinueUrl);
  };

  const displayOutfit = getOutfit(participantData.finalRecommendedOutfit);
  const surveyConfigured = hasValidSurveyUrl(condition.surveyUrl);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {currentStep === 'greeting' && (
          <div className="space-y-4 py-20 text-center">
            <div className="animate-pulse text-2xl text-gray-600">準備中...</div>
          </div>
        )}

        {currentStep === 'chat' && (
          <div className="space-y-6">
            <BotHeader
              botName={condition.botName}
              avatarUrl={condition.avatarUrl}
              avatarType={condition.avatarType}
              greeting={condition.greetingText}
            />
            <ChatInterface
              participantData={participantData}
              condition={condition}
              onUpdateData={setParticipantData}
              onStepChange={handleChatStepChange}
              currentStep={chatStep}
            />
          </div>
        )}

        {currentStep === 'recommendation' && displayOutfit && (
          <RecommendationCard
            outfit={displayOutfit}
            recommendationText={participantData.finalRecommendationText}
            participantData={participantData}
            surveyConfigured={surveyConfigured}
            onSurveyClick={handleSurveyClick}
          />
        )}
      </div>
    </div>
  );
}
