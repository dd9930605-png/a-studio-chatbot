'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
            AI 穿搭顧問與面試穿搭推薦研究
          </h1>
          <p className="text-gray-600">碩士論文實驗系統</p>
        </header>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">簡短說明</h2>
          <p className="leading-relaxed text-gray-700">
            歡迎參與本研究。本研究想了解消費者在使用 AI 穿搭顧問時，對 AI
            推薦內容的感受與評價。接下來，請依照頁面指示完成情境閱讀、穿搭瀏覽、AI
            顧問互動與後續問卷。
          </p>
        </section>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">情境說明</h2>
          <p className="leading-relaxed text-gray-700">
            請想像你即將參加一場重要面試。為了在面試中呈現專業、自然且合適的形象，你需要從線上服飾購物網站中挑選一套面試穿搭。接下來，請先瀏覽網站中的穿搭選項，稍後再使用
            AI 穿搭顧問獲得推薦。
          </p>
        </section>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">影片／情境圖片</h2>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center text-gray-400">
            影片／情境圖片區塊
            <br />
            之後將替換為正式素材
          </div>
        </section>

        <section className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">操作流程</h2>
          <ol className="list-decimal space-y-2 pl-5 text-gray-700">
            <li>請先閱讀或觀看面試穿搭情境。</li>
            <li>請點擊進入購物網站，瀏覽 12 套面試穿搭。</li>
            <li>瀏覽完成後，請點擊「前往 AI 穿搭顧問」。</li>
            <li>請依照 AI 穿搭顧問的問題進行互動。</li>
            <li>完成 AI 推薦後，請點擊「前往正式問卷」。</li>
          </ol>
        </section>

        <section>
          <Link
            href="/shop"
            className="block w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 text-center font-bold text-lg text-white shadow-lg transition hover:shadow-xl"
          >
            前往購物網站瀏覽穿搭
          </Link>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <p className="mb-3 text-sm font-semibold text-gray-500">研究者測試區</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop" className="text-sm text-blue-600 underline">
              購物網站
            </Link>
            <Link href="/pre" className="text-sm text-blue-600 underline">
              AI 前置問題
            </Link>
            <Link href="/admin" className="text-sm text-blue-600 underline">
              研究者後台
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
