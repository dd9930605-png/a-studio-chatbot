import { ChatPreferences, extractChatPreferences } from '@/lib/chatPreferences';
import { ChatMessage, ParticipantData } from '@/lib/dataRecorder';
import {
  QuickColor,
  QuickFormality,
  QuickImpression,
  isSubstantiveQuickValue,
  quickColorLabel,
  quickFormalityLabel,
  quickImpressionLabel,
} from '@/lib/quickPreferences';

export const NEED_MISSING = '尚未提供';

export type NeedSource = 'chat' | 'quick_preference' | 'none';

export interface NeedField {
  label: string;
  /** 顯示文字；未作答為「尚未提供」 */
  value: string;
  source: NeedSource;
  /** 有實質偏好（可進入 EX High）；「無特別偏好」不是實質偏好 */
  substantive: boolean;
}

export interface NeedSummary {
  formality: NeedField;
  impression: NeedField;
  color: NeedField;
  other: NeedField;
}

const WEAK_CLAUSE =
  /^(都可以|還行|應該可以吧|應該可以|隨便|隨便都可以|我穿都可以|不知道|沒差|無所謂|都行|還可以|算可以|好像還行|我都可以|嗯|哦|好|好啊|可以)$/;

const FORMALITY_PATTERNS: { value: QuickFormality; re: RegExp }[] = [
  {
    value: 'less_formal',
    re: /(?:不想要|不想|不要|不太)(?:太|那麼|過度)?(?:正式|專業|拘謹|嚴肅|死板)|偏休閒/,
  },
  { value: 'moderate', re: /正式程度適中|適中就好|適中即可|不要太正式也不要太休閒/ },
  { value: 'formal', re: /偏正式|比較正式|希望正式|想要正式|正式一點|要正式|正式感/ },
];

const IMPRESSION_PATTERNS: { value: QuickImpression; re: RegExp }[] = [
  { value: 'professional', re: /專業穩重|穩重|可靠/ },
  { value: 'minimal', re: /簡約俐落|簡約|俐落|乾淨俐落/ },
  { value: 'approachable', re: /親和自然|親和|親切|希望自然|偏自然|想要自然|自然一點/ },
];

const COLOR_PATTERNS: { value: QuickColor; re: RegExp }[] = [
  { value: 'dark', re: /深色系|深色|偏深|暗色/ },
  { value: 'light', re: /淺色系|淺色|偏淺|亮色/ },
  { value: 'neutral', re: /中性色|中性/ },
];

const LIKE_MARKER = /喜歡|偏好|想要|想穿|希望|偏向/;

function lastPattern<T extends string>(
  clause: string,
  patterns: { value: T; re: RegExp }[],
): T | null {
  let best: T | null = null;
  let index = -1;
  for (const pattern of patterns) {
    const match = pattern.re.exec(clause);
    if (match && match.index >= index) {
      index = match.index;
      best = pattern.value;
    }
  }
  return best;
}

function isDislikeClause(clause: string): boolean {
  return /不喜歡|討厭|不要|別推|不想/.test(clause);
}

export interface ChatNeedOverrides {
  formality: QuickFormality | null;
  impression: QuickImpression | null;
  color: QuickColor | null;
}

/**
 * 由早到晚掃描使用者原文。較新的明確陳述覆蓋較早的；
 * 弱表述（都可以、還行、不知道等）不覆蓋。
 */
export function extractExplicitChatNeeds(userMessages: string[]): ChatNeedOverrides {
  const result: ChatNeedOverrides = { formality: null, impression: null, color: null };

  for (const message of userMessages) {
    const clauses = message.split(/[，,。！？?!；;\n]|但是|不過|可是|而且/);
    for (const rawClause of clauses) {
      const clause = rawClause.trim();
      if (!clause || WEAK_CLAUSE.test(clause)) continue;

      const formality = lastPattern(clause, FORMALITY_PATTERNS);
      if (formality && !(formality === 'formal' && isDislikeClause(clause))) {
        result.formality = formality;
      }

      const impression = lastPattern(clause, IMPRESSION_PATTERNS);
      if (impression && !isDislikeClause(clause)) {
        result.impression = impression;
      }

      if (!isDislikeClause(clause)) {
        const color = lastPattern(clause, COLOR_PATTERNS);
        if (color) result.color = color;
        if (LIKE_MARKER.test(clause)) {
          if (/黑|深藍|深灰|咖啡|深棕|棕/.test(clause)) result.color = 'dark';
          else if (/米白|淺藍|白/.test(clause)) result.color = 'light';
          else if (/灰/.test(clause)) result.color = 'neutral';
        }
      }
    }
  }

  return result;
}

function fieldFromQuick<T extends string>(
  label: string,
  quickValue: T | '',
  quickLabel: string,
  chatValue: T | null,
  chatLabel: string,
): NeedField {
  if (chatValue) {
    return { label, value: chatLabel, source: 'chat', substantive: true };
  }
  if (!quickValue) {
    return { label, value: NEED_MISSING, source: 'none', substantive: false };
  }
  return {
    label,
    value: quickLabel,
    source: 'quick_preference',
    substantive: isSubstantiveQuickValue(quickValue),
  };
}

