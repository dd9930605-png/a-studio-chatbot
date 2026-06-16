'use client';

import React, { Suspense } from 'react';
import PrePageContent from './PrePageContent';

export default function PrePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">載入中...</div>}>
      <PrePageContent />
    </Suspense>
  );
}
