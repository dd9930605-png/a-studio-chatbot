'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl bg-white rounded-lg shadow-2xl p-12 text-center">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI 穿搭顧問
        </h1>
        <p className="text-xl text-gray-600 mb-12">碩士論文實驗系統</p>

        <div className="space-y-4 mb-12">
          <p className="text-gray-700 text-lg leading-relaxed">
            歡迎使用 AI 穿搭顧問聊天機器人。
          </p>
          <p className="text-gray-600">
            請選擇以下方式進入：
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/start">
            <button className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-lg hover:shadow-lg transition transform hover:scale-105">
              🎲 開始體驗（隨機分派）
            </button>
          </Link>

          <div className="pt-4 border-t">
            <p className="text-gray-600 mb-4 text-sm">或選擇特定實驗條件（供研究者測試）：</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((id) => (
                <Link key={id} href={`/chat/${id}`}>
                  <button className="w-full px-3 py-2 bg-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-300 transition text-sm">
                    條件 {id}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/admin">
            <button className="text-blue-600 hover:text-blue-800 font-medium text-sm underline">
              📊 研究者後台（查看數據）
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
