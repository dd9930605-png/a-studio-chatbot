'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { saveExperimentSession } from '@/lib/dataRecorder';
import { getRandomSurpriseMode } from '@/lib/outfits';

export default function LegacyChatRedirect() {
  const params = useParams();
  const router = useRouter();
  const conditionId = parseInt(params.conditionId as string, 10);

  useEffect(() => {
    if (!isNaN(conditionId) && conditionId >= 1 && conditionId <= 16) {
      saveExperimentSession({
        conditionId,
        surpriseMode: getRandomSurpriseMode(),
      });
      router.replace('/chat');
    } else {
      router.replace('/');
    }
  }, [conditionId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">正在進入實驗...</p>
    </div>
  );
}
