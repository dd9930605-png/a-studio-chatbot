import { Condition } from '@/lib/conditions';
import { Outfit } from '@/lib/outfits';

export function buildRecommendationText(condition: Condition, outfit: Outfit): string {
  const { outfitName, styleTags, reason, benefit, limitation, suggestion } = outfit;
  const tags = styleTags.join('、');
  const isPersona = condition.anthropomorphism === 'high';
  const hasExplain = condition.explainability === 'high';
  const hasTwoSided = condition.twoSidedMessage === 'high';
  const hasProactive = condition.proactivity === 'high';

  if (!isPersona && !hasExplain && !hasTwoSided) {
    return `系統推薦「${outfitName}」。此搭配符合面試穿搭需求，整體風格為${tags}。請點選下方選項繼續。`;
  }

  if (!isPersona && hasExplain && !hasTwoSided) {
    return `系統推薦「${outfitName}」。推薦理由：${reason}整體風格為${tags}。`;
  }

  if (!isPersona && hasExplain && hasTwoSided) {
    return `系統推薦「${outfitName}」。推薦理由為：${reason}此搭配的優點是${benefit}限制是${limitation}。`;
  }

  if (isPersona && !hasExplain && !hasTwoSided) {
    return `我會推薦你選擇「${outfitName}」。這套搭配適合面試穿搭。`;
  }

  if (isPersona && hasExplain && !hasTwoSided) {
    const suffix = hasProactive ? ` 我會建議你${suggestion}` : '';
    return `我會推薦你選擇「${outfitName}」。這套搭配適合面試穿搭，因為${reason}${suffix}`;
  }

  if (isPersona && hasExplain && hasTwoSided && !hasProactive) {
    return `我會推薦你選擇「${outfitName}」。這套搭配適合面試穿搭，因為${reason}。它的優點是${benefit}。不過，${limitation}。`;
  }

  const emoji = hasProactive ? ' 😊' : '';
  const suggestionPart = hasProactive ? `我會建議你${suggestion}${emoji}` : '';
  return `我會推薦你選擇「${outfitName}」。這套搭配適合面試穿搭，因為${reason}。它的優點是${benefit}。不過，${limitation}。${suggestionPart}`;
}
