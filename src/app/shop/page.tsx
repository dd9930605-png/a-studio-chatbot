'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** 購物瀏覽已移至 SurveyCake，舊連結導回首頁 */
export default function ShopPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-600">正在導向 AI 穿搭顧問...</p>
    </div>
  );
}
