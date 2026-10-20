import { OutfitCategory, SurpriseMode } from '@/lib/outfits';
import type { PkRoundRecord } from '@/lib/outfitPk';
import type { QuickColor, QuickFormality, QuickImpression } from '@/lib/quickPreferences';

/** EX High「你的需求」證據來源 */
export type ExEvidenceSource = 'chat' | 'quick_preference' | 'scenario';

export interface ExEvidenceItem {
  value: string;
  source: ExEvidenceSource;
}

/** 結果頁版面（僅測試切換用，不是實驗因子） */
export type ResultLayoutVersion = 'card' | 'paragraph';

export type DirectCheckLevel = 'high' | 'low';

export interface ChatMessage {
  step: string;
  sender: 'user' | 'bot' | 'system';
  message: string;
  timestamp: string;
  /** proSummaryCta：High 由 AI 主動附上；proSummaryUserAction：Low 使用者點選紀錄 */
  kind?: 'text' | 'proSummaryCta' | 'proSummaryUserAction';
}

export type { PkRoundRecord };

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
  /**
   * 個人最喜歡的穿搭（Favorite）。不得進入 surprise 推薦判斷。
   * 與 expectedOutfitBeforeAI（預測 AI 會推薦哪套）絕對分開。
   */
  favoriteOutfitId: string;
  /** AI 最可能推薦哪一套（Prediction）；surprise 邏輯唯一基準 */
  expectedOutfitBeforeAI: string;
  /**
   * @deprecated 舊版「預測」欄位別名，normalize 時僅在沒有 expectedOutfitBeforeAI 時回填。
   * 絕不可與 favoriteOutfitId 混淆。
   */
  favoriteOutfitBeforeAI?: string;
  /** @deprecated 舊版欄位 */
  expectedOutfit?: string;
  /** Photo PK 五輪紀錄 */
  pkRounds: PkRoundRecord[];
  favoritePkWins: number | null;
  favoritePkAppearances: number | null;
  /** favorite 出現輪次中選中 favorite 的比例；無可計算時為 null */
  pkConsistencyWithFavorite: number | null;
  /** 晉級制最終挑戰者（Round 4 winner） */
  pkFinalChallengerId: string;
  /** 晉級制最終勝者（Round 5 winner） */
  pkFinalWinnerId: string;
  /** Favorite 是否在最終輪勝出 */
  favoriteRetainedInFinalPK: boolean | null;
  surpriseCandidateOutfits: string[];
  finalRecommendedOutfit: string;
  finalRecommendationText: string;
  expectationMismatch: number | null;
  answers: ParticipantAnswers;
  chatLog: ChatMessage[];
  /** 使用者送出的訊息則數（正式紀錄） */
  userMessageCount: number;
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
  /** 是否同時達標：≥3 分鐘且 ≥3 則使用者訊息 */
  metMinimumChatRequirements: boolean;
  clickedViewRecommendation: boolean;
  viewRecommendationClickedAt: string | null;
  finalRecommendationVersion: string | null;
  viewedChatLog: boolean;
  viewedChatLogAt: string | null;
  viewedChatLogFrom: 'recommendation' | 'survey' | 'direct_check' | '';
  surveyPageEnteredAt: string | null;
  /** surprise 組：聊天前預先分派的穿搭（偏好過濾前） */
  surprisePreChatOutfit?: string;
  /** surprise 組：是否因聊天偏好而調整最終推薦 */
  chatPreferenceAdjusted?: boolean;
  /** surprise 組：選款方式 random / preference_scored */
  surpriseSelectionMode?: 'random' | 'preference_scored' | '';
  /** 聊天偏好摘要（記錄用） */
  chatPreferenceSummary?: string;

  /* ---------- 快速基本需求（所有組相同；不影響 surpriseMode） ---------- */
  preferenceFormality: QuickFormality | '';
  preferenceImpression: QuickImpression | '';
  preferenceColor: QuickColor | '';
  quickPreferencesCompletedAt: string | null;

  /* ---------- Proactivity：AI 需求整理事件 ---------- */
  /** 第 2 則使用者訊息送出、整理功能可用的時間 */
  proSummaryEligibleAt: string | null;
  /** High：'ai'（AI 主動送出）；Low：'user'（使用者按鈕觸發） */
  proSummaryInitiator: 'ai' | 'user' | '';
  proSummaryOpenedAt: string | null;
  proSummaryOpened: boolean;
  proSummaryOpenCount: number;
  /** 整理面板實際顯示的文字（固定四欄，兩組格式相同） */
  proSummaryContent: string;
  /** 事件是否已觸發過（一次 session 只觸發一次；reload 不重複） */
  proSummaryTriggeredOnce: boolean;

  /* ---------- 結果頁內容紀錄（EX／TS） ---------- */
  exEvidenceItems: ExEvidenceItem[];
  exJudgmentPoints: string[];
  positiveAId: string;
  positiveBId: string;
  cautionId: string;
  /** 正式固定 card；舊資料可能仍為 paragraph */
  resultLayoutVersion: ResultLayoutVersion | '';

  /* ---------- 直接操弄辨識題（不取代 Questionnaire B） ---------- */
  directCheckExplainability: DirectCheckLevel | '';
  directCheckTwoSided: DirectCheckLevel | '';
  directCheckAnthropomorphism: DirectCheckLevel | '';
  directCheckProactivity: DirectCheckLevel | '';
  /** 僅供研究分析，不得顯示給受試者 */
  directCheckEXCorrect: boolean | null;
  directCheckTSCorrect: boolean | null;
  directCheckANCorrect: boolean | null;
  directCheckPROCorrect: boolean | null;
  directCheckCompletedAt: string | null;

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
    favoriteOutfitId: '',
    expectedOutfitBeforeAI: '',
    pkRounds: [],
    favoritePkWins: null,
    favoritePkAppearances: null,
    pkConsistencyWithFavorite: null,
    pkFinalChallengerId: '',
    pkFinalWinnerId: '',
    favoriteRetainedInFinalPK: null,
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
    userMessageCount: 0,
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
    metMinimumChatRequirements: false,
    clickedViewRecommendation: false,
    viewRecommendationClickedAt: null,
    finalRecommendationVersion: null,
    viewedChatLog: false,
    viewedChatLogAt: null,
    viewedChatLogFrom: '',
    surveyPageEnteredAt: null,
    preferenceFormality: '',
    preferenceImpression: '',
    preferenceColor: '',
    quickPreferencesCompletedAt: null,
    proSummaryEligibleAt: null,
    proSummaryInitiator: '',
    proSummaryOpenedAt: null,
    proSummaryOpened: false,
    proSummaryOpenCount: 0,
    proSummaryContent: '',
    proSummaryTriggeredOnce: false,
    exEvidenceItems: [],
    exJudgmentPoints: [],
    positiveAId: '',
    positiveBId: '',
    cautionId: '',
    resultLayoutVersion: '',
    directCheckExplainability: '',
    directCheckTwoSided: '',
    directCheckAnthropomorphism: '',
    directCheckProactivity: '',
    directCheckEXCorrect: null,
    directCheckTSCorrect: null,
    directCheckANCorrect: null,
    directCheckPROCorrect: null,
    directCheckCompletedAt: null,
    sessionStartTime: new Date().toISOString(),
    sessionEndTime: null,
  };
}

