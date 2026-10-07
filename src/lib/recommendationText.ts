import { Condition } from '@/lib/conditions';
import {
  ChatPreferences,
  formatPreferencesSummary,
  hasExplicitPreferences,
} from '@/lib/chatPreferences';
import { Outfit } from '@/lib/outfits';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';

/**
 * 結果頁資訊結構：僅由 Explainability × Two-sided 決定。
 * Proactivity / Anthropomorphism 不得改變區塊有無或資訊架構。
 */
export interface RecommendationSections {
  /** Low EX：短推薦說明；High EX：不使用（改用三區塊） */
  conclusion: string | null;
  userNeed: string | null;
  criterion: string | null;
  thereforeRecommend: string | null;
  benefit: string;
  limitation: string | null;
  showExplainability: boolean;
  showLimitation: boolean;
  showSuggestion: boolean;
  /** 相容舊欄位 */
  intro: string;
  styleSummary: string;
  reason: string | null;
  suggestion: string | null;
  isPersona: boolean;
  showReason: boolean;
  showBenefit: boolean;
  isUltraMinimal: boolean;
  isMinimal: boolean;
}

function lookLabelOf(outfit: Outfit): string {
  const n = getLookNumberFromOutfitId(outfit.outfitId);
  return n ? getLookLabel(n) : outfit.outfitId;
}

/** 所有組共用、無因果橋接的短結論 */
export function buildFixedConclusion(outfit: Outfit): string {
  return `${lookLabelOf(outfit)} 整體俐落、簡潔，適合作為正式面試穿搭。`;
}

/** 所有組共用的正面資訊（Two-sided High/Low 必須相同） */
export function buildFixedBenefit(outfit: Outfit): string {
  const text = (outfit.benefit || '').trim();
  if (text) {
    // 取第一句，避免長文
    const first = text.split(/(?<=[。！？])/)[0]?.trim();
    return first || text;
  }
  return '整體線條俐落，能呈現穩重、整潔的面試印象。';
}

/** Two-sided High：具體、次要、合理的 limitation */
export function buildFixedLimitation(outfit: Outfit): string {
  const text = (outfit.limitation || '').trim();
  if (text) {
    const first = text.split(/(?<=[。！？])/)[0]?.trim();
    return first || text;
  }
  return '部分版型輪廓較寬鬆，在非常保守的面試場合，正式感可能稍弱。';
}

function buildUserNeedSentence(preferences: ChatPreferences | undefined): string {
  if (!preferences || !hasExplicitPreferences(preferences)) {
    return '對話中尚未提出明確的穿搭偏好。';
  }

  const summary = formatPreferencesSummary(preferences);
  const conciseSummary = summary.split('；').slice(0, 2).join('；');
  return `你在對話中明確提到：${conciseSummary}。`;
}

function buildCriterionSentence(preferences: ChatPreferences | undefined): string {
  if (!preferences || !hasExplicitPreferences(preferences)) {
    return '在沒有明確偏好的情況下，判斷以面試合宜性、整潔感與適中正式度為主。';
  }
  if (preferences?.wantsFormal) {
    return '因此優先考慮穩重配色、俐落剪裁，以及適中而不過度休閒的正式程度。';
  }
  if (preferences.wantsLessFormal) {
    return '因此優先考慮整潔、俐落但不過度正式或拘謹的搭配。';
  }
  if (preferences.dislikedColors.length > 0 || preferences.strongDislikedColors.length > 0) {
    return '因此先避開你明確不喜歡的色系，再以面試所需的整潔感與正式度判斷。';
  }
  if (preferences.likedColors.length > 0) {
    return '因此優先考慮你偏好的色系，同時檢查版型是否符合面試情境。';
  }
  if (
    preferences.prefersJeans ||
    preferences.prefersDressPants ||
    preferences.prefersWidePants ||
    preferences.prefersPants ||
    preferences.prefersSkirt
  ) {
    return '因此優先考慮你明確提到的下裝方向，再檢查整體正式度與俐落感。';
  }
  return '因此依你明確提到的偏好，評估配色、版型與面試正式程度。';
}

