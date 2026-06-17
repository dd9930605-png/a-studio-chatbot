'use client';

import React, { Suspense } from 'react';
import HomePageContent from './HomePageContent';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">載入中...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
