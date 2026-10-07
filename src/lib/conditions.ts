import conditionsData from '../../public/conditions.json';

export type ConditionLevel = 'high' | 'low';

export interface Condition {
  conditionId: number;
  explainability: ConditionLevel;
  twoSidedMessage: ConditionLevel;
  anthropomorphism: ConditionLevel;
  proactivity: ConditionLevel;
  botName: string;
  botNameEN: string;
  avatarType: 'persona' | 'robot';
  avatarUrl: string;
  tone: 'friendly' | 'professional';
  greetingText: string;
  manipulationNotes: string;
  surveyUrl: string;
  /** 可選：AI 結束後要接續的問卷網址（建議設為問卷後半段專用連結） */
  surveyContinueUrl?: string;
}

export const conditions = conditionsData as Condition[];

export function getCondition(conditionId: number): Condition | undefined {
  return conditions.find((condition) => condition.conditionId === conditionId);
}

export function getRandomConditionId(): number {
  const index = Math.floor(Math.random() * conditions.length);
  return conditions[index]?.conditionId ?? 1;
}

export function hasValidSurveyUrl(surveyUrl?: string): boolean {
  if (!surveyUrl) return false;

  try {
    const url = new URL(surveyUrl);
    return !['example.com', 'www.example.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

export interface SurveyParams {
  participantId: string;
  conditionId: number;
  surpriseMode: string;
  favoriteOutfitId?: string;
  expectedOutfitBeforeAI: string;
  /** @deprecated 舊版參數，會對應至 expectedOutfitBeforeAI */
  favoriteOutfitBeforeAI?: string;
  /** @deprecated */
  expectedOutfit?: string;
  finalRecommendedOutfit: string;
  expectationMismatch: number | null;
  selectedOutfitCategory: string;
  /** 完成碼，方便與 SurveyCake 後測對帳 */
  completionCode?: string | null;
}

export function buildSurveyUrl(surveyUrl: string, params: SurveyParams): string | null {
  if (!hasValidSurveyUrl(surveyUrl)) return null;

  const expectedOutfitBeforeAI =
    params.expectedOutfitBeforeAI ||
    params.favoriteOutfitBeforeAI ||
    params.expectedOutfit ||
    '';
  const url = new URL(surveyUrl);
  url.searchParams.set('pid', params.participantId);
  url.searchParams.set('condition', String(params.conditionId));
  url.searchParams.set('surprise', params.surpriseMode);
  // 保留既有 favorite query key，但內容改為真正的 Favorite；
  // 舊呼叫未提供時才退回歷史 Prediction alias。
  url.searchParams.set('favorite', params.favoriteOutfitId || expectedOutfitBeforeAI);
  url.searchParams.set('expected', expectedOutfitBeforeAI);
  url.searchParams.set('final', params.finalRecommendedOutfit);
  url.searchParams.set('mismatch', String(params.expectationMismatch ?? ''));
  url.searchParams.set('category', params.selectedOutfitCategory);
  if (params.completionCode) {
    url.searchParams.set('code', params.completionCode);
  }
  return url.toString();
}
