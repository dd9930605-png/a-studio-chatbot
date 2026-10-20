import { ChatPreferences, extractChatPreferences } from '@/lib/chatPreferences';
import { ChatMessage, ParticipantData } from '@/lib/dataRecorder';
import {
  clauseColorFamily,
  clauseColorTokens,
  includesUnnegated,
  isAcceptanceNotRequest,
  isOffTopicForPreferences,
  isSoftNegative,
  isStrongLike,
  isStrongNegative,
  isWeakPreference,
  isWeakStandalone,
  splitPreferenceClauses,
} from '@/lib/preferenceLanguage';
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
  value: string;
  source: NeedSource;
  substantive: boolean;
}

export interface NeedSummary {
  formality: NeedField;
  impression: NeedField;
  color: NeedField;
  other: NeedField;
}

type Strength = 'strong' | 'weak';

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

function applyTracked<T>(
  current: { value: T; strength: Strength } | null,
  next: T | null,
  strength: Strength,
): { value: T; strength: Strength } | null {
  if (!next) return current;
  if (!current) return { value: next, strength };
  if (strength === 'weak' && current.strength === 'strong') return current;
  return { value: next, strength };
}

export interface ChatNeedOverrides {
  formality: QuickFormality | null;
  impression: QuickImpression | null;
  color: QuickColor | null;
}

export function extractExplicitChatNeeds(userMessages: string[]): ChatNeedOverrides {
  let formality: { value: QuickFormality; strength: Strength } | null = null;
  let impression: { value: QuickImpression; strength: Strength } | null = null;
  let color: { value: QuickColor; strength: Strength } | null = null;

  for (const message of userMessages) {
    if (isOffTopicForPreferences(message)) continue;
    for (const clause of splitPreferenceClauses(message)) {
      if (!clause || isWeakStandalone(clause)) continue;
      const weak = isWeakPreference(clause);
      const accept = isAcceptanceNotRequest(clause);
      const softNeg = isSoftNegative(clause);
      const strongNeg = isStrongNegative(clause);
      const strength: Strength = weak || accept ? 'weak' : 'strong';

      const formalityHit = lastPattern(clause, FORMALITY_PATTERNS);
      if (formalityHit === 'less_formal') {
        formality = applyTracked(formality, 'less_formal', 'strong');
      } else if (formalityHit === 'moderate') {
        formality = applyTracked(formality, 'moderate', strength);
      } else if (formalityHit === 'formal' && !accept && !softNeg && !strongNeg && !weak) {
        formality = applyTracked(formality, 'formal', 'strong');
      }

      const impressionHit = lastPattern(clause, IMPRESSION_PATTERNS);
      if (impressionHit && !accept && !softNeg) {
        const impressionWord =
          impressionHit === 'minimal' ? '簡約' : impressionHit === 'professional' ? '穩重' : '親和';
        if (!strongNeg || includesUnnegated(clause, impressionWord) || includesUnnegated(clause, '俐落')) {
          impression = applyTracked(impression, impressionHit, strength);
        }
      }

      const family = clauseColorFamily(clause);
      const tokens = clauseColorTokens(clause);
      if (softNeg && family) {
        continue;
      }
      if (strongNeg && (family || tokens.length > 0)) {
        continue;
      }
      if (family) {
        const mapped: QuickColor = family === 'dark' ? 'dark' : 'light';
        color = applyTracked(color, mapped, strength);
      } else if (tokens.length > 0 && isStrongLike(clause) && !weak) {
        if (tokens.some((token) => token === 'black' || token === 'darkBlue' || token === 'darkGray' || token === 'brown')) {
          color = applyTracked(color, 'dark', 'strong');
        } else if (tokens.some((token) => token === 'white' || token === 'beige' || token === 'lightBlue')) {
          color = applyTracked(color, 'light', 'strong');
        } else if (tokens.some((token) => token === 'gray')) {
          color = applyTracked(color, 'no_clear', 'strong');
        }
      }
    }
  }

  return {
    formality: formality?.value ?? null,
    impression: impression?.value ?? null,
    color: color?.value && color.value !== 'no_clear' ? color.value : color?.value === 'no_clear' ? 'no_clear' : null,
  };
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
  beige: '米白',
  black: '黑色',
  lightBlue: '淺藍',
  darkBlue: '深藍',
  gray: '灰色',
  darkGray: '深灰',
  brown: '棕色',
};

function joinNames(keys: string[]): string {
  return keys.map((key) => COLOR_NAME[key] ?? key).join('、');
}

export function formatOtherNeeds(preferences: ChatPreferences): string {
  const parts: string[] = [];

  if (preferences.likedColorFamily) {
    parts.push(`提到喜歡${preferences.likedColorFamily === 'dark' ? '深色系' : '淺色系'}`);
  }
  if (preferences.likedColors.length > 0) {
    parts.push(`提到喜歡${joinNames(preferences.likedColors)}`);
  }
  if (preferences.dislikedColors.length > 0) {
    parts.push(`提到不喜歡${joinNames(preferences.dislikedColors)}`);
  }
  if (preferences.avoidsTie) parts.push('提到不要領帶');
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
export const PRO_SUMMARY_USER_ACTION = '你點選了『請 AI 整理目前需求』';

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
