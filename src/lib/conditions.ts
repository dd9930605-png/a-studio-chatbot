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
  finalRecommendedOutfit: string;
  finalRecommendedOutfitEN: string;
  finalRecommendationImage: string;
  finalRecommendationText: string;
  manipulationNotes: string;
  surveyUrl: string;
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
  if (!surveyUrl) {
    return false;
  }

  try {
    const url = new URL(surveyUrl);
    return !['example.com', 'www.example.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function buildSurveyUrl(
  surveyUrl: string,
  params: { participantId: string; conditionId: number },
): string | null {
  if (!hasValidSurveyUrl(surveyUrl)) {
    return null;
  }

  const url = new URL(surveyUrl);
  url.searchParams.set('participantId', params.participantId);
  url.searchParams.set('conditionId', String(params.conditionId));
  return url.toString();
}
