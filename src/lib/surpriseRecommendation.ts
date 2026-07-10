import { Condition } from '@/lib/conditions';
import {
  ChatPreferences,
  finalOutfitConflictsWithSoftPreferences,
  formatPreferencesSummary,
} from '@/lib/chatPreferences';
import { CATALOG_COLOR_SUMMARY } from '@/lib/catalogBoundaries';
import { getOutfit } from '@/lib/outfits';
import {
  buildRecommendationSections,
  buildRecommendationText,
  sectionsToPlainText,
} from '@/lib/recommendationText';

function buildUnavailableColorNote(preferences: ChatPreferences): string {
  if (preferences.requestedUnavailableColors.length === 0) return '';
  return `本網站目前沒有${preferences.requestedUnavailableColors.join('、')}的單品；以下推薦是依您提到的面試需求，從現有${CATALOG_COLOR_SUMMARY}等色系搭配中挑選的合理方案。`;
}

function buildSoftConflictNote(
  finalOutfitId: string,
  preferences: ChatPreferences,
): string {
  const { hasConflict, reasons } = finalOutfitConflictsWithSoftPreferences(
    finalOutfitId,
    preferences,
  );
  if (!hasConflict) return '';
  return `關於您的偏好（${reasons.join('；')}），以面試顧問的角度，我仍建議以下搭配，原因是它在正式度與整體印象上較符合面試情境，且仍在網站現有商品範圍內。`;
}

function buildBridgeIntro(
  condition: Condition,
  preferences: ChatPreferences,
  expectedOutfitId: string,
  finalOutfitId: string,
): string {
  const expected = getOutfit(expectedOutfitId);
  const isPersona = condition.anthropomorphism === 'high';
  const parts: string[] = [];

  const unavailableNote = buildUnavailableColorNote(preferences);
  if (unavailableNote) parts.push(unavailableNote);

  const softConflictNote = buildSoftConflictNote(finalOutfitId, preferences);
  if (softConflictNote) parts.push(softConflictNote);

  const preferenceSummary = formatPreferencesSummary(preferences);
  const preferenceClause =
    preferences.likedColors.length > 0 || preferences.matchedStyleKeywords.length > 0
      ? `您提到偏好${preferences.likedColors.length > 0 ? '特定色系' : ''}${preferences.matchedStyleKeywords.length > 0 ? '、' + preferences.matchedStyleKeywords.slice(0, 2).join('、') + '風格' : ''}，`
      : preferenceSummary !== '（尚未明確表達偏好）'
        ? `綜合您剛才提到的需求（${preferenceSummary}），`
        : '綜合您剛才在對話中分享的面試需求，';

  if (isPersona) {
    parts.push(
      `${preferenceClause}雖然您一開始可能想到「${expected?.outfitName ?? '另一套搭配'}」，但考量面試需要兼具專業與合宜的正式感，我會推薦下面這套。這不是為了和您唱反調，而是在現有商品與您的需求之間，我認為更適合面試情境的選擇。`,
    );
  } else {
    parts.push(
      `${preferenceClause}雖然系統推測您可能預期「${expected?.outfitName ?? '另一套搭配'}」，但依對話內容與面試情境判斷，以下推薦更能平衡正式度與穿著需求。`,
    );
  }

  return parts.join(' ');
}

function buildNoSurpriseBridge(
  condition: Condition,
  preferences: ChatPreferences,
  finalOutfitId: string,
): string {
  const parts: string[] = [];
  const unavailableNote = buildUnavailableColorNote(preferences);
  if (unavailableNote) parts.push(unavailableNote);

  const softConflictNote = buildSoftConflictNote(finalOutfitId, preferences);
  if (softConflictNote) parts.push(softConflictNote);

  if (parts.length === 0) return '';

  const isPersona = condition.anthropomorphism === 'high';
  if (isPersona) {
    parts.push('以下是我依面試情境與網站現有搭配，為您整理的推薦說明。');
  } else {
    parts.push('以下為依對話需求與庫存搭配整理的推薦說明。');
  }

  return parts.join(' ');
}

export function buildFinalRecommendationText(params: {
  condition: Condition;
  finalOutfitId: string;
  expectedOutfitBeforeAI: string;
  surpriseMode: 'surprise' | 'no_surprise';
  preferences: ChatPreferences;
}): string {
  const outfit = getOutfit(params.finalOutfitId);
  if (!outfit) return '';

  const baseText = buildRecommendationText(params.condition, outfit);
  const isMismatch = params.expectedOutfitBeforeAI !== params.finalOutfitId;

  if (params.surpriseMode === 'surprise' && isMismatch) {
    const bridge = buildBridgeIntro(
      params.condition,
      params.preferences,
      params.expectedOutfitBeforeAI,
      params.finalOutfitId,
    );
    return `${bridge}\n\n${baseText}`;
  }

  const noSurpriseBridge = buildNoSurpriseBridge(
    params.condition,
    params.preferences,
    params.finalOutfitId,
  );
  if (noSurpriseBridge) {
    return `${noSurpriseBridge}\n\n${baseText}`;
  }

  return baseText;
}

export function buildFinalRecommendationSections(params: {
  condition: Condition;
  finalOutfitId: string;
  expectedOutfitBeforeAI: string;
  surpriseMode: 'surprise' | 'no_surprise';
  preferences: ChatPreferences;
}) {
  const outfit = getOutfit(params.finalOutfitId);
  if (!outfit) return null;

  const sections = buildRecommendationSections(params.condition, outfit);
  const isMismatch = params.expectedOutfitBeforeAI !== params.finalOutfitId;

  let introPrefix = '';
  if (params.surpriseMode === 'surprise' && isMismatch) {
    introPrefix = buildBridgeIntro(
      params.condition,
      params.preferences,
      params.expectedOutfitBeforeAI,
      params.finalOutfitId,
    );
  } else {
    introPrefix = buildNoSurpriseBridge(params.condition, params.preferences, params.finalOutfitId);
  }

  if (introPrefix) {
    return {
      ...sections,
      intro: `${introPrefix} ${sections.intro}`,
    };
  }

  return sections;
}

export function buildFinalRecommendationPlainText(params: {
  condition: Condition;
  finalOutfitId: string;
  expectedOutfitBeforeAI: string;
  surpriseMode: 'surprise' | 'no_surprise';
  preferences: ChatPreferences;
}): string {
  const sections = buildFinalRecommendationSections(params);
  if (!sections) return '';
  return sectionsToPlainText(sections);
}
