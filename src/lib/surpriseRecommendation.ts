import { Condition } from '@/lib/conditions';
import {
  ChatPreferences,
  buildAnthropomorphicPreferenceSummary,
  buildPreferenceMemoryLine,
  finalOutfitConflictsWithSoftPreferences,
  formatPreferencesSummary,
  PreferenceSummaryBlock,
} from '@/lib/chatPreferences';
import { CATALOG_BOTTOM_SUMMARY, CATALOG_COLOR_SUMMARY } from '@/lib/catalogBoundaries';
import { getOutfit } from '@/lib/outfits';
import {
  buildRecommendationSections,
  buildRecommendationText,
  sectionsToPlainText,
} from '@/lib/recommendationText';

function buildUnavailableCatalogNote(preferences: ChatPreferences): string {
  const bits: string[] = [];
  if (preferences.requestedUnavailableColors.length > 0) {
    bits.push(
      `沒有${preferences.requestedUnavailableColors.join('、')}的單品（現有色系以${CATALOG_COLOR_SUMMARY}為主）`,
    );
  }
  if (preferences.requestedUnavailableBottoms.length > 0) {
    bits.push(
      `沒有${preferences.requestedUnavailableBottoms.join('、')}（現有下裝以${CATALOG_BOTTOM_SUMMARY}為主）`,
    );
  }
  if (bits.length === 0) return '';
  return `本網站目前${bits.join('；')}。以下推薦是依您提到的面試需求，從現有商品中挑選的合理方案。`;
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

function buildNamedPreferenceClause(preferences: ChatPreferences): string {
  const memory = buildPreferenceMemoryLine(preferences);
  if (memory) return `${memory}`;

  const preferenceSummary = formatPreferencesSummary(preferences);
  if (preferenceSummary !== '（尚未明確表達偏好）') {
    return `綜合您剛才提到的需求（${preferenceSummary}），`;
  }
  return '綜合您剛才在對話中分享的面試需求，';
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

  const unavailableNote = buildUnavailableCatalogNote(preferences);
  if (unavailableNote) parts.push(unavailableNote);

  const softConflictNote = buildSoftConflictNote(finalOutfitId, preferences);
  if (softConflictNote) parts.push(softConflictNote);

  const preferenceClause = buildNamedPreferenceClause(preferences);

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
  const unavailableNote = buildUnavailableCatalogNote(preferences);
  if (unavailableNote) parts.push(unavailableNote);

  const softConflictNote = buildSoftConflictNote(finalOutfitId, preferences);
  if (softConflictNote) parts.push(softConflictNote);

  const memory = buildPreferenceMemoryLine(preferences, finalOutfitId);
  if (memory) parts.push(memory);

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

  if (params.surpriseMode === 'surprise') {
    const bridge = buildBridgeIntro(
      params.condition,
      params.preferences,
      params.expectedOutfitBeforeAI,
      params.finalOutfitId,
    );
    const body = buildRecommendationText(params.condition, outfit);
    return `${bridge}\n\n${body}`.trim();
  }

  const bridge = buildNoSurpriseBridge(
    params.condition,
    params.preferences,
    params.finalOutfitId,
  );
  const body = buildRecommendationText(params.condition, outfit);
  return bridge ? `${bridge}\n\n${body}`.trim() : body;
}

export function buildFinalRecommendationSections(params: {
  condition: Condition;
  finalOutfitId: string;
  expectedOutfitBeforeAI: string;
  surpriseMode: 'surprise' | 'no_surprise';
  preferences: ChatPreferences;
}) {
  const outfit = getOutfit(params.finalOutfitId);
  if (!outfit) {
    return null;
  }

  const sections = buildRecommendationSections(params.condition, outfit);
  let introPrefix = '';

  if (params.surpriseMode === 'surprise') {
    introPrefix = buildBridgeIntro(
      params.condition,
      params.preferences,
      params.expectedOutfitBeforeAI,
      params.finalOutfitId,
    );
  } else {
    introPrefix = buildNoSurpriseBridge(params.condition, params.preferences, params.finalOutfitId);
  }

  return { sections, introPrefix, outfit };
}

export function buildFinalRecommendationPlainText(params: {
  condition: Condition;
  finalOutfitId: string;
  expectedOutfitBeforeAI: string;
  surpriseMode: 'surprise' | 'no_surprise';
  preferences: ChatPreferences;
}): string {
  const built = buildFinalRecommendationSections(params);
  if (!built) return '';
  const body = sectionsToPlainText(built.sections);
  return built.introPrefix ? `${built.introPrefix}\n\n${body}`.trim() : body;
}

/** 結果頁偏好摘要：依擬人化操弄切換語氣，資訊內容一致 */
export function buildResultPreferenceIntro(
  preferences: ChatPreferences,
  _finalOutfitId: string,
  _surpriseMode: 'surprise' | 'no_surprise',
  anthropomorphism: 'high' | 'low' = 'low',
): PreferenceSummaryBlock | null {
  return buildAnthropomorphicPreferenceSummary(preferences, anthropomorphism);
}
