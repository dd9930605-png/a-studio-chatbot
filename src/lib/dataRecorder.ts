import { OutfitCategory, SurpriseMode } from '@/lib/outfits';

export interface ChatMessage {
  step: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
}

export interface ParticipantAnswers {
  stylePreferenceInput: string;
  bodyShapeInput: string;
  websitePreferenceInput: string;
  koreanClothingExperienceInput: string;
  usualStyleInput: string;
}

export interface ParticipantConditionInfo {
  explainability: 'high' | 'low';
  twoSidedMessage: 'high' | 'low';
  anthropomorphism: 'high' | 'low';
  proactivity: 'high' | 'low';
}

export type QuestionnaireResponses = Record<string, number>;

export interface ParticipantData {
  participantId: string;
  selectedOutfitCategory: OutfitCategory | '';
  allowedOutfits: string[];
  blockedOutfits: string[];
  conditionId: number;
  conditionInfo: ParticipantConditionInfo;
  surpriseMode: SurpriseMode | '';
  acceptableOutfits: string[];
  favoriteOutfitBeforeAI: string;
  /** @deprecated 舊版欄位，讀取時會對應至 favoriteOutfitBeforeAI */
  expectedOutfit?: string;
  surpriseCandidateOutfits: string[];
  finalRecommendedOutfit: string;
  finalRecommendationText: string;
  expectationMismatch: number | null;
  answers: ParticipantAnswers;
  chatLog: ChatMessage[];
  questionnaireResponses: QuestionnaireResponses;
  questionnaireCompletedAt: string | null;
  completionCode: string | null;
  clickedSurveyButton: boolean;
  surveyClickedAt: string | null;
  surveyRedirectUrl: string | null;
  sessionStartTime: string;
  sessionEndTime: string | null;
}

const STORAGE_KEY = 'participant_data';
const SESSION_KEY = 'experiment_session';
const PARTICIPANT_DRAFT_KEY = 'participant_draft';

export interface ExperimentSession {
  conditionId: number;
  surpriseMode: SurpriseMode;
}

export function generateParticipantId(): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `P-${timestamp}-${random}`;
}

export function generateCompletionCode(participantId: string): string {
  const suffix = participantId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();
  return `THX-${suffix}`;
}

export function saveExperimentSession(session: ExperimentSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getExperimentSession(): ExperimentSession | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ExperimentSession;
  } catch {
    return null;
  }
}

export function initializeParticipantData(
  participantId: string,
  conditionId: number,
  surpriseMode: SurpriseMode,
  conditionInfo: ParticipantConditionInfo,
): ParticipantData {
  return {
    participantId,
    selectedOutfitCategory: '',
    allowedOutfits: [],
    blockedOutfits: [],
    conditionId,
    conditionInfo,
    surpriseMode,
    acceptableOutfits: [],
    favoriteOutfitBeforeAI: '',
    surpriseCandidateOutfits: [],
    finalRecommendedOutfit: '',
    finalRecommendationText: '',
    expectationMismatch: null,
    answers: {
      stylePreferenceInput: '',
      bodyShapeInput: '',
      websitePreferenceInput: '',
      koreanClothingExperienceInput: '',
      usualStyleInput: '',
    },
    chatLog: [],
    questionnaireResponses: {},
    questionnaireCompletedAt: null,
    completionCode: null,
    clickedSurveyButton: false,
    surveyClickedAt: null,
    surveyRedirectUrl: null,
    sessionStartTime: new Date().toISOString(),
    sessionEndTime: null,
  };
}

export function normalizeParticipantData(raw: ParticipantData): ParticipantData {
  const favoriteOutfitBeforeAI = raw.favoriteOutfitBeforeAI || raw.expectedOutfit || '';
  const questionnaireResponses = {
    ...(raw.questionnaireResponses ?? {}),
  } as QuestionnaireResponses;

  return {
    ...raw,
    favoriteOutfitBeforeAI,
    questionnaireResponses,
    questionnaireCompletedAt: raw.questionnaireCompletedAt ?? null,
    completionCode: raw.completionCode ?? null,
    acceptableOutfits: raw.acceptableOutfits ?? [],
    clickedSurveyButton: raw.clickedSurveyButton ?? false,
    surveyClickedAt: raw.surveyClickedAt ?? null,
    surveyRedirectUrl: raw.surveyRedirectUrl ?? null,
    sessionEndTime: raw.sessionEndTime ?? null,
  };
}

export function saveParticipantDraft(data: ParticipantData): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PARTICIPANT_DRAFT_KEY, JSON.stringify(normalizeParticipantData(data)));
}

export function getParticipantDraft(): ParticipantData | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PARTICIPANT_DRAFT_KEY);
  if (!raw) return null;
  try {
    return normalizeParticipantData(JSON.parse(raw) as ParticipantData);
  } catch {
    return null;
  }
}

export function clearParticipantDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PARTICIPANT_DRAFT_KEY);
}

export function extractUserMessages(data: ParticipantData): string[] {
  return data.chatLog.filter((m) => m.sender === 'user').map((m) => m.message);
}

export function extractBotMessages(data: ParticipantData): string[] {
  return data.chatLog.filter((m) => m.sender === 'bot').map((m) => m.message);
}

export function saveToLocalStorage(data: ParticipantData): void {
  if (typeof window === 'undefined') return;

  const normalized = normalizeParticipantData(data);
  const existing = getFromLocalStorage();
  const index = existing.findIndex((item) => item.participantId === normalized.participantId);
  const nextData = index >= 0 ? [...existing] : [...existing, normalized];

  if (index >= 0) {
    nextData[index] = normalized;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
}

export async function saveParticipantData(data: ParticipantData): Promise<boolean> {
  const normalized = normalizeParticipantData(data);
  saveToLocalStorage(normalized);

  try {
    const response = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchAllParticipants(): Promise<{
  configured: boolean;
  participants: ParticipantData[];
}> {
  try {
    const response = await fetch('/api/participants', { cache: 'no-store' });
    if (!response.ok) {
      return { configured: false, participants: [] };
    }
    const result = (await response.json()) as {
      configured: boolean;
      participants: ParticipantData[];
    };
    if (result.configured) {
      return {
        configured: true,
        participants: (result.participants ?? []).map((participant) =>
          normalizeParticipantData(participant),
        ),
      };
    }
    return { configured: false, participants: getFromLocalStorage() };
  } catch {
    return { configured: false, participants: getFromLocalStorage() };
  }
}

export async function downloadAllParticipantsJSON(): Promise<void> {
  if (typeof window === 'undefined') return;

  const { participants } = await fetchAllParticipants();
  const blob = new Blob([JSON.stringify(participants, null, 2)], {
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

export function getFromLocalStorage(): ParticipantData[] {
  if (typeof window === 'undefined') return [];

  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) return [];

  try {
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeParticipantData(item as ParticipantData));
  } catch {
    return [];
  }
}

export function downloadJSON(): void {
  void downloadAllParticipantsJSON();
}
