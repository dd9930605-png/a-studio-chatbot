'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI 穿搭顧問實驗
          </h1>
          <p className="text-gray-600">碩士論文實驗系統 — 線上服飾購物情境</p>
        </header>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">研究情境說明</h2>
          <p className="leading-relaxed text-gray-700">
            請想像你即將參加一場重要面試。為了在面試中呈現專業、自然且合適的形象，你需要從線上服飾購物網站中挑選一套面試穿搭。接下來，請先瀏覽網站中的穿搭選項，並稍後使用 AI 穿搭顧問獲得推薦。
          </p>
        </section>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">情境影片 / 圖片</h2>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
            影片或情境素材 placeholder（之後替換）
          </div>
        </section>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">操作流程</h2>
          <ol className="list-decimal space-y-2 pl-5 text-gray-700">
            <li>請先閱讀或觀看面試穿搭情境。</li>
            <li>請點擊進入購物網站，瀏覽 12 套面試穿搭。</li>
            <li>看完後請回到本頁。</li>
            <li>請點擊「開始使用 AI 穿搭顧問」。</li>
            <li>完成 AI 推薦後，請前往問卷填答。</li>
          </ol>
        </section>

        <section className="space-y-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert('購物網站由研究者自行設定，請將此按鈕連結替換為您的購物網站網址。');
            }}
            className="block w-full rounded-lg bg-gray-800 px-8 py-4 text-center font-bold text-white transition hover:bg-gray-900"
          >
            前往購物網站（瀏覽 12 套穿搭）
          </a>

          <Link href="/start">
            <button className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-lg text-white transition hover:shadow-lg">
              開始使用 AI 穿搭顧問
            </button>
          </Link>

          <button
            disabled
            className="w-full cursor-not-allowed rounded-lg border-2 border-gray-300 px-8 py-4 font-bold text-gray-400"
          >
            前往問卷（問卷連結尚未設定）
          </button>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <p className="mb-3 text-sm font-semibold text-gray-500">研究者測試區</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }, (_, i) => i + 1).map((id) => (
              <Link key={id} href={`/chat?condition=${id}`}>
                <button className="w-full rounded bg-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300">
                  條件 {id}
                </button>
              </Link>
            ))}
          </div>
          <Link href="/admin" className="mt-4 inline-block text-sm text-blue-600 underline">
            研究者後台（查看數據）
          </Link>
        </section>
      </div>
    </div>
  );
}
