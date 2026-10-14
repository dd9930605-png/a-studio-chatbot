/**
 * 快速基本需求題（三題）：所有 16 組內容、順序、選項完全相同。
 * 用途：保證 PRO 需求整理與 EX High 有真實使用者資料；
 * 不影響 surpriseMode、不取代 Favorite／PK／Prediction、不改變推薦演算法。
 */

export type QuickFormality = 'formal' | 'moderate' | 'less_formal' | 'none';
export type QuickImpression = 'professional' | 'minimal' | 'approachable' | 'none';
export type QuickColor = 'dark' | 'light' | 'neutral' | 'no_clear' | 'none';

export type QuickPreferenceKey = 'preferenceFormality' | 'preferenceImpression' | 'preferenceColor';

export interface QuickPreferenceOption<T extends string> {
  value: T;
  label: string;
}

export interface QuickPreferenceQuestion<T extends string> {
  key: QuickPreferenceKey;
  title: string;
  options: QuickPreferenceOption<T>[];
}

export const QUICK_PREFERENCE_INTRO =
  '在開始與 AI 穿搭顧問互動前，請先提供幾項基本偏好。沒有特別偏好也可以直接選擇「無特別偏好」。';

export const NO_PREFERENCE_LABEL = '無特別偏好';

export const FORMALITY_QUESTION: QuickPreferenceQuestion<QuickFormality> = {
  key: 'preferenceFormality',
  title: '你希望面試穿搭的正式程度？',
  options: [
    { value: 'formal', label: '偏正式' },
    { value: 'moderate', label: '適中' },
    { value: 'less_formal', label: '不要太正式' },
    { value: 'none', label: NO_PREFERENCE_LABEL },
  ],
};

export const IMPRESSION_QUESTION: QuickPreferenceQuestion<QuickImpression> = {
  key: 'preferenceImpression',
  title: '你希望呈現的感覺？',
  options: [
    { value: 'professional', label: '專業穩重' },
    { value: 'minimal', label: '簡約俐落' },
    { value: 'approachable', label: '親和自然' },
    { value: 'none', label: NO_PREFERENCE_LABEL },
  ],
};

export const COLOR_QUESTION: QuickPreferenceQuestion<QuickColor> = {
  key: 'preferenceColor',
  title: '你的色系偏好？',
  options: [
    { value: 'dark', label: '深色系' },
    { value: 'light', label: '淺色系' },
    { value: 'neutral', label: '中性色' },
    { value: 'no_clear', label: '無明顯偏向' },
    { value: 'none', label: NO_PREFERENCE_LABEL },
  ],
};

export const QUICK_PREFERENCE_QUESTIONS = [
  FORMALITY_QUESTION,
  IMPRESSION_QUESTION,
  COLOR_QUESTION,
] as const;

export interface QuickPreferences {
  preferenceFormality: QuickFormality | '';
  preferenceImpression: QuickImpression | '';
  preferenceColor: QuickColor | '';
}

export function isQuickPreferencesComplete(prefs: QuickPreferences): boolean {
  return Boolean(prefs.preferenceFormality && prefs.preferenceImpression && prefs.preferenceColor);
}

function labelOf<T extends string>(question: QuickPreferenceQuestion<T>, value: T | ''): string {
  if (!value) return '';
  return question.options.find((option) => option.value === value)?.label ?? '';
}

export function quickFormalityLabel(value: QuickFormality | ''): string {
  return labelOf(FORMALITY_QUESTION, value);
}

export function quickImpressionLabel(value: QuickImpression | ''): string {
  return labelOf(IMPRESSION_QUESTION, value);
}

export function quickColorLabel(value: QuickColor | ''): string {
  return labelOf(COLOR_QUESTION, value);
}

/** 「無特別偏好」「無明顯偏向」視為沒有提供實質偏好 */
export function isSubstantiveQuickValue(value: string): boolean {
  return value !== '' && value !== 'none' && value !== 'no_clear';
}
