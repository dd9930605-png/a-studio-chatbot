'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 舊連結相容：導向購物網站流程的起點 */
export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/shop');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">正在前往購物網站...</p>
    </div>
  );
}
