'use client';

import React, { useMemo, useState } from 'react';
import { LikertQuestion } from '@/components/LikertQuestion';
import { SingleChoiceQuestion } from '@/components/SingleChoiceQuestion';
import {
  QuestionnaireSection,
  questionnaire,
  validateQuestionnaireResponses,
} from '@/lib/questionnaire';

interface SurveyFormProps {
  onSubmit: (responses: Record<string, number>) => void;
  submitting?: boolean;
}

export function SurveyForm({ onSubmit, submitting = false }: SurveyFormProps) {
  const sections = useMemo(
    () => questionnaire.sections.slice().sort((a, b) => a.sectionOrder - b.sectionOrder),
    [],
  );
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (itemId: string, value: number) => {
    setResponses((current) => ({ ...current, [itemId]: value }));
    setFormError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateQuestionnaireResponses(responses);
    if (validationError) {
      setShowErrors(true);
      setFormError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setShowErrors(false);
    setFormError('');
    onSubmit(responses);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {formError}
        </div>
      )}

      {sections.map((section: QuestionnaireSection) => (
        <section key={section.sectionOrder} className="space-y-5">
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6">
            <p className="text-sm font-semibold text-blue-700">
              第 {section.sectionOrder} 部分 · {section.displayTitle}
            </p>
            <p className="mt-2 text-sm text-gray-700">{section.instructions}</p>
          </div>

          <div className="space-y-5">
            {section.items.map((item) => {
              const value = responses[item.itemId] ?? null;

              if (item.questionType === 'likert_7') {
                return (
                  <LikertQuestion
                    key={item.itemId}
                    itemId={item.itemId}
                    questionText={item.questionText}
                    value={value}
                    onChange={handleChange}
                    showError={showErrors}
                  />
                );
              }

              return (
                <SingleChoiceQuestion
                  key={item.itemId}
                  itemId={item.itemId}
                  questionText={item.questionText}
                  options={item.options ?? []}
                  value={value}
                  onChange={handleChange}
                  showError={showErrors}
                />
              );
            })}
          </div>
        </section>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-lg font-bold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? '送出中...' : '送出問卷'}
      </button>
    </form>
  );
}
