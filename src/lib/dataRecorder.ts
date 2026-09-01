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

export interface InvalidInputRecord {
  step: string;
  message: string;
  timestamp: string;
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
  expectedOutfitBeforeAI: string;
  /** @deprecated 舊版欄位，normalize 時會對應至 expectedOutfitBeforeAI */
  favoriteOutfitBeforeAI?: string;
  /** @deprecated 舊版欄位 */
  expectedOutfit?: string;
  surpriseCandidateOutfits: string[];
  finalRecommendedOutfit: string;
  finalRecommendationText: string;
  expectationMismatch: number | null;
  answers: ParticipantAnswers;
  chatLog: ChatMessage[];
  invalidInputCount: number;
  invalidInputs: InvalidInputRecord[];
  correctedInputs: InvalidInputRecord[];
  questionnaireResponses: QuestionnaireResponses;
  questionnaireCompletedAt: string | null;
  completionCode: string | null;
  clickedSurveyButton: boolean;
  surveyClickedAt: string | null;
  surveyRedirectUrl: string | null;
  chatPageEnteredAt: string | null;
  chatPageExitedAt: string | null;
  chatDurationSec: number;
  metMinimumChatDuration: boolean;
  clickedViewRecommendation: boolean;
  viewRecommendationClickedAt: string | null;
  finalRecommendationVersion: string | null;
  viewedChatLog: boolean;
  viewedChatLogAt: string | null;
  viewedChatLogFrom: 'recommendation' | 'survey' | '';
  surveyPageEnteredAt: string | null;
  /** surprise 組：聊天前預先分派的穿搭（偏好過濾前） */
  surprisePreChatOutfit?: string;
  /** surprise 組：是否因聊天偏好而調整最終推薦 */
  chatPreferenceAdjusted?: boolean;
  /** surprise 組：選款方式 random / preference_scored */
  surpriseSelectionMode?: 'random' | 'preference_scored' | '';
  /** 聊天偏好摘要（記錄用） */
  chatPreferenceSummary?: string;
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

/**
 * 舊版相容：若未走伺服器流水號，仍盡量產出短碼（不保證全域唯一）。
 * 正式流程請用 fetchNextSerialCode() → 001、002、003…
 */
export function generateCompletionCode(participantId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < participantId.length; i += 1) {
    hash ^= participantId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const n = (Math.abs(hash) % 999) + 1;
  return String(n).padStart(3, '0');
}

const LOCAL_SERIAL_KEY = 'local_serial_counter';
const SESSION_SERIAL_KEY = 'participant_serial_code';

/** 向伺服器申請 001、002、003…；同一瀏覽器分頁只發一次 */
export async function fetchNextSerialCode(): Promise<string> {
  if (typeof window !== 'undefined') {
    const existing = sessionStorage.getItem(SESSION_SERIAL_KEY);
    if (existing && /^\d{1,4}$/.test(existing)) {
      return existing.padStart(3, '0');
    }
  }

  let code: string | null = null;

  try {
    const response = await fetch('/api/serial-code', { method: 'POST', cache: 'no-store' });
    if (response.ok) {
      const result = (await response.json()) as { code?: string };
      if (result.code && /^\d{1,4}$/.test(result.code)) {
        code = result.code.padStart(3, '0');
      }
    }
  } catch {
    // fall through to local
  }

  if (!code) {
    if (typeof window === 'undefined') {
      return '001';
    }
    const current = parseInt(localStorage.getItem(LOCAL_SERIAL_KEY) || '0', 10);
    const next = (Number.isFinite(current) ? current : 0) + 1;
    localStorage.setItem(LOCAL_SERIAL_KEY, String(next));
    code = String(next).padStart(3, '0');
  }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_SERIAL_KEY, code);
  }
  return code;
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
    expectedOutfitBeforeAI: '',
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
    invalidInputCount: 0,
    invalidInputs: [],
    correctedInputs: [],
    questionnaireResponses: {},
    questionnaireCompletedAt: null,
    completionCode: null,
    clickedSurveyButton: false,
    surveyClickedAt: null,
    surveyRedirectUrl: null,
    chatPageEnteredAt: null,
    chatPageExitedAt: null,
    chatDurationSec: 0,
    metMinimumChatDuration: false,
    clickedViewRecommendation: false,
    viewRecommendationClickedAt: null,
    finalRecommendationVersion: null,
    viewedChatLog: false,
    viewedChatLogAt: null,
    viewedChatLogFrom: '',
    surveyPageEnteredAt: null,
    sessionStartTime: new Date().toISOString(),
    sessionEndTime: null,
  };
}

export function normalizeParticipantData(raw: ParticipantData): ParticipantData {
  const expectedOutfitBeforeAI =
    raw.expectedOutfitBeforeAI || raw.favoriteOutfitBeforeAI || raw.expectedOutfit || '';
  const questionnaireResponses = {
    ...(raw.questionnaireResponses ?? {}),
  } as QuestionnaireResponses;

  return {
    ...raw,
    expectedOutfitBeforeAI,
    questionnaireResponses,
    questionnaireCompletedAt: raw.questionnaireCompletedAt ?? null,
    completionCode: raw.completionCode ?? null,
    acceptableOutfits: raw.acceptableOutfits ?? [],
    clickedSurveyButton: raw.clickedSurveyButton ?? false,
    surveyClickedAt: raw.surveyClickedAt ?? null,
    surveyRedirectUrl: raw.surveyRedirectUrl ?? null,
    chatPageEnteredAt: raw.chatPageEnteredAt ?? null,
    chatPageExitedAt: raw.chatPageExitedAt ?? null,
    chatDurationSec: raw.chatDurationSec ?? 0,
    metMinimumChatDuration: raw.metMinimumChatDuration ?? false,
    clickedViewRecommendation: raw.clickedViewRecommendation ?? false,
    viewRecommendationClickedAt: raw.viewRecommendationClickedAt ?? null,
    finalRecommendationVersion: raw.finalRecommendationVersion ?? null,
    viewedChatLog: raw.viewedChatLog ?? false,
    viewedChatLogAt: raw.viewedChatLogAt ?? null,
    viewedChatLogFrom: raw.viewedChatLogFrom ?? '',
    surveyPageEnteredAt: raw.surveyPageEnteredAt ?? null,
    surprisePreChatOutfit: raw.surprisePreChatOutfit ?? '',
    chatPreferenceAdjusted: raw.chatPreferenceAdjusted ?? false,
    surpriseSelectionMode: raw.surpriseSelectionMode ?? '',
    chatPreferenceSummary: raw.chatPreferenceSummary ?? '',
    sessionEndTime: raw.sessionEndTime ?? null,
    invalidInputCount: raw.invalidInputCount ?? 0,
    invalidInputs: raw.invalidInputs ?? [],
    correctedInputs: raw.correctedInputs ?? [],
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
  sessionStorage.removeItem(SESSION_SERIAL_KEY);
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

export function deleteFromLocalStorage(participantId: string): void {
  if (typeof window === 'undefined') return;

  const nextData = getFromLocalStorage().filter((item) => item.participantId !== participantId);
  if (nextData.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
}

export function downloadJSON(): void {
  void downloadAllParticipantsJSON();
}
