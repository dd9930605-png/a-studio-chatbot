import { extractUserMessages, ParticipantData } from '@/lib/dataRecorder';
import { getOutfit } from '@/lib/outfits';

export type ColorKey = 'white' | 'black' | 'blue' | 'gray' | 'brown' | 'stripe';

export interface ChatPreferences {
  dislikedColors: ColorKey[];
  likedColors: ColorKey[];
  wantsFormal: boolean;
  dislikesSkirt: boolean;
  dislikesJeans: boolean;
  matchedStyleKeywords: string[];
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

const LIKE_MARKERS = ['喜歡', '偏好', '想要', '希望', '傾向', '比較想', '愛'];

const FORMAL_MARKERS = [
  '正式',
  '專業',
  '穩重',
  '保守',
  '嚴肅',
  '體面',
  '得體',
  '西裝',
  '襯衫領帶',
];

const SKIRT_DISLIKE_MARKERS = ['不要裙', '不喜歡裙', '討厭裙', '不穿裙', '別推裙'];
const JEANS_DISLIKE_MARKERS = ['不要牛仔', '不喜歡牛仔', '討厭牛仔', '不穿牛仔'];

const STYLE_KEYWORDS = ['簡約', '乾淨', '俐落', '韓系', '清爽', '時尚', '知性', '親切', '自然'];

const CASUAL_STYLE_TAGS = ['街頭', '休閒', '個性風格'];
const FORMAL_STYLE_TAGS = ['正式專業', '俐落正式', '正式', '專業', '襯衫領帶'];

function detectColorsInText(text: string): ColorKey[] {
  const found: ColorKey[] = [];
  for (const [key, terms] of Object.entries(COLOR_TERMS) as [ColorKey, string[]][]) {
    const sorted = [...terms].sort((a, b) => b.length - a.length);
    if (sorted.some((term) => text.includes(term))) {
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
  let wantsFormal = false;
  let dislikesSkirt = false;
  let dislikesJeans = false;
  const matchedStyleKeywords = new Set<string>();

  for (const message of userMessages) {
    const colors = detectColorsInText(message);

    if (colors.length > 0 && hasDislikeMarker(message)) {
      colors.forEach((color) => disliked.add(color));
    } else if (colors.length > 0 && hasLikeMarker(message)) {
      colors.forEach((color) => liked.add(color));
    }

    if (FORMAL_MARKERS.some((marker) => message.includes(marker))) {
      wantsFormal = true;
    }
    if (SKIRT_DISLIKE_MARKERS.some((marker) => message.includes(marker))) {
      dislikesSkirt = true;
    }
    if (JEANS_DISLIKE_MARKERS.some((marker) => message.includes(marker))) {
      dislikesJeans = true;
    }
    for (const keyword of STYLE_KEYWORDS) {
      if (message.includes(keyword)) {
        matchedStyleKeywords.add(keyword);
      }
    }
  }

  disliked.forEach((color) => liked.delete(color));

  return {
    dislikedColors: Array.from(disliked),
    likedColors: Array.from(liked),
    wantsFormal,
    dislikesSkirt,
    dislikesJeans,
    matchedStyleKeywords: Array.from(matchedStyleKeywords),
  };
}

export function hasExplicitPreferences(preferences: ChatPreferences): boolean {
  return (
    preferences.dislikedColors.length > 0 ||
    preferences.likedColors.length > 0 ||
    preferences.wantsFormal ||
    preferences.dislikesSkirt ||
    preferences.dislikesJeans ||
    preferences.matchedStyleKeywords.length > 0
  );
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
  const outfit = getOutfit(outfitId);
  if (!outfit) return false;

  const text = `${outfit.outfitName} ${outfit.styleTags.join(' ')}`;

  if (preferences.dislikedColors.length > 0) {
    const outfitColors = getOutfitColorKeys(outfitId);
    if (preferences.dislikedColors.some((color) => outfitColors.includes(color))) {
      return true;
    }
  }

  if (preferences.dislikesSkirt && text.includes('裙')) {
    return true;
  }

  if (preferences.dislikesJeans && text.includes('牛仔')) {
    return true;
  }

  if (preferences.wantsFormal) {
    const isCasualTagged = outfit.styleTags.some((tag) =>
      CASUAL_STYLE_TAGS.some((casual) => tag.includes(casual)),
    );
    if (isCasualTagged) {
      return true;
    }
  }

  return false;
}

function scoreOutfitForPreferences(outfitId: string, preferences: ChatPreferences): number {
  const outfit = getOutfit(outfitId);
  if (!outfit) return -999;

  let score = 0;
  const outfitColors = getOutfitColorKeys(outfitId);
  const text = `${outfit.outfitName} ${outfit.styleTags.join(' ')}`;

  for (const liked of preferences.likedColors) {
    if (outfitColors.includes(liked)) score += 3;
  }

  for (const disliked of preferences.dislikedColors) {
    if (outfitColors.includes(disliked)) score -= 5;
  }

  if (preferences.wantsFormal) {
    if (outfit.styleTags.some((tag) => FORMAL_STYLE_TAGS.some((formal) => tag.includes(formal)))) {
      score += 2;
    }
  }

  for (const keyword of preferences.matchedStyleKeywords) {
    if (text.includes(keyword) || outfit.styleTags.some((tag) => tag.includes(keyword))) {
      score += 1;
    }
  }

  return score;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function selectSurpriseOutfitBPlus(params: {
  expectedOutfitBeforeAI: string;
  candidates: string[];
  preferences: ChatPreferences;
}): {
  finalOutfit: string;
  selectionMode: 'random' | 'preference_scored';
  chatPreferenceAdjusted: boolean;
} {
  const { expectedOutfitBeforeAI, preferences } = params;
  const pool = params.candidates.filter((id) => id !== expectedOutfitBeforeAI);

  if (pool.length === 0) {
    throw new Error('surprise 模式下沒有可用的推薦候選穿搭。');
  }

  if (!hasExplicitPreferences(preferences)) {
    return {
      finalOutfit: pickRandom(pool),
      selectionMode: 'random',
      chatPreferenceAdjusted: false,
    };
  }

  const nonConflicting = pool.filter((id) => !outfitConflictsWithPreferences(id, preferences));
  const workingPool = nonConflicting.length > 0 ? nonConflicting : pool;

  const ranked = [...workingPool].sort(
    (a, b) => scoreOutfitForPreferences(b, preferences) - scoreOutfitForPreferences(a, preferences),
  );

  const topScore = scoreOutfitForPreferences(ranked[0], preferences);
  const topTier = ranked.filter((id) => scoreOutfitForPreferences(id, preferences) === topScore);
  const picked = pickRandom(topTier);

  return {
    finalOutfit: picked,
    selectionMode: 'preference_scored',
    chatPreferenceAdjusted: nonConflicting.length > 0 && topTier.length < pool.length,
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
  if (preferences.wantsFormal) {
    parts.push('希望正式、專業感');
  }
  if (preferences.dislikesSkirt) {
    parts.push('不要裙裝');
  }
  if (preferences.dislikesJeans) {
    parts.push('不要牛仔褲');
  }
  if (preferences.matchedStyleKeywords.length > 0) {
    parts.push(`風格關鍵字：${preferences.matchedStyleKeywords.join('、')}`);
  }

  return parts.join('；') || '（尚未明確表達偏好）';
}
