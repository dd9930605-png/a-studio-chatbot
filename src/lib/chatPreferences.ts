import { extractUserMessages, ParticipantData } from '@/lib/dataRecorder';
import { detectBottomPreference, detectUnavailableColorRequests, outfitIsSkirt } from '@/lib/catalogBoundaries';
import { getOutfit } from '@/lib/outfits';

export type ColorKey = 'white' | 'black' | 'blue' | 'gray' | 'brown' | 'stripe';

/**
 * 版型三級（依本實驗 12 套實際商品界定，避免「寬褲」一刀切）
 * - structured：較俐落／非寬版（裙裝、一般牛仔褲＋領帶等）
 * - relaxed：面試友善寬版（寬腿西褲、寬版牛仔褲等，多數商品）
 * - oversized：明顯過寬／街頭工裝感（才是「太寬鬆」硬排除對象）
 */
export type FitLevel = 'structured' | 'relaxed' | 'oversized';

export interface ChatPreferences {
  dislikedColors: ColorKey[];
  /** 使用者多次或強烈拒絕的色系（硬排除） */
  strongDislikedColors: ColorKey[];
  likedColors: ColorKey[];
  /** 硬排除的版型層級（通常只有 oversized） */
  avoidedFitLevels: FitLevel[];
  /** 加分的版型層級 */
  preferredFitLevels: FitLevel[];
  /** 僅扣分、不整批剔除的版型（例如不喜歡太合身） */
  softAvoidFitLevels: FitLevel[];
  wantsFormal: boolean;
  dislikesSkirt: boolean;
  dislikesJeans: boolean;
  prefersPants: boolean;
  prefersSkirt: boolean;
  matchedStyleKeywords: string[];
  requestedUnavailableColors: string[];
}

const COLOR_TERMS: Record<ColorKey, string[]> = {
  white: ['白色', '米白', '白'],
  black: ['黑色', '黑'],
  blue: ['淺藍', '深藍', '藍色', '藍'],
  gray: ['深灰', '灰色', '灰'],
  brown: ['咖啡色', '深棕', '棕色', '咖啡', '棕'],
  stripe: ['條紋'],
};

function colorLabel(color: ColorKey): string {
  return COLOR_TERMS[color][0];
}

const STRONG_DISLIKE_MARKERS = [
  '討厭',
  '不要',
  '忌諱',
  '排斥',
  '不想穿',
  '不穿',
  '很不喜',
  '討厭穿',
  '絕對不要',
  '不想要',
  '別給我',
  '別推',
  '拒絕',
];
const SOFT_DISLIKE_MARKERS = ['不喜歡', '不太喜歡', '怕穿', '較不喜歡', '沒那麼喜歡', '不太適合我'];

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

/** 依商品內容人工分級（勿只靠「寬褲」關鍵字，否則幾乎全剔除） */
const OUTFIT_FIT_LEVEL: Record<string, FitLevel> = {
  M1: 'structured', // 一般牛仔褲＋領帶，非寬版
  M2: 'oversized', // 工裝寬褲＋破邊街頭
  M3: 'relaxed', // 寬版牛仔褲，面試友善寬
  M4: 'relaxed', // 寬腿西褲，有結構
  M5: 'relaxed', // 領帶＋寬褲
  M6: 'relaxed', // 寬褲＋上衣
  F1: 'relaxed', // 寬褲牛仔褲
  F2: 'relaxed', // 寬腿西褲＋領帶
  F3: 'relaxed', // 寬褲＋層次
  F4: 'oversized', // 抽繩寬褲，較鬆休閒
  F5: 'structured', // 及膝裙
  F6: 'structured', // 及膝裙
};

function fitLevelLabel(level: FitLevel): string {
  if (level === 'structured') return '較俐落版型';
  if (level === 'relaxed') return '適中寬版';
  return '過於寬鬆／工裝感';
}

