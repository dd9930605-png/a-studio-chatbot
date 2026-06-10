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
import { getCondition } from '@/lib/conditions';

type Step = 'expectation' | 'greeting' | 'chat' | 'recommendation' | 'surprise' | 'complete';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conditionId = parseInt(params.conditionId as string);

  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [condition, setCondition] = useState<any>(null);
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

  const handleChatStepChange = (step: string) => {
    setChatStep(step);

    if (step === 'recommendation') {
      setCurrentStep('recommendation');
      const updated = {
        ...participantData,
        finalRecommendationText: condition.finalRecommendationText,
        expectationMismatch:
          participantData.expectedOutfit === participantData.finalRecommendedOutfit ? 0 : 1,
      };
      setParticipantData(updated);
    }
  };

  const handleSurpriseComplete = () => {
    setCurrentStep('complete');
    saveToLocalStorage(participantData);
    console.log('Participant data saved:', participantData);
  };

  const handleClickSurvey = () => {
    const updated = {
      ...participantData,
      clickedSurveyButton: true,
      surveyClickedAt: new Date().toISOString(),
      sessionEndTime: new Date().toISOString(),
    };
    setParticipantData(updated);
    saveToLocalStorage(updated);

    setTimeout(() => {
      const surveyUrl = `${condition.surveyUrl}&participantId=${updated.participantId}&conditionId=${conditionId}`;
      window.location.href = surveyUrl;
    }, 1000);
  };

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
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition"
            >
              前往問卷調查 →
            </button>

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
