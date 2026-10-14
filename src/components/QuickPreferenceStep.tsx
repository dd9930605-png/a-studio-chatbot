'use client';

import React, { useState } from 'react';
import {
  COLOR_QUESTION,
  FORMALITY_QUESTION,
  IMPRESSION_QUESTION,
  QUICK_PREFERENCE_INTRO,
  QuickColor,
  QuickFormality,
  QuickImpression,
  QuickPreferences,
} from '@/lib/quickPreferences';

interface QuickPreferenceStepProps {
  onComplete: (preferences: QuickPreferences) => void;
}

export function QuickPreferenceStep({ onComplete }: QuickPreferenceStepProps) {
  const [preferenceFormality, setPreferenceFormality] = useState<QuickFormality | ''>('');
  const [preferenceImpression, setPreferenceImpression] = useState<QuickImpression | ''>('');
  const [preferenceColor, setPreferenceColor] = useState<QuickColor | ''>('');

  const ready = Boolean(preferenceFormality && preferenceImpression && preferenceColor);

  return (
    <form
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!preferenceFormality || !preferenceImpression || !preferenceColor) return;
        onComplete({ preferenceFormality, preferenceImpression, preferenceColor });
      }}
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">基本偏好</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">{QUICK_PREFERENCE_INTRO}</p>
      </div>

      <PreferenceGroup
        title={FORMALITY_QUESTION.title}
        name="preferenceFormality"
        options={FORMALITY_QUESTION.options}
        value={preferenceFormality}
        onChange={setPreferenceFormality}
      />
      <PreferenceGroup
        title={IMPRESSION_QUESTION.title}
        name="preferenceImpression"
        options={IMPRESSION_QUESTION.options}
        value={preferenceImpression}
        onChange={setPreferenceImpression}
      />
      <PreferenceGroup
        title={COLOR_QUESTION.title}
        name="preferenceColor"
        options={COLOR_QUESTION.options}
        value={preferenceColor}
        onChange={setPreferenceColor}
      />

      <button
        type="submit"
        disabled={!ready}
        className="w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        開始與 AI 顧問互動
      </button>
    </form>
  );
}

function PreferenceGroup<T extends string>({
  title,
  name,
  options,
  value,
  onChange,
}: {
  title: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-base font-bold text-slate-900">{title}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm sm:text-base ${
                selected
                  ? 'border-blue-600 bg-blue-50 font-semibold text-blue-950'
                  : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="h-4 w-4"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
