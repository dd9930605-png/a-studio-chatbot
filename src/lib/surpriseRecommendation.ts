import { Condition } from '@/lib/conditions';
import { ChatPreferences, formatPreferencesSummary } from '@/lib/chatPreferences';
import { getOutfit } from '@/lib/outfits';
import {
  buildRecommendationSections,
  buildRecommendationText,
  sectionsToPlainText,
} from '@/lib/recommendationText';

function buildBridgeIntro(
  condition: Condition,
  preferences: ChatPreferences,
  expectedOutfitId: string,
): string {
  const expected = getOutfit(expectedOutfitId);
  const preferenceSummary = formatPreferencesSummary(preferences);
  const isPersona = condition.anthropomorphism === 'high';

  const preferenceClause =
    preferences.likedColors.length > 0 || preferences.matchedStyleKeywords.length > 0
      ? `您提到偏好${preferences.likedColors.length > 0 ? '較清爽的色系' : ''}${preferences.matchedStyleKeywords.length > 0 ? '、' + preferences.matchedStyleKeywords.slice(0, 2).join('、') + '風格' : ''}，`
      : preferenceSummary !== '（尚未明確表達偏好）'
        ? `綜合您剛才提到的需求（${preferenceSummary}），`
        : '綜合您剛才在對話中分享的面試需求，';

  if (isPersona) {
    return `${preferenceClause}雖然您一開始可能想到「${expected?.outfitName ?? '另一套搭配'}」，但考量面試需要兼具專業與合宜的正式感，我會推薦下面這套。它不是為了和您唱反調，而是在您提到的需求下，我認為同樣合理、且更適合面試情境的選擇。`;
  }

  return `${preferenceClause}雖然系統推測您可能預期「${expected?.outfitName ?? '另一套搭配'}」，但依對話內容判斷，以下推薦更能平衡面試正式度與您提到的穿著需求。`;
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
    );
    return `${bridge}\n\n${baseText}`;
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

  if (params.surpriseMode === 'surprise' && isMismatch) {
    const bridge = buildBridgeIntro(
      params.condition,
      params.preferences,
      params.expectedOutfitBeforeAI,
    );
    return {
      ...sections,
      intro: `${bridge} ${sections.intro}`,
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
