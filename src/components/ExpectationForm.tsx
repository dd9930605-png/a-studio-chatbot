'use client';

import React, { useState } from 'react';
import { ParticipantData } from '@/lib/dataRecorder';

interface ExpectationFormProps {
  participantData: ParticipantData;
  onSubmit: (outfit: string) => void;
}

const outfitOptions = [
  '白色襯衫＋黑色領帶＋黑色牛仔褲',
  '深色西裝外套＋襯衫＋西裝褲',
  '針織衫＋襯衫＋直筒褲',
  '素色上衣＋長裙＋樂福鞋',
];

export function ExpectationForm({ participantData, onSubmit }: ExpectationFormProps) {
  const [selectedOutfit, setSelectedOutfit] = useState(participantData.expectedOutfit);
  const [customOutfit, setCustomOutfit] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const outfit = selectedOutfit === 'custom' ? customOutfit.trim() : selectedOutfit;
    if (!outfit) {
      return;
    }

    onSubmit(outfit);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">開始前的小問題</h1>
      <p className="text-gray-600 mb-6">
        請先想像：如果要參加重要面試，你預期 AI 會推薦哪一種韓系穿搭？
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {outfitOptions.map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-blue-50"
          >
            <input
              type="radio"
              name="expectedOutfit"
              value={option}
              checked={selectedOutfit === option}
              onChange={(event) => setSelectedOutfit(event.target.value)}
              className="h-4 w-4"
            />
            <span className="text-gray-800">{option}</span>
          </label>
        ))}

        <label className="block rounded-lg border border-gray-200 p-4 hover:bg-blue-50">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="expectedOutfit"
              value="custom"
              checked={selectedOutfit === 'custom'}
              onChange={(event) => setSelectedOutfit(event.target.value)}
              className="h-4 w-4"
            />
            <span className="text-gray-800">其他</span>
          </div>
          {selectedOutfit === 'custom' && (
            <input
              type="text"
              value={customOutfit}
              onChange={(event) => setCustomOutfit(event.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2"
              placeholder="請輸入你的預期穿搭"
            />
          )}
        </label>

        <button
          type="submit"
          disabled={!selectedOutfit || (selectedOutfit === 'custom' && !customOutfit.trim())}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          進入 AI 穿搭顧問
        </button>
      </form>
    </div>
  );
}
