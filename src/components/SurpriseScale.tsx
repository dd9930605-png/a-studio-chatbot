'use client';

import React, { useMemo, useState } from 'react';
import { ParticipantData } from '@/lib/dataRecorder';

interface SurpriseScaleProps {
  participantData: ParticipantData;
  onUpdateData: (data: ParticipantData) => void;
  onComplete: (data: ParticipantData) => void;
}

const scaleItems = [
  '這次推薦結果讓我感到驚喜。',
  '這次推薦和我原本預期有差異。',
  '這次推薦提供了我沒有想到的搭配方向。',
  '這次推薦讓我重新思考面試穿搭的可能性。',
  '整體而言，這次推薦帶給我新鮮感。',
];

export function SurpriseScale({ participantData, onUpdateData, onComplete }: SurpriseScaleProps) {
  const [scores, setScores] = useState<number[]>(participantData.styleSurpriseItems);

  const averageScore = useMemo(() => {
    if (scores.length !== scaleItems.length || scores.some((score) => !score)) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [scores]);

  const isComplete = scores.length === scaleItems.length && scores.every((score) => score >= 1);

  const handleScoreChange = (index: number, value: number) => {
    const nextScores = [...scores];
    nextScores[index] = value;
    setScores(nextScores);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isComplete) {
      return;
    }

    const updatedData: ParticipantData = {
      ...participantData,
      styleSurpriseItems: scores,
      styleSurpriseScore: averageScore,
      sessionEndTime: new Date().toISOString(),
    };

    onUpdateData(updatedData);
    onComplete(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-8 shadow-lg">
      <h2 className="mb-2 text-3xl font-bold text-gray-900">風格驚喜感量表</h2>
      <p className="mb-6 text-gray-600">請依照你的感受選擇 1（非常不同意）到 5（非常同意）。</p>

      <div className="space-y-6">
        {scaleItems.map((item, index) => (
          <div key={item} className="rounded-lg border border-gray-200 p-4">
            <p className="mb-3 font-medium text-gray-800">
              {index + 1}. {item}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <label
                  key={score}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-center transition ${
                    scores[index] === score
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`surprise-${index}`}
                    value={score}
                    checked={scores[index] === score}
                    onChange={() => handleScoreChange(index, score)}
                    className="sr-only"
                  />
                  {score}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={!isComplete}
        className="mt-8 w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        完成實驗
      </button>
    </form>
  );
}
