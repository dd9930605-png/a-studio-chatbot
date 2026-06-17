'use client';

import React, { useState } from 'react';
import { OutfitCategory } from '@/lib/outfits';

interface OutfitCategoryFormProps {
  onSubmit: (category: OutfitCategory) => void;
}

export function OutfitCategoryForm({ onSubmit }: OutfitCategoryFormProps) {
  const [category, setCategory] = useState<OutfitCategory | ''>('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!category) return;
    onSubmit(category);
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-lg">
      <p className="mb-1 text-sm font-semibold text-blue-600">AI 前置問題</p>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">開始前的問題</h1>
      <p className="mb-6 text-sm text-gray-500">
        以下問題用於協助 AI 進行推薦，並非詢問您的生理性別。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">前置問題 1</h2>
        <p className="text-gray-700">請選擇你想參考的面試穿搭類型。</p>

        <label
          className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition ${
            category === 'male' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="category"
            value="male"
            checked={category === 'male'}
            onChange={() => setCategory('male')}
            className="h-4 w-4"
          />
          <span className="font-semibold text-gray-900">男款面試穿搭</span>
        </label>

        <label
          className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition ${
            category === 'female' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="category"
            value="female"
            checked={category === 'female'}
            onChange={() => setCategory('female')}
            className="h-4 w-4"
          />
          <span className="font-semibold text-gray-900">女款面試穿搭</span>
        </label>

        <button
          type="submit"
          disabled={!category}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          下一步
        </button>
      </form>
    </div>
  );
}