function buildThereforeSentence(outfit: Outfit): string {
  return `${lookLabelOf(outfit)} 的配色與版型符合上述條件，因此推薦這套。`;
}

/**
 * @deprecated 結果頁精簡判定改看 EX×TS 模組；保留相容。
 */
export function isMinimalRecommendation(condition: Condition): boolean {
  return condition.explainability === 'low' && condition.twoSidedMessage === 'low';
}

export function isUltraMinimalRecommendation(condition: Condition): boolean {
  return isMinimalRecommendation(condition);
}

/**
 * 四種 EX × TS 結果頁結構：
 *
 *                TS Low                         TS High
 * EX Low         結論＋優點                     結論＋同一優點＋限制
 * EX High        需求→依據→推薦＋優點           需求→依據→推薦＋同一優點＋限制
 *
 * Proactivity 永不影響；Anthropomorphism 不改變資訊架構。
 */
export function buildRecommendationSections(
  condition: Condition,
  outfit: Outfit,
  preferences?: ChatPreferences,
): RecommendationSections {
  const showExplainability = condition.explainability === 'high';
  const showLimitation = condition.twoSidedMessage === 'high';
  const benefit = buildFixedBenefit(outfit);
  const limitation = showLimitation ? buildFixedLimitation(outfit) : null;
  const conclusion = showExplainability ? null : buildFixedConclusion(outfit);

  const userNeed = showExplainability ? buildUserNeedSentence(preferences) : null;
  const criterion = showExplainability ? buildCriterionSentence(preferences) : null;
  const thereforeRecommend = showExplainability ? buildThereforeSentence(outfit) : null;

  return {
    conclusion,
    userNeed,
    criterion,
    thereforeRecommend,
    benefit,
    limitation,
    showExplainability,
    showLimitation,
    showSuggestion: false,
    intro: conclusion || thereforeRecommend || buildFixedConclusion(outfit),
    styleSummary: '',
    reason: showExplainability
      ? [userNeed, criterion, thereforeRecommend].filter(Boolean).join(' ')
      : null,
    suggestion: null,
    isPersona: condition.anthropomorphism === 'high',
    showReason: showExplainability,
    showBenefit: true,
    isUltraMinimal: isUltraMinimalRecommendation(condition),
    isMinimal: isMinimalRecommendation(condition),
  };
}

export function sectionsToPlainText(sections: RecommendationSections): string {
  const parts: string[] = [];

  if (sections.conclusion) {
    parts.push(`推薦說明：${sections.conclusion}`);
  }
  if (sections.userNeed) {
    parts.push(`你的需求：${sections.userNeed}`);
  }
  if (sections.criterion) {
    parts.push(`AI 判斷依據：${sections.criterion}`);
  }
  if (sections.thereforeRecommend) {
    parts.push(`因此推薦：${sections.thereforeRecommend}`);
  }
  parts.push(`搭配優點：${sections.benefit}`);
  if (sections.limitation) {
    parts.push(`需要注意：${sections.limitation}`);
  }

  return parts.join('\n');
}

export function buildRecommendationText(
  condition: Condition,
  outfit: Outfit,
  preferences?: ChatPreferences,
): string {
  return sectionsToPlainText(buildRecommendationSections(condition, outfit, preferences));
}

export function countRecommendationBlocks(sections: RecommendationSections): number {
  let count = 0;
  if (sections.conclusion) count += 1;
  if (sections.showExplainability) count += 3;
  count += 1; // benefit
  if (sections.showLimitation && sections.limitation) count += 1;
  return count;
}

/** Condition isolation QA helper */
export function describeResultPageModules(condition: Condition): string[] {
  const modules = ['推薦結果', '搭配優點'];
  if (condition.explainability === 'high') {
    modules.splice(1, 0, '你的需求', 'AI 判斷依據', '因此推薦');
  } else {
    modules.splice(1, 0, '推薦說明');
  }
  if (condition.twoSidedMessage === 'high') {
    modules.push('需要注意');
  }
  return modules;
}
