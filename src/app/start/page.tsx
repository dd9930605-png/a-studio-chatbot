'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveExperimentSession } from '@/lib/dataRecorder';
import { getRandomConditionId } from '@/lib/conditions';
import { getRandomSurpriseMode } from '@/lib/outfits';

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    saveExperimentSession({
      conditionId: getRandomConditionId(),
      surpriseMode: getRandomSurpriseMode(),
    });
    router.push('/chat');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
        <p className="text-lg text-gray-700">正在準備您的實驗環境...</p>
      </div>
    </div>
  );
}
