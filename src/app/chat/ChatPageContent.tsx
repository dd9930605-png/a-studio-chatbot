'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BotHeader } from '@/components/BotHeader';
import { ChatInterface } from '@/components/ChatInterface';
import { RecommendationCard } from '@/components/RecommendationCard';
import { OutfitCategoryForm } from '@/components/OutfitCategoryForm';
import { AcceptableOutfitsForm } from '@/components/AcceptableOutfitsForm';
import { ExpectedOutfitForm } from '@/components/ExpectedOutfitForm';
import {
  ParticipantData,
  generateParticipantId,
  getExperimentSession,
  initializeParticipantData,
  saveExperimentSession,
  saveToLocalStorage,
} from '@/lib/dataRecorder';
import {
  buildSurveyUrl,
  getCondition,
  getRandomConditionId,
  hasValidSurveyUrl,
} from '@/lib/conditions';
import {
  Outfit,
  OutfitCategory,
  getOutfit,
  getOutfitPools,
  resolveFinalOutfit,
  getRandomSurpriseMode,
} from '@/lib/outfits';
import { buildRecommendationText } from '@/lib/recommendationText';

type Step =
  | 'category'
  | 'acceptable'
  | 'expected'
  | 'greeting'
  | 'chat'
  | 'recommendation'
  | 'complete';

export default function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [condition, setCondition] = useState<ReturnType<typeof getCondition>>(undefined);
  const [finalOutfit, setFinalOutfit] = useState<Outfit | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('category');
  const [chatStep, setChatStep] = useState('stylePreference');

  useEffect(() => {
    let session = getExperimentSession();

    const conditionParam = searchParams.get('condition');
    if (conditionParam) {
      const conditionId = parseInt(conditionParam, 10);
      if (!isNaN(conditionId) && conditionId >= 1 && conditionId <= 16) {
        const surpriseParam = searchParams.get('surprise');
        session = {
          conditionId,
          surpriseMode:
            surpriseParam === 'no_surprise' || surpriseParam === 'surprise'
              ? surpriseParam
              : getRandomSurpriseMode(),
        };
        saveExperimentSession(session);
      }
    }

    if (!session) {
      const conditionId = getRandomConditionId();
      session = { conditionId, surpriseMode: getRandomSurpriseMode() };
      saveExperimentSession(session);
    }

    const cond = getCondition(session.conditionId);
    if (!cond) {
      router.push('/');
      return;
    }

    setCondition(cond);
    const participantId = generateParticipantId();
    setParticipantData(
      initializeParticipantData(participantId, session.conditionId, session.surpriseMode, {
        explainability: cond.explainability,
        twoSidedMessage: cond.twoSidedMessage,
        anthropomorphism: cond.anthropomorphism,
        proactivity: cond.proactivity,
      }),
    );
  }, [router, searchParams]);

  if (!participantData || !condition) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-gray-600">載入實驗環境...</p>
        </div>
      </div>
    );
  }

  const handleCategorySubmit = (category: OutfitCategory) => {
    const pools = getOutfitPools(category);
    setParticipantData({
      ...participantData,
      selectedOutfitCategory: category,
      allowedOutfits: pools.allowedOutfits,
      blockedOutfits: pools.blockedOutfits,
    });
    setCurrentStep('acceptable');
  };

  const handleAcceptableSubmit = (acceptableOutfits: string[]) => {
    setParticipantData({ ...participantData, acceptableOutfits });
    setCurrentStep('expected');
  };

  const handleExpectedSubmit = (expectedOutfit: string) => {
    try {
      const { finalRecommendedOutfit, surpriseCandidateOutfits } = resolveFinalOutfit({
        surpriseMode: participantData.surpriseMode as 'surprise' | 'no_surprise',
        expectedOutfit,
        acceptableOutfits: participantData.acceptableOutfits,
        allowedOutfits: participantData.allowedOutfits,
        blockedOutfits: participantData.blockedOutfits,
      });

      const outfit = getOutfit(finalRecommendedOutfit);
      const recommendationText = outfit ? buildRecommendationText(condition, outfit) : '';

      const updated: ParticipantData = {
        ...participantData,
        expectedOutfit,
        finalRecommendedOutfit,
        surpriseCandidateOutfits,
        finalRecommendationText: recommendationText,
        expectationMismatch: expectedOutfit === finalRecommendedOutfit ? 0 : 1,
      };

      setParticipantData(updated);
      if (outfit) setFinalOutfit(outfit);
      setCurrentStep('greeting');

      setTimeout(() => {
        setCurrentStep('chat');
        setChatStep('stylePreference');
      }, 1500);
    } catch (error) {
      alert(error instanceof Error ? error.message : '推薦邏輯發生錯誤');
    }
  };

  const handleChatStepChange = (step: string) => {
    setChatStep(step);
    if (step === 'recommendation') {
      setCurrentStep('recommendation');
    }
  };

  const handleRecommendationContinue = () => {
    const completed: ParticipantData = {
      ...participantData,
      sessionEndTime: new Date().toISOString(),
    };
    setParticipantData(completed);
    saveToLocalStorage(completed);
    console.log('Participant data saved:', completed);
    setCurrentStep('complete');
  };

  const handleClickSurvey = () => {
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

    const updated: ParticipantData = {
      ...participantData,
      clickedSurveyButton: true,
      surveyClickedAt: new Date().toISOString(),
      surveyRedirectUrl: surveyUrl,
      sessionEndTime: new Date().toISOString(),
    };
    setParticipantData(updated);
    saveToLocalStorage(updated);
    window.location.assign(surveyUrl);
  };

  const surveyConfigured = hasValidSurveyUrl(condition.surveyUrl);
  const displayOutfit = finalOutfit ?? getOutfit(participantData.finalRecommendedOutfit);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {currentStep === 'category' && <OutfitCategoryForm onSubmit={handleCategorySubmit} />}

        {currentStep === 'acceptable' && (
          <AcceptableOutfitsForm
            allowedOutfits={participantData.allowedOutfits}
            onSubmit={handleAcceptableSubmit}
          />
        )}

        {currentStep === 'expected' && (
          <ExpectedOutfitForm
            acceptableOutfits={participantData.acceptableOutfits}
            onSubmit={handleExpectedSubmit}
          />
        )}

        {currentStep === 'greeting' && (
          <div className="space-y-4 text-center">
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
            onContinue={handleRecommendationContinue}
          />
        )}

        {currentStep === 'complete' && (
          <div className="space-y-6 rounded-lg bg-white p-12 text-center shadow-lg">
            <h2 className="text-3xl font-bold text-green-600">✓ 實驗完成</h2>
            <p className="text-lg text-gray-700">感謝你的參與！請前往問卷填答。</p>

            <button
              onClick={handleClickSurvey}
              disabled={!surveyConfigured}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {surveyConfigured ? '前往問卷調查 →' : '問卷網址尚未設定'}
            </button>

            {!surveyConfigured && (
              <p className="text-sm text-red-600">
                目前條件資料仍是範例網址，請設定正式問卷 URL 後再開放受試者填答。
              </p>
            )}

            <div className="mt-8 space-y-1 text-xs text-gray-500">
              <p>Participant ID: {participantData.participantId}</p>
              <p>Condition ID: {participantData.conditionId}</p>
              <p>Surprise Mode: {participantData.surpriseMode}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
