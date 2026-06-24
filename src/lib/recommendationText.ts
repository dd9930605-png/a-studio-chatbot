import { Condition } from '@/lib/conditions';
import { Outfit } from '@/lib/outfits';

export interface RecommendationSections {
  intro: string;
  styleSummary: string;
  reason: string | null;
  benefit: string | null;
  limitation: string | null;
  suggestion: string | null;
  isPersona: boolean;
  showReason: boolean;
  showBenefit: boolean;
  showLimitation: boolean;
  showSuggestion: boolean;
  isUltraMinimal: boolean;
  isMinimal: boolean;
}

export function isMinimalRecommendation(condition: Condition): boolean {
  return (
    condition.explainability === 'low' &&
    condition.twoSidedMessage === 'low' &&
    condition.proactivity === 'low'
  );
}

export function isUltraMinimalRecommendation(condition: Condition): boolean {
  return isMinimalRecommendation(condition) && condition.anthropomorphism === 'low';
}

export function buildRecommendationSections(
  condition: Condition,
  outfit: Outfit,
): RecommendationSections {
  const { outfitName, styleTags, reason, benefit, limitation, suggestion } = outfit;
  const tags = styleTags.filter((tag) => !['男裝', '女裝', '待補'].includes(tag)).join('、');
  const isPersona = condition.anthropomorphism === 'high';
  const showReason = condition.explainability === 'high';
  const showBenefit = condition.twoSidedMessage === 'high';
  const showLimitation = condition.twoSidedMessage === 'high';
  const showSuggestion = condition.proactivity === 'high';
  const isMinimal = isMinimalRecommendation(condition);
  const isUltraMinimal = isUltraMinimalRecommendation(condition);

  let intro: string;
  if (isUltraMinimal) {
    intro = `系統推薦：${outfitName}`;
  } else if (isMinimal && isPersona) {
    intro = `我推薦「${outfitName}」。`;
  } else if (isPersona) {
    intro = `我會推薦你選擇「${outfitName}」。這套搭配適合面試穿搭。`;
  } else {
    intro = `系統推薦「${outfitName}」。此搭配符合面試穿搭需求。`;
  }

  return {
    intro,
    styleSummary: isUltraMinimal ? '' : tags ? `整體風格：${tags}` : '',
    reason: showReason ? reason : null,
    benefit: showBenefit ? benefit : null,
    limitation: showLimitation ? limitation : null,
    suggestion: showSuggestion ? suggestion : null,
    isPersona,
    showReason,
    showBenefit,
    showLimitation,
    showSuggestion,
    isUltraMinimal,
    isMinimal,
  };
}

export function sectionsToPlainText(sections: RecommendationSections): string {
  const parts = [sections.intro];

  if (sections.styleSummary) {
    parts.push(sections.styleSummary);
  }
  if (sections.reason) {
    parts.push(`推薦理由：${sections.reason}`);
  }
  if (sections.benefit) {
    parts.push(`優點：${sections.benefit}`);
  }
  if (sections.limitation) {
    parts.push(`限制：${sections.limitation}`);
  }
  if (sections.suggestion) {
    parts.push(`建議：${sections.suggestion}`);
  }

  return parts.join('\n');
}

export function buildRecommendationText(condition: Condition, outfit: Outfit): string {
  return sectionsToPlainText(buildRecommendationSections(condition, outfit));
}

export function countRecommendationBlocks(sections: RecommendationSections): number {
  let count = 1;
  if (sections.showReason && sections.reason) count += 1;
  if (sections.showBenefit && sections.benefit) count += 1;
  if (sections.showLimitation && sections.limitation) count += 1;
  if (sections.showSuggestion && sections.suggestion) count += 1;
  return count;
}
