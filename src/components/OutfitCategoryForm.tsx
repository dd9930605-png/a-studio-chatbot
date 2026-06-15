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
      <h1 className="mb-2 text-2xl font-bold text-gray-900">AI 穿搭顧問</h1>
      <p className="mb-6 text-gray-600">在開始之前，請先回答以下問題。</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-lg font-medium text-gray-800">請選擇你想參考的面試穿搭類型。</p>

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
          <div>
            <p className="font-semibold text-gray-900">男款面試穿搭</p>
            <p className="text-sm text-gray-500">參考男款區穿搭為主</p>
          </div>
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
          <div>
            <p className="font-semibold text-gray-900">女款面試穿搭</p>
            <p className="text-sm text-gray-500">參考女款區穿搭為主</p>
          </div>
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
