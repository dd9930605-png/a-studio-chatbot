'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OutfitCategoryForm } from '@/components/OutfitCategoryForm';
import { FavoriteOutfitForm } from '@/components/FavoriteOutfitForm';
import {
  ParticipantData,
  generateParticipantId,
  getExperimentSession,
  initializeParticipantData,
  saveExperimentSession,
  saveParticipantDraft,
} from '@/lib/dataRecorder';
import { getCondition, getRandomConditionId } from '@/lib/conditions';
import {
  OutfitCategory,
  getOutfitPools,
  resolveFinalOutfit,
  getRandomSurpriseMode,
  getOutfit,
} from '@/lib/outfits';
import { buildRecommendationText } from '@/lib/recommendationText';
import { captureSurveyEntry } from '@/lib/surveyReturn';

type PreStep = 'category' | 'expected';

export default function PrePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [currentStep, setCurrentStep] = useState<PreStep>('category');

  useEffect(() => {
    captureSurveyEntry(searchParams.get('return_url'));

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
      session = {
        conditionId: getRandomConditionId(),
        surpriseMode: getRandomSurpriseMode(),
      };
      saveExperimentSession(session);
    }

    const cond = getCondition(session.conditionId);
    if (!cond) {
      router.push('/');
      return;
    }

    setParticipantData(
      initializeParticipantData(
        generateParticipantId(),
        session.conditionId,
        session.surpriseMode,
        {
          explainability: cond.explainability,
          twoSidedMessage: cond.twoSidedMessage,
          anthropomorphism: cond.anthropomorphism,
          proactivity: cond.proactivity,
        },
      ),
    );
  }, [router, searchParams]);

  if (!participantData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">載入中...</p>
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
    setCurrentStep('expected');
  };

  const handleFavoriteSubmit = (favoriteOutfitBeforeAI: string) => {
    const condition = getCondition(participantData.conditionId);
    if (!condition) return;

    try {
      const { finalRecommendedOutfit, surpriseCandidateOutfits } = resolveFinalOutfit({
        surpriseMode: participantData.surpriseMode as 'surprise' | 'no_surprise',
        favoriteOutfitBeforeAI,
        allowedOutfits: participantData.allowedOutfits,
        blockedOutfits: participantData.blockedOutfits,
      });

      const outfit = getOutfit(finalRecommendedOutfit);
      const recommendationText = outfit
        ? buildRecommendationText(condition, outfit)
        : '';

      const completed: ParticipantData = {
        ...participantData,
        favoriteOutfitBeforeAI,
        finalRecommendedOutfit,
        surpriseCandidateOutfits,
        finalRecommendationText: recommendationText,
        expectationMismatch: favoriteOutfitBeforeAI === finalRecommendedOutfit ? 0 : 1,
      };

      saveParticipantDraft(completed);
      router.push('/chat');
    } catch (error) {
      alert(error instanceof Error ? error.message : '推薦邏輯發生錯誤');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">AI 穿搭顧問 — 前置問題</h1>
          <p className="mt-2 text-sm text-gray-500">請先回答以下問題，再開始與 AI 顧問互動</p>
        </div>

        {currentStep === 'category' && (
          <OutfitCategoryForm onSubmit={handleCategorySubmit} />
        )}

        {currentStep === 'expected' && (
          <FavoriteOutfitForm onSubmit={handleFavoriteSubmit} />
        )}
      </div>
    </div>
  );
}
