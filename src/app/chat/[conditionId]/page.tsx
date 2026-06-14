'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BotHeader } from '@/components/BotHeader';
import { ChatInterface } from '@/components/ChatInterface';
import { RecommendationCard } from '@/components/RecommendationCard';
import { SurpriseScale } from '@/components/SurpriseScale';
import { ExpectationForm } from '@/components/ExpectationForm';
import {
  ParticipantData,
  generateParticipantId,
  initializeParticipantData,
  saveToLocalStorage,
} from '@/lib/dataRecorder';
import { buildSurveyUrl, Condition, getCondition, hasValidSurveyUrl } from '@/lib/conditions';

type Step = 'expectation' | 'greeting' | 'chat' | 'recommendation' | 'surprise' | 'complete';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conditionId = parseInt(params.conditionId as string);

  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('expectation');
  const [chatStep, setChatStep] = useState<string>('stylePreference');

  useEffect(() => {
    const cond = getCondition(conditionId);
    if (!cond) {
      alert('條件不存在');
      router.push('/');
      return;
    }

    setCondition(cond);

    const participantId = generateParticipantId();
    const data = initializeParticipantData(participantId, conditionId, {
      explainability: cond.explainability,
      twoSidedMessage: cond.twoSidedMessage,
      anthropomorphism: cond.anthropomorphism,
      proactivity: cond.proactivity,
    });

    setParticipantData(data);
  }, [conditionId, router]);

  if (!participantData || !condition) {
    return <div className="flex items-center justify-center min-h-screen">載入中...</div>;
  }

  const handleExpectationSubmit = (outfit: string) => {
    const updated = { ...participantData, expectedOutfit: outfit };
    setParticipantData(updated);
    setCurrentStep('greeting');

    setTimeout(() => {
      setCurrentStep('chat');
      setChatStep('stylePreference');
    }, 1500);
  };

  const handleUpdateData = (data: ParticipantData) => {
    setParticipantData(data);
  };

  const handleChatStepChange = (step: string, latestData?: ParticipantData) => {
    setChatStep(step);

    if (step === 'recommendation') {
      const sourceData = latestData ?? participantData;
      setCurrentStep('recommendation');
      const updated = {
        ...sourceData,
        finalRecommendedOutfit: condition.finalRecommendedOutfit,
        finalRecommendationText: condition.finalRecommendationText,
        expectationMismatch:
          sourceData.expectedOutfit === condition.finalRecommendedOutfit ? 0 : 1,
      };
      setParticipantData(updated);
    }
  };

  const handleSurpriseComplete = (data: ParticipantData) => {
    const completedData = {
      ...data,
      sessionEndTime: data.sessionEndTime ?? new Date().toISOString(),
    };

    setCurrentStep('complete');
    setParticipantData(completedData);
    saveToLocalStorage(completedData);
    console.log('Participant data saved:', completedData);
  };

  const handleClickSurvey = () => {
    const surveyUrl = buildSurveyUrl(condition.surveyUrl, {
      participantId: participantData.participantId,
      conditionId,
    });

    if (!surveyUrl) {
      alert('問卷網址尚未設定。請研究者先設定有效的問卷連結。');
      return;
    }

    const updated = {
      ...participantData,
      clickedSurveyButton: true,
      surveyClickedAt: new Date().toISOString(),
      sessionEndTime: new Date().toISOString(),
    };
    setParticipantData(updated);
    saveToLocalStorage(updated);

    setTimeout(() => {
      window.location.assign(surveyUrl);
    }, 1000);
  };

  const surveyConfigured = hasValidSurveyUrl(condition.surveyUrl);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {currentStep === 'expectation' && (
          <ExpectationForm participantData={participantData} onSubmit={handleExpectationSubmit} />
        )}

        {currentStep === 'greeting' && (
          <div className="text-center space-y-4">
            <div className="animate-pulse text-2xl">準備中...</div>
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

            <div className="h-96">
              <ChatInterface
                participantData={participantData}
                condition={condition}
                onUpdateData={handleUpdateData}
                onStepChange={handleChatStepChange}
                currentStep={chatStep}
              />
            </div>
          </div>
        )}

        {currentStep === 'recommendation' && (
          <RecommendationCard
            recommendation={participantData.finalRecommendedOutfit}
            recommendationText={participantData.finalRecommendationText}
            recommendationImage={condition.finalRecommendationImage}
            participantData={participantData}
            onClickSurvey={() => {
              setCurrentStep('surprise');
            }}
          />
        )}

        {currentStep === 'surprise' && (
          <div className="space-y-6">
            <SurpriseScale
              participantData={participantData}
              onUpdateData={handleUpdateData}
              onComplete={handleSurpriseComplete}
            />

            <div className="text-center mt-8">
              <button
                onClick={() => setCurrentStep('complete')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                跳過問卷直接完成
              </button>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center space-y-6">
            <h2 className="text-3xl font-bold text-green-600">✓ 實驗完成</h2>
            <p className="text-gray-700 text-lg">感謝你的參與！</p>

            <button
              onClick={handleClickSurvey}
              disabled={!surveyConfigured}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {surveyConfigured ? '前往問卷調查 →' : '問卷網址尚未設定'}
            </button>

            {!surveyConfigured && (
              <p className="text-sm text-red-600">
                目前條件資料仍是範例網址，請設定正式問卷 URL 後再開放受試者填答。
              </p>
            )}

            <div className="text-xs text-gray-500 mt-8">
              <p>Participant ID: {participantData.participantId}</p>
              <p>Condition ID: {participantData.conditionId}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
