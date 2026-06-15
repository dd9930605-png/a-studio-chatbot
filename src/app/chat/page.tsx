'use client';

import React, { Suspense } from 'react';
import ChatPageContent from './ChatPageContent';

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">載入中...</p>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
