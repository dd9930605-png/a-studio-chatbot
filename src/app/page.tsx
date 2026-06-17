'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-10">
      <div className="w-full max-w-lg space-y-8 text-center">
        <header className="rounded-lg bg-white p-10 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl">AI 穿搭顧問</h1>
          <p className="leading-relaxed text-gray-700">
            接下來，AI 穿搭顧問會根據您剛才瀏覽的面試穿搭與您的需求，與您進行簡短互動並提供推薦結果。請依照畫面指示完成互動。
          </p>
        </header>

        <Link
          href="/pre"
          className="block w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-lg text-white shadow-lg transition hover:shadow-xl"
        >
          開始使用 AI 穿搭顧問
        </Link>

        <Link
          href="/admin"
          className="inline-block text-sm text-gray-500 underline transition hover:text-gray-700"
        >
          後台資料查看
        </Link>
      </div>
    </div>
  );
}