export function normalizeParticipantData(raw: ParticipantData): ParticipantData {
  // favoriteOutfitId 是個人偏好；絕不可回填或覆蓋 expectedOutfitBeforeAI。
  // favoriteOutfitBeforeAI 僅為舊版「預測」別名（pre-favorite 拆分前）。
  const expectedOutfitBeforeAI =
    raw.expectedOutfitBeforeAI || raw.favoriteOutfitBeforeAI || raw.expectedOutfit || '';
  const favoriteOutfitId = raw.favoriteOutfitId || '';
  const chatLog = raw.chatLog ?? [];
  const userMessageCount =
    typeof raw.userMessageCount === 'number'
      ? raw.userMessageCount
      : chatLog.filter((message) => message.sender === 'user').length;
  const questionnaireResponses = {
    ...(raw.questionnaireResponses ?? {}),
  } as QuestionnaireResponses;

  return {
    ...raw,
    favoriteOutfitId,
    expectedOutfitBeforeAI,
    pkRounds: raw.pkRounds ?? [],
    favoritePkWins: raw.favoritePkWins ?? null,
    favoritePkAppearances: raw.favoritePkAppearances ?? null,
    pkConsistencyWithFavorite: raw.pkConsistencyWithFavorite ?? null,
    pkFinalChallengerId: raw.pkFinalChallengerId ?? '',
    pkFinalWinnerId: raw.pkFinalWinnerId ?? '',
    favoriteRetainedInFinalPK: raw.favoriteRetainedInFinalPK ?? null,
    chatLog,
    userMessageCount,
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
    metMinimumChatRequirements:
      raw.metMinimumChatRequirements ??
      ((raw.metMinimumChatDuration ?? false) && userMessageCount >= 3),
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
    preferenceFormality: raw.preferenceFormality ?? '',
    preferenceImpression: raw.preferenceImpression ?? '',
    preferenceColor: raw.preferenceColor ?? '',
    quickPreferencesCompletedAt: raw.quickPreferencesCompletedAt ?? null,
    proSummaryEligibleAt: raw.proSummaryEligibleAt ?? null,
    proSummaryInitiator: raw.proSummaryInitiator ?? '',
    proSummaryOpenedAt: raw.proSummaryOpenedAt ?? null,
    proSummaryOpened: raw.proSummaryOpened ?? false,
    proSummaryOpenCount: raw.proSummaryOpenCount ?? 0,
    proSummaryContent: raw.proSummaryContent ?? '',
    proSummaryTriggeredOnce: raw.proSummaryTriggeredOnce ?? false,
    exEvidenceItems: raw.exEvidenceItems ?? [],
    exJudgmentPoints: raw.exJudgmentPoints ?? [],
    positiveAId: raw.positiveAId ?? '',
    positiveBId: raw.positiveBId ?? '',
    cautionId: raw.cautionId ?? '',
    resultLayoutVersion: raw.resultLayoutVersion ?? '',
    directCheckExplainability: raw.directCheckExplainability ?? '',
    directCheckTwoSided: raw.directCheckTwoSided ?? '',
    directCheckAnthropomorphism: raw.directCheckAnthropomorphism ?? '',
    directCheckProactivity: raw.directCheckProactivity ?? '',
    directCheckEXCorrect: raw.directCheckEXCorrect ?? null,
    directCheckTSCorrect: raw.directCheckTSCorrect ?? null,
    directCheckANCorrect: raw.directCheckANCorrect ?? null,
    directCheckPROCorrect: raw.directCheckPROCorrect ?? null,
    directCheckCompletedAt: raw.directCheckCompletedAt ?? null,
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
  // 一位受試者完成後清除分派；同一分頁開始下一位時必須重新獨立隨機。
  // 實驗進行中的 refresh 不會呼叫此函式，仍會保留原 condition。
  sessionStorage.removeItem(SESSION_KEY);
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
