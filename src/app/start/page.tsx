'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRandomConditionId } from '@/lib/conditions';

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    const conditionId = getRandomConditionId();
    router.push(`/chat/${conditionId}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg text-gray-700">正在準備您的實驗環境...</p>
      </div>
    </div>
  );
}