/** 不喜歡「太寬鬆」→ 只避開 oversized，不刪掉多數 relaxed */
const AVOID_OVERSIZED_MARKERS = [
  '不喜歡太寬',
  '不喜歡寬鬆',
  '不要太寬',
  '不要寬鬆',
  '討厭寬鬆',
  '太寬鬆',
  '別太寬',
  '不要oversize',
  '不喜歡oversize',
  '不要工裝',
  '不喜歡工裝',
  '太寬大',
];
const PREFER_STRUCTURED_MARKERS = [
  '喜歡合身',
  '想要合身',
  '偏好合身',
  '比較合身',
  '想穿合身',
  '喜歡修身',
  '想要修身',
  '合身一點',
  '修身一點',
  '可以合身',
  '不要太寬鬆',
  '別太寬鬆',
  '俐落一點',
  '看起來俐落',
];
const PREFER_RELAXED_MARKERS = [
  '喜歡寬鬆',
  '想要寬鬆',
  '偏好寬鬆',
  '比較寬鬆',
  '想穿寬鬆',
  '喜歡oversize',
  '想要oversize',
  '寬鬆一點',
  '可以寬鬆',
  '喜歡寬版',
  '想要寬版',
];
const SOFT_AVOID_STRUCTURED_MARKERS = [
  '不喜歡太合身',
  '不要太合身',
  '太合身',
  '不要太貼',
  '不喜歡貼身',
  '不要緊身',
  '不喜歡緊身',
];

function messageMentionsFitPreference(message: string): {
  avoided: FitLevel[];
  preferred: FitLevel[];
  softAvoid: FitLevel[];
} {
  const avoided: FitLevel[] = [];
  const preferred: FitLevel[] = [];
  const softAvoid: FitLevel[] = [];

  const lower = message.toLowerCase();

  if (
    AVOID_OVERSIZED_MARKERS.some((m) => message.includes(m)) ||
    (isAnyDislikeMessage(message) && /寬鬆|太寬|oversize|工裝寬/i.test(message))
  ) {
    avoided.push('oversized');
  }

  if (
    PREFER_STRUCTURED_MARKERS.some((m) => message.includes(m)) ||
    (hasLikeMarker(message) && /合身|修身|俐落/.test(message) && !isAnyDislikeMessage(message))
  ) {
    preferred.push('structured');
  }

  if (
    PREFER_RELAXED_MARKERS.some((m) => message.includes(m)) ||
    (hasLikeMarker(message) && /寬鬆|寬版|oversize/i.test(lower) && !isAnyDislikeMessage(message))
  ) {
    preferred.push('relaxed');
  }

  if (
    SOFT_AVOID_STRUCTURED_MARKERS.some((m) => message.includes(m)) ||
    (isAnyDislikeMessage(message) && /合身|修身|貼身|緊身|太貼/.test(message))
  ) {
    softAvoid.push('structured');
  }

  return { avoided, preferred, softAvoid };
}

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

function isStrongDislikeMessage(text: string): boolean {
  return STRONG_DISLIKE_MARKERS.some((marker) => text.includes(marker));
}

function isAnyDislikeMessage(text: string): boolean {
  return (
    isStrongDislikeMessage(text) || SOFT_DISLIKE_MARKERS.some((marker) => text.includes(marker))
  );
}

function hasLikeMarker(text: string): boolean {
  if (isAnyDislikeMessage(text)) return false;
  return LIKE_MARKERS.some((marker) => text.includes(marker));
}

function countColorDislikeMentions(userMessages: string[], color: ColorKey): number {
  const terms = COLOR_TERMS[color];
  let count = 0;
  for (const message of userMessages) {
    if (isAnyDislikeMessage(message) && terms.some((term) => message.includes(term))) {
      count += 1;
    }
  }
  return count;
}

export function emptyChatPreferences(): ChatPreferences {
  return {
    dislikedColors: [],
    strongDislikedColors: [],
    likedColors: [],
    avoidedFitLevels: [],
    preferredFitLevels: [],
    softAvoidFitLevels: [],
    wantsFormal: false,
    dislikesSkirt: false,
    dislikesJeans: false,
    prefersPants: false,
    prefersSkirt: false,
    matchedStyleKeywords: [],
    requestedUnavailableColors: [],
  };
}

