export interface ChatMessage {
  step: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
}

export interface ParticipantAnswers {
  stylePreferenceInput: string;
  bodyShapeInput: string;
  koreanStylePreferenceInput: string;
}

export interface ParticipantConditionInfo {
  explainability: 'high' | 'low';
  twoSidedMessage: 'high' | 'low';
  anthropomorphism: 'high' | 'low';
  proactivity: 'high' | 'low';
}

export interface ParticipantData {
  participantId: string;
  conditionId: number;
  conditionInfo: ParticipantConditionInfo;
  expectedOutfit: string;
  finalRecommendedOutfit: string;
  finalRecommendationText: string;
  expectationMismatch: number | null;
  answers: ParticipantAnswers;
  chatLog: ChatMessage[];
  styleSurpriseItems: number[];
  styleSurpriseScore: number;
  clickedSurveyButton: boolean;
  surveyClickedAt: string | null;
  sessionStartTime: string;
  sessionEndTime: string | null;
}

const STORAGE_KEY = 'participant_data';

export function generateParticipantId(): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `P-${timestamp}-${random}`;
}

export function initializeParticipantData(
  participantId: string,
  conditionId: number,
  conditionInfo: ParticipantConditionInfo,
): ParticipantData {
  return {
    participantId,
    conditionId,
    conditionInfo,
    expectedOutfit: '',
    finalRecommendedOutfit: '',
    finalRecommendationText: '',
    expectationMismatch: null,
    answers: {
      stylePreferenceInput: '',
      bodyShapeInput: '',
      koreanStylePreferenceInput: '',
    },
    chatLog: [],
    styleSurpriseItems: [],
    styleSurpriseScore: 0,
    clickedSurveyButton: false,
    surveyClickedAt: null,
    sessionStartTime: new Date().toISOString(),
    sessionEndTime: null,
  };
}

export function saveToLocalStorage(data: ParticipantData): void {
  if (typeof window === 'undefined') {
    return;
  }

  const existing = getFromLocalStorage();
  const index = existing.findIndex((item) => item.participantId === data.participantId);
  const nextData = index >= 0 ? [...existing] : [...existing, data];

  if (index >= 0) {
    nextData[index] = data;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
}

export function getFromLocalStorage(): ParticipantData[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function downloadJSON(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const data = getFromLocalStorage();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const link = document.createElement('a');

  link.href = url;
  link.download = `participant-data-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
