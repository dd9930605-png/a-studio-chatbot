'use client';

import React from 'react';
import { QuestionOption } from '@/lib/questionnaire';

interface SingleChoiceQuestionProps {
  itemId: string;
  questionText: string;
  options: QuestionOption[];
  value: number | null;
  onChange: (itemId: string, value: number) => void;
  showError?: boolean;
}

export function SingleChoiceQuestion({
  itemId,
  questionText,
  options,
  value,
  onChange,
  showError = false,
}: SingleChoiceQuestionProps) {
  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white p-5">
      <legend className="mb-4 text-base font-medium text-gray-900">{questionText}</legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
              value === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={itemId}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(itemId, option.value)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-800">{option.label}</span>
          </label>
        ))}
      </div>
      {showError && value === null && (
        <p className="mt-3 text-sm text-red-600">此題為必填，請選擇一個選項。</p>
      )}
    </fieldset>
  );
}