export function extractChatPreferences(userMessages: string[]): ChatPreferences {
  const disliked = new Set<ColorKey>();
  const strongDisliked = new Set<ColorKey>();
  const liked = new Set<ColorKey>();
  const dislikedFits = new Set<FitLevel>();
  const preferredFits = new Set<FitLevel>();
  const softAvoidFits = new Set<FitLevel>();
  let wantsFormal = false;
  let dislikesSkirt = false;
  let dislikesJeans = false;
  const matchedStyleKeywords = new Set<string>();

  for (const message of userMessages) {
    // 依子句判斷極性，避免「不喜歡黑，比較喜歡白」把白色也算討厭
    const clauses = message.split(/[，,。！？?!；;]|但是|不過|可是|而且/);
    let clauseMatched = false;

    for (const clause of clauses) {
      const colors = detectColorsInText(clause);
      if (colors.length === 0) continue;
      clauseMatched = true;

      if (isAnyDislikeMessage(clause)) {
        colors.forEach((color) => disliked.add(color));
        if (isStrongDislikeMessage(clause)) {
          colors.forEach((color) => strongDisliked.add(color));
        }
      } else if (hasLikeMarker(clause)) {
        colors.forEach((color) => liked.add(color));
      }
    }

    if (!clauseMatched) {
      const colors = detectColorsInText(message);
      if (colors.length > 0 && isAnyDislikeMessage(message)) {
        colors.forEach((color) => disliked.add(color));
        if (isStrongDislikeMessage(message)) {
          colors.forEach((color) => strongDisliked.add(color));
        }
      } else if (colors.length > 0 && hasLikeMarker(message)) {
        colors.forEach((color) => liked.add(color));
      }
    }

    const fitPref = messageMentionsFitPreference(message);
    fitPref.avoided.forEach((fit) => {
      dislikedFits.add(fit);
      preferredFits.delete(fit);
    });
    fitPref.preferred.forEach((fit) => {
      if (!dislikedFits.has(fit)) preferredFits.add(fit);
    });
    fitPref.softAvoid.forEach((fit) => softAvoidFits.add(fit));

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

  disliked.forEach((color) => {
    liked.delete(color);
    if (countColorDislikeMentions(userMessages, color) >= 2) {
      strongDisliked.add(color);
    }
  });

  // 偏好與不喜歡衝突時，以不喜歡為準
  dislikedFits.forEach((fit) => preferredFits.delete(fit));
  softAvoidFits.forEach((fit) => preferredFits.delete(fit));

  const bottomPref = detectBottomPreference(userMessages);
  const prefersPants = bottomPref === 'pants' || dislikesSkirt;
  const prefersSkirt = bottomPref === 'skirt' && !dislikesSkirt;

  return {
    dislikedColors: Array.from(disliked),
    strongDislikedColors: Array.from(strongDisliked),
    likedColors: Array.from(liked),
    avoidedFitLevels: Array.from(dislikedFits),
    preferredFitLevels: Array.from(preferredFits),
    softAvoidFitLevels: Array.from(softAvoidFits),
    wantsFormal,
    dislikesSkirt,
    dislikesJeans,
    prefersPants,
    prefersSkirt,
    matchedStyleKeywords: Array.from(matchedStyleKeywords),
    requestedUnavailableColors: detectUnavailableColorRequests(userMessages),
  };
}

export function hasExplicitPreferences(preferences: ChatPreferences): boolean {
  return (
    preferences.dislikedColors.length > 0 ||
    preferences.strongDislikedColors.length > 0 ||
    preferences.likedColors.length > 0 ||
    preferences.avoidedFitLevels.length > 0 ||
    preferences.preferredFitLevels.length > 0 ||
    preferences.softAvoidFitLevels.length > 0 ||
    preferences.wantsFormal ||
    preferences.dislikesSkirt ||
    preferences.dislikesJeans ||
    preferences.prefersPants ||
    preferences.prefersSkirt ||
    preferences.matchedStyleKeywords.length > 0 ||
    preferences.requestedUnavailableColors.length > 0
  );
}

export function getOutfitColorKeys(outfitId: string): ColorKey[] {
  const outfit = getOutfit(outfitId);
  if (!outfit) return [];

  const text = `${outfit.outfitName} ${outfit.styleTags.join(' ')}`;
  return detectColorsInText(text);
}

export function getOutfitFitLevel(outfitId: string): FitLevel {
  return OUTFIT_FIT_LEVEL[outfitId] ?? 'relaxed';
}

export function outfitConflictsWithPreferences(
  outfitId: string,
  preferences: ChatPreferences,
): boolean {
  const outfit = getOutfit(outfitId);
  if (!outfit) return false;

  const text = `${outfit.outfitName} ${outfit.styleTags.join(' ')}`;

  // 明確不喜歡／強烈排斥的色系：最終選款一律硬排除（避免只扣分仍被選中）
  const excludedColors = Array.from(
    new Set([...preferences.strongDislikedColors, ...preferences.dislikedColors]),
  );
  if (excludedColors.length > 0) {
    const outfitColors = getOutfitColorKeys(outfitId);
    if (excludedColors.some((color) => outfitColors.includes(color))) {
      return true;
    }
  }

  // 版型：只硬排除 avoidedFitLevels（預設是 oversized，不會清空多數寬版商品）
  const fitLevel = getOutfitFitLevel(outfitId);
  if (preferences.avoidedFitLevels.includes(fitLevel)) {
    return true;
  }

  if ((preferences.dislikesSkirt || preferences.prefersPants) && outfitIsSkirt(outfitId)) {
    return true;
  }

  if (preferences.prefersSkirt && !outfitIsSkirt(outfitId) && outfit.displayCategory === 'female') {
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
  const fitLevel = getOutfitFitLevel(outfitId);
  const text = `${outfit.outfitName} ${outfit.styleTags.join(' ')}`;

  for (const liked of preferences.likedColors) {
    if (outfitColors.includes(liked)) score += 3;
  }

  for (const disliked of preferences.dislikedColors) {
    if (outfitColors.includes(disliked)) score -= 2;
  }

  for (const strong of preferences.strongDislikedColors) {
    if (outfitColors.includes(strong)) score -= 8;
  }

  if (preferences.preferredFitLevels.includes(fitLevel)) {
    score += 4;
  }

  // 想要較俐落：structured 最高，relaxed 可留，oversized 大扣
  if (preferences.preferredFitLevels.includes('structured')) {
    if (fitLevel === 'structured') score += 3;
    if (fitLevel === 'relaxed') score -= 1;
    if (fitLevel === 'oversized') score -= 5;
  }

  // 想要寬一點：relaxed / oversized 加分
  if (preferences.preferredFitLevels.includes('relaxed')) {
    if (fitLevel === 'relaxed') score += 2;
    if (fitLevel === 'oversized') score += 1;
  }

  if (preferences.avoidedFitLevels.includes(fitLevel)) {
    score -= 8;
  }

  if (preferences.softAvoidFitLevels.includes(fitLevel)) {
    score -= 3;
  }

  if (preferences.prefersPants && outfitIsPants(outfitId)) {
    score += 4;
  }

  if (preferences.prefersPants && outfitIsSkirt(outfitId)) {
    score -= 10;
  }

  if (preferences.prefersSkirt && outfitIsSkirt(outfitId)) {
    score += 4;
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

function outfitIsPants(outfitId: string): boolean {
  return !outfitIsSkirt(outfitId);
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

  if (preferences.requestedUnavailableColors.length > 0) {
    parts.push(`曾詢問庫存沒有的色系：${preferences.requestedUnavailableColors.join('、')}`);
  }
  if (preferences.strongDislikedColors.length > 0) {
    parts.push(`強烈不喜歡的色系：${preferences.strongDislikedColors.map(colorLabel).join('、')}`);
  }
  const softOnly = preferences.dislikedColors.filter(
    (color) => !preferences.strongDislikedColors.includes(color),
  );
  if (softOnly.length > 0) {
    parts.push(`較不喜歡的色系：${softOnly.map(colorLabel).join('、')}`);
  }
  if (preferences.likedColors.length > 0) {
    parts.push(`偏好的色系：${preferences.likedColors.map(colorLabel).join('、')}`);
  }
  if (preferences.preferredFitLevels.length > 0) {
    parts.push(`偏好版型：${preferences.preferredFitLevels.map(fitLevelLabel).join('、')}`);
  }
  if (preferences.avoidedFitLevels.length > 0) {
    parts.push(`想避開：${preferences.avoidedFitLevels.map(fitLevelLabel).join('、')}`);
  }
  if (preferences.softAvoidFitLevels.length > 0) {
    parts.push(`較不想要：${preferences.softAvoidFitLevels.map(fitLevelLabel).join('、')}`);
  }
  if (preferences.wantsFormal) {
    parts.push('希望正式、專業感');
  }
  if (preferences.prefersPants) {
    parts.push('偏好褲裝');
  }
  if (preferences.prefersSkirt) {
    parts.push('偏好裙裝');
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

export function finalOutfitConflictsWithSoftPreferences(
  outfitId: string,
  preferences: ChatPreferences,
): { hasConflict: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const outfitColors = getOutfitColorKeys(outfitId);
  const fitLevel = getOutfitFitLevel(outfitId);

  for (const color of preferences.strongDislikedColors) {
    if (outfitColors.includes(color)) {
      reasons.push(`含您明確不喜歡的${colorLabel(color)}元素`);
    }
  }

  for (const color of preferences.dislikedColors) {
    if (!preferences.strongDislikedColors.includes(color) && outfitColors.includes(color)) {
      reasons.push(`含您較不喜歡的${colorLabel(color)}元素`);
    }
  }

  if (preferences.prefersPants && outfitIsSkirt(outfitId)) {
    reasons.push('您偏好褲裝，而本套為裙裝');
  }

  if (preferences.avoidedFitLevels.includes(fitLevel)) {
    reasons.push(`版型偏${fitLevelLabel(fitLevel)}，與您提到的偏好不同`);
  }

  if (preferences.softAvoidFitLevels.includes(fitLevel)) {
    reasons.push(`版型偏${fitLevelLabel(fitLevel)}，與您較不想要的方向接近`);
  }

  if (preferences.requestedUnavailableColors.length > 0) {
    reasons.push(`網站沒有您詢問的${preferences.requestedUnavailableColors.join('、')}單品`);
  }

  return { hasConflict: reasons.length > 0, reasons };
}

/** 回扣使用者說過的喜歡／不喜歡，產生「有被記住」的短句 */
export function buildPreferenceMemoryLine(
  preferences: ChatPreferences,
  finalOutfitId?: string,
): string {
  if (!hasExplicitPreferences(preferences)) return '';

  const bits: string[] = [];
  if (preferences.likedColors.length > 0) {
    bits.push(`喜歡${preferences.likedColors.map(colorLabel).join('、')}`);
  }
  const avoided = Array.from(
    new Set([...preferences.strongDislikedColors, ...preferences.dislikedColors]),
  );
  if (avoided.length > 0) {
    bits.push(`不太想要${avoided.map(colorLabel).join('、')}`);
  }
  if (preferences.preferredFitLevels.length > 0) {
    bits.push(`偏好${preferences.preferredFitLevels.map(fitLevelLabel).join('、')}`);
  }
  if (preferences.avoidedFitLevels.length > 0) {
    bits.push(`不太想要${preferences.avoidedFitLevels.map(fitLevelLabel).join('、')}`);
  }
  if (preferences.softAvoidFitLevels.length > 0) {
    bits.push(`較不想要${preferences.softAvoidFitLevels.map(fitLevelLabel).join('、')}`);
  }
  if (preferences.prefersPants) bits.push('偏好褲裝');
  if (preferences.prefersSkirt) bits.push('偏好裙裝');
  if (preferences.matchedStyleKeywords.length > 0) {
    bits.push(`提到${preferences.matchedStyleKeywords.slice(0, 2).join('、')}風格`);
  }

  if (bits.length === 0) return '';

  const outfitColors = finalOutfitId ? getOutfitColorKeys(finalOutfitId) : [];
  const fitLevel = finalOutfitId ? getOutfitFitLevel(finalOutfitId) : null;
  const avoidedHere = avoided.filter((color) => outfitColors.includes(color));
  const fitConflict =
    fitLevel &&
    (preferences.avoidedFitLevels.includes(fitLevel) ||
      preferences.softAvoidFitLevels.includes(fitLevel));

  if (avoidedHere.length > 0 || fitConflict) {
    const conflictBits = [
      ...avoidedHere.map(colorLabel),
      ...(fitConflict && fitLevel ? [fitLevelLabel(fitLevel)] : []),
    ];
    return `因為您先前提到${bits.join('、')}，我仍依面試需求說明以下搭配，並坦白這套仍帶有${conflictBits.join('、')}。`;
  }

  return `因為您先前提到${bits.join('、')}，所以這次的推薦有把這些偏好一併納入考量。`;
}
