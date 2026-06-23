import questionnaireData from '../../public/questionnaire.json';

export type QuestionType = 'likert_7' | 'single_choice';

export interface QuestionOption {
  value: number;
  label: string;
}

export interface QuestionnaireItem {
  itemId: string;
  questionType: QuestionType;
  questionText: string;
  required: boolean;
  options?: QuestionOption[];
}

export interface QuestionnaireSection {
  sectionOrder: number;
  academicVariable: string;
  displayTitle: string;
  instructions: string;
  items: QuestionnaireItem[];
}

export interface QuestionnaireDefinition {
  scaleLabels: Record<string, string>;
  sections: QuestionnaireSection[];
}

export const questionnaire = questionnaireData as QuestionnaireDefinition;

export function getAllQuestionnaireItems(): QuestionnaireItem[] {
  return questionnaire.sections
    .slice()
    .sort((a, b) => a.sectionOrder - b.sectionOrder)
    .flatMap((section) => section.items);
}

export function getQuestionnaireItemIds(): string[] {
  return getAllQuestionnaireItems().map((item) => item.itemId);
}

export function getLikertScaleLabels(): { value: number; label: string }[] {
  return Object.entries(questionnaire.scaleLabels)
    .map(([value, label]) => ({ value: Number(value), label }))
    .sort((a, b) => a.value - b.value);
}

export function validateQuestionnaireResponses(
  responses: Record<string, number | string | null | undefined>,
): string | null {
  for (const item of getAllQuestionnaireItems()) {
    if (!item.required) continue;

    const value = responses[item.itemId];
    if (value === undefined || value === null || value === '') {
      return `請完成所有必填題目（尚未回答：${item.itemId}）。`;
    }

    if (item.questionType === 'likert_7') {
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 1 || numeric > 7) {
        return `題目 ${item.itemId} 請選擇 1 到 7 的選項。`;
      }
    }

    if (item.questionType === 'single_choice') {
      const numeric = Number(value);
      const allowed = item.options?.map((option) => option.value) ?? [];
      if (!allowed.includes(numeric)) {
        return `題目 ${item.itemId} 請選擇一個有效選項。`;
      }
    }
  }

  return null;
}
