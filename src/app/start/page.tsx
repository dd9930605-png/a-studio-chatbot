'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pre');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">正在進入 AI 穿搭顧問...</p>
    </div>
  );
}