const COLOR_NAME: Record<string, string> = {
  white: '白色',
  black: '黑色',
  blue: '藍色',
  gray: '灰色',
  brown: '棕色',
  stripe: '條紋',
};

function joinNames(keys: string[]): string {
  return keys.map((key) => COLOR_NAME[key] ?? key).join('、');
}

/** 三個固定欄位以外、使用者明確提過的需求。不含 Look、不含推薦理由。 */
export function formatOtherNeeds(preferences: ChatPreferences): string {
  const parts: string[] = [];

  if (preferences.likedColors.length > 0) {
    parts.push(`提到喜歡${joinNames(preferences.likedColors)}`);
  }
  if (preferences.dislikedColors.length > 0) {
    parts.push(`提到不喜歡${joinNames(preferences.dislikedColors)}`);
  }
  if (preferences.preferredFitLevels.includes('structured')) parts.push('提到偏好較俐落的版型');
  if (preferences.preferredFitLevels.includes('relaxed')) parts.push('提到偏好寬鬆一點的版型');
  if (preferences.avoidedFitLevels.length > 0 || preferences.softAvoidFitLevels.length > 0) {
    parts.push('提到不想要太寬鬆');
  }
  if (preferences.prefersJeans) parts.push('提到牛仔褲');
  if (preferences.prefersDressPants) parts.push('提到西褲');
  if (preferences.prefersWidePants) parts.push('提到寬褲');
  if (preferences.prefersSkirt || preferences.dislikesPants) parts.push('提到裙裝');
  if (preferences.dislikesSkirt) parts.push('提到不要裙裝');
  if (preferences.dislikesJeans) parts.push('提到不要牛仔褲');
  if (preferences.dislikesDressPants) parts.push('提到不要西褲');
  if (preferences.dislikesWidePants) parts.push('提到不要寬褲');
  if (preferences.requestedUnavailableColors.length > 0) {
    parts.push(`提到${preferences.requestedUnavailableColors.join('、')}`);
  }
  if (preferences.requestedUnavailableBottoms.length > 0) {
    parts.push(`提到${preferences.requestedUnavailableBottoms.join('、')}`);
  }

  return parts.length > 0 ? parts.join('、') : NEED_MISSING;
}

export function buildNeedSummary(input: {
  preferenceFormality: QuickFormality | '';
  preferenceImpression: QuickImpression | '';
  preferenceColor: QuickColor | '';
  userMessages: string[];
  preferences?: ChatPreferences;
}): NeedSummary {
  const chat = extractExplicitChatNeeds(input.userMessages);
  const preferences = input.preferences ?? extractChatPreferences(input.userMessages);

  return {
    formality: fieldFromQuick(
      '正式程度',
      input.preferenceFormality,
      quickFormalityLabel(input.preferenceFormality),
      chat.formality,
      chat.formality ? quickFormalityLabel(chat.formality) : '',
    ),
    impression: fieldFromQuick(
      '希望呈現的感覺',
      input.preferenceImpression,
      quickImpressionLabel(input.preferenceImpression),
      chat.impression,
      chat.impression ? quickImpressionLabel(chat.impression) : '',
    ),
    color: fieldFromQuick(
      '色系偏好',
      input.preferenceColor,
      quickColorLabel(input.preferenceColor),
      chat.color,
      chat.color ? quickColorLabel(chat.color) : '',
    ),
    other: {
      label: '其他已提及需求',
      value: formatOtherNeeds(preferences),
      source: 'none',
      substantive: formatOtherNeeds(preferences) !== NEED_MISSING,
    },
  };
}

export function buildNeedSummaryFromParticipant(
  participant: Pick<
    ParticipantData,
    'preferenceFormality' | 'preferenceImpression' | 'preferenceColor' | 'chatLog'
  >,
): NeedSummary {
  const userMessages = participant.chatLog
    .filter((message: ChatMessage) => message.sender === 'user')
    .map((message) => message.message);
  return buildNeedSummary({
    preferenceFormality: participant.preferenceFormality,
    preferenceImpression: participant.preferenceImpression,
    preferenceColor: participant.preferenceColor,
    userMessages,
  });
}

export function formatNeedSummary(summary: NeedSummary): string {
  return [
    `${summary.formality.label}：${summary.formality.value}`,
    `${summary.impression.label}：${summary.impression.value}`,
    `${summary.color.label}：${summary.color.value}`,
    `${summary.other.label}：${summary.other.value}`,
  ].join('\n');
}

export const PRO_SUMMARY_CTA_LABEL = '查看目前需求整理';
export const PRO_SUMMARY_LOW_BUTTON = '請 AI 整理目前需求';

export function proSummaryCtaMessage(anthropomorphism: 'high' | 'low'): string {
  if (anthropomorphism === 'high') {
    return '對了～我們聊到這裡，我先幫你把目前提到的需求整理好了，你可以點開確認一下 😊';
  }
  return '目前對話資訊已完成整理，可開啟確認。';
}

export function proSummaryGateMessage(proactivity: 'high' | 'low'): string {
  if (proactivity === 'low') {
    return '請先使用『請 AI 整理目前需求』功能確認目前資訊。';
  }
  return '請先開啟對話中的『查看目前需求整理』確認目前資訊。';
}
