'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SurveyForm } from '@/components/SurveyForm';
import {
  ParticipantData,
  clearParticipantDraft,
  generateCompletionCode,
  getParticipantDraft,
  normalizeParticipantData,
  saveParticipantData,
} from '@/lib/dataRecorder';

export default function SurveyPageContent() {
  const router = useRouter();
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completionCode, setCompletionCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = getParticipantDraft();
    if (!draft) {
      router.push('/pre');
      return;
    }

    const normalized = normalizeParticipantData(draft);
    if (!normalized.favoriteOutfitBeforeAI || !normalized.finalRecommendedOutfit) {
      router.push('/chat');
      return;
    }

    if (normalized.questionnaireCompletedAt) {
      setCompletionCode(normalized.completionCode ?? '');
      setCompleted(true);
    }

    setParticipantData(normalized);
  }, [router]);

  const handleSubmit = async (responses: Record<string, number>) => {
    if (!participantData || submitting) return;

    setSubmitting(true);
    const code = generateCompletionCode(participantData.participantId);
    const completedData: ParticipantData = {
      ...participantData,
      questionnaireResponses: responses,
      questionnaireCompletedAt: new Date().toISOString(),
      completionCode: code,
      sessionEndTime: new Date().toISOString(),
    };

    await saveParticipantData(completedData);
    clearParticipantDraft();
    setCompletionCode(code);
    setCompleted(true);
    setSubmitting(false);
  };

  if (!participantData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">載入問卷中...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-lg rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">感謝您完成問卷</h1>
          <p className="mt-4 text-gray-700">您的回答已成功送出，感謝參與本研究。</p>
          {completionCode && (
            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-gray-600">完成代碼</p>
              <p className="mt-1 text-xl font-bold text-blue-700">{completionCode}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">實驗問卷</h1>
          <p className="mt-2 text-sm text-gray-600">
            請根據剛才與 AI 穿搭顧問的互動與推薦結果填答。所有題目皆為必填。
          </p>
          <p className="mt-1 text-xs text-gray-500">Participant ID: {participantData.participantId}</p>
        </header>

        <SurveyForm onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </div>
  );
}
