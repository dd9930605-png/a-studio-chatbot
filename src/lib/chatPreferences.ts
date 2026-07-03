import { extractUserMessages } from '@/lib/dataRecorder';
import { ParticipantData } from '@/lib/dataRecorder';
import { getOutfit } from '@/lib/outfits';

export type ColorKey = 'white' | 'black' | 'blue' | 'gray' | 'brown' | 'stripe';

export interface ChatPreferences {
  dislikedColors: ColorKey[];
  likedColors: ColorKey[];
}

const COLOR_TERMS: Record<ColorKey, string[]> = {
  white: ['白色', '米白', '白'],
  black: ['黑色', '黑'],
  blue: ['淺藍', '深藍', '藍色', '藍'],
  gray: ['深灰', '灰色', '灰'],
  brown: ['咖啡色', '深棕', '棕色', '咖啡', '棕'],
  stripe: ['條紋'],
};

const DISLIKE_MARKERS = [
  '不喜歡',
  '不太喜歡',
  '討厭',
  '不要',
  '忌諱',
  '排斥',
  '不想穿',
  '不穿',
  '很不喜',
  '怕穿',
  '討厭穿',
];

const LIKE_MARKERS = ['喜歡', '偏好', '想要', '希望是', '傾向', '比較想', '愛'];

function detectColorsInText(text: string): ColorKey[] {
  const found: ColorKey[] = [];
  for (const [key, terms] of Object.entries(COLOR_TERMS) as [ColorKey, string[]][]) {
    if (terms.some((term) => text.includes(term))) {
      found.push(key);
    }
  }
  return found;
}

function hasDislikeMarker(text: string): boolean {
  return DISLIKE_MARKERS.some((marker) => text.includes(marker));
}

function hasLikeMarker(text: string): boolean {
  if (hasDislikeMarker(text)) return false;
  return LIKE_MARKERS.some((marker) => text.includes(marker));
}

export function extractChatPreferences(userMessages: string[]): ChatPreferences {
  const disliked = new Set<ColorKey>();
  const liked = new Set<ColorKey>();

  for (const message of userMessages) {
    const colors = detectColorsInText(message);
    if (colors.length === 0) continue;

    if (hasDislikeMarker(message)) {
      colors.forEach((color) => disliked.add(color));
      continue;
    }

    if (hasLikeMarker(message)) {
      colors.forEach((color) => liked.add(color));
    }
  }

  disliked.forEach((color) => liked.delete(color));

  return {
    dislikedColors: Array.from(disliked),
    likedColors: Array.from(liked),
  };
}

export function getOutfitColorKeys(outfitId: string): ColorKey[] {
  const outfit = getOutfit(outfitId);
  if (!outfit) return [];

  const text = `${outfit.outfitName} ${outfit.styleTags.join(' ')}`;
  return detectColorsInText(text);
}

export function outfitConflictsWithPreferences(
  outfitId: string,
  preferences: ChatPreferences,
): boolean {
  if (preferences.dislikedColors.length === 0) return false;

  const outfitColors = getOutfitColorKeys(outfitId);
  return preferences.dislikedColors.some((color) => outfitColors.includes(color));
}

function scoreOutfitForPreferences(outfitId: string, preferences: ChatPreferences): number {
  const outfitColors = getOutfitColorKeys(outfitId);
  let score = 0;

  for (const liked of preferences.likedColors) {
    if (outfitColors.includes(liked)) score += 2;
  }
  for (const disliked of preferences.dislikedColors) {
    if (outfitColors.includes(disliked)) score -= 5;
  }

  return score;
}

export function selectPreferenceAwareSurpriseOutfit(params: {
  assignedOutfit: string;
  candidates: string[];
  preferences: ChatPreferences;
}): { finalOutfit: string; adjusted: boolean } {
  const { assignedOutfit, candidates, preferences } = params;
  const pool = candidates.length > 0 ? candidates : [assignedOutfit];

  if (preferences.dislikedColors.length === 0 && preferences.likedColors.length === 0) {
    return { finalOutfit: assignedOutfit, adjusted: false };
  }

  if (!outfitConflictsWithPreferences(assignedOutfit, preferences)) {
    return { finalOutfit: assignedOutfit, adjusted: false };
  }

  const nonConflicting = pool.filter(
    (id) => !outfitConflictsWithPreferences(id, preferences),
  );

  if (nonConflicting.length === 0) {
    return { finalOutfit: assignedOutfit, adjusted: false };
  }

  const ranked = [...nonConflicting].sort(
    (a, b) => scoreOutfitForPreferences(b, preferences) - scoreOutfitForPreferences(a, preferences),
  );

  const topScore = scoreOutfitForPreferences(ranked[0], preferences);
  const topTier = ranked.filter(
    (id) => scoreOutfitForPreferences(id, preferences) === topScore,
  );
  const picked = topTier[Math.floor(Math.random() * topTier.length)];

  return {
    finalOutfit: picked,
    adjusted: picked !== assignedOutfit,
  };
}

export function extractPreferencesFromParticipant(
  participant: Pick<ParticipantData, 'chatLog'>,
): ChatPreferences {
  return extractChatPreferences(extractUserMessages(participant as ParticipantData));
}

export function formatPreferencesSummary(preferences: ChatPreferences): string {
  const parts: string[] = [];
  if (preferences.dislikedColors.length > 0) {
    parts.push(`不喜歡的色系：${preferences.dislikedColors.join('、')}`);
  }
  if (preferences.likedColors.length > 0) {
    parts.push(`偏好的色系：${preferences.likedColors.join('、')}`);
  }
  return parts.join('；') || '（尚未明確表達色系偏好）';
}
