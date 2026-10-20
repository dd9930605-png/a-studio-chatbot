/**
 * 12 套 Look 的正式特徵矩陣（single source of truth）。
 * surprise scoring、EX compatibility、庫存邊界都讀這裡。
 * 結果頁 positiveA/B/caution 仍在 lookResultContent.ts，維持待人工確認。
 */

export type ColorFamily = 'dark' | 'light' | 'mixed';
export type ColorToken =
  | 'white'
  | 'beige'
  | 'black'
  | 'lightBlue'
  | 'darkBlue'
  | 'gray'
  | 'darkGray'
  | 'brown';
export type PatternKind = 'stripe' | 'none';
export type BottomKind = 'jeans' | 'dress_pants' | 'wide_pants' | 'skirt';
export type FitLevel = 'structured' | 'relaxed' | 'oversized';
export type FormalityLevel = 'high' | 'mid' | 'low';

export interface LookFeatures {
  outfitId: string;
  colorFamily: ColorFamily;
  colors: ColorToken[];
  pattern: PatternKind;
  tie: boolean;
  cargo: boolean;
  bottom: BottomKind;
  fit: FitLevel;
  formality: FormalityLevel;
  style: string[];
}

export const LOOK_FEATURES: Record<string, LookFeatures> = {
  M1: {
    outfitId: 'M1',
    colorFamily: 'mixed',
    colors: ['white', 'black', 'darkGray'],
    pattern: 'none',
    tie: true,
    cargo: false,
    bottom: 'jeans',
    fit: 'structured',
    formality: 'mid',
    style: ['韓系', '半正式', '簡約'],
  },
  M2: {
    outfitId: 'M2',
    colorFamily: 'dark',
    colors: ['darkGray', 'black'],
    pattern: 'none',
    tie: false,
    cargo: true,
    bottom: 'wide_pants',
    fit: 'oversized',
    formality: 'low',
    style: ['個性風格', '街頭'],
  },
  M3: {
    outfitId: 'M3',
    colorFamily: 'mixed',
    colors: ['brown', 'white', 'darkBlue'],
    pattern: 'none',
    tie: false,
    cargo: false,
    bottom: 'jeans',
    fit: 'relaxed',
    formality: 'mid',
    style: ['韓系', '層次穿搭', '商務休閒'],
  },
  M4: {
    outfitId: 'M4',
    colorFamily: 'dark',
    colors: ['black', 'gray'],
    pattern: 'none',
    tie: false,
    cargo: false,
    bottom: 'dress_pants',
    fit: 'relaxed',
    formality: 'mid',
    style: ['韓系', '簡約', '俐落'],
  },
  M5: {
    outfitId: 'M5',
    colorFamily: 'mixed',
    colors: ['lightBlue', 'darkBlue', 'black'],
    pattern: 'stripe',
    tie: true,
    cargo: false,
    bottom: 'wide_pants',
    fit: 'relaxed',
    formality: 'high',
    style: ['正式專業', '襯衫領帶'],
  },
  M6: {
    outfitId: 'M6',
    colorFamily: 'mixed',
    colors: ['black', 'white'],
    pattern: 'none',
    tie: false,
    cargo: false,
    bottom: 'wide_pants',
    fit: 'relaxed',
    formality: 'mid',
    style: ['極簡', '韓系', '俐落'],
  },
  F1: {
    outfitId: 'F1',
    colorFamily: 'light',
    colors: ['white', 'lightBlue'],
    pattern: 'none',
    tie: false,
    cargo: false,
    bottom: 'jeans',
    fit: 'relaxed',
    formality: 'low',
    style: ['簡約', '韓系', '通勤'],
  },
  F2: {
    outfitId: 'F2',
    colorFamily: 'dark',
    colors: ['brown'],
    pattern: 'stripe',
    tie: true,
    cargo: false,
    bottom: 'dress_pants',
    fit: 'relaxed',
    formality: 'high',
    style: ['俐落', '正式'],
  },
  F3: {
    outfitId: 'F3',
    colorFamily: 'mixed',
    colors: ['lightBlue', 'white', 'black'],
    pattern: 'stripe',
    tie: false,
    cargo: false,
    bottom: 'wide_pants',
    fit: 'relaxed',
    formality: 'mid',
    style: ['柔和專業', '層次穿搭'],
  },
  F4: {
    outfitId: 'F4',
    colorFamily: 'dark',
    colors: ['black'],
    pattern: 'stripe',
    tie: true,
    cargo: false,
    bottom: 'wide_pants',
    fit: 'oversized',
    formality: 'mid',
    style: ['韓系', '通勤', '俐落'],
  },
  F5: {
    outfitId: 'F5',
    colorFamily: 'mixed',
    colors: ['white', 'black'],
    pattern: 'none',
    tie: false,
    cargo: false,
    bottom: 'skirt',
    fit: 'structured',
    formality: 'high',
    style: ['正式專業', '俐落'],
  },
  F6: {
    outfitId: 'F6',
    colorFamily: 'light',
    colors: ['lightBlue', 'beige'],
    pattern: 'none',
    tie: false,
    cargo: false,
    bottom: 'skirt',
    fit: 'structured',
    formality: 'mid',
    style: ['柔和專業', '韓系', '通勤'],
  },
};

const FALLBACK_FEATURES: LookFeatures = {
  outfitId: '',
  colorFamily: 'mixed',
  colors: [],
  pattern: 'none',
  tie: false,
  cargo: false,
  bottom: 'wide_pants',
  fit: 'relaxed',
  formality: 'mid',
  style: [],
};

export function getLookFeatures(outfitId: string): LookFeatures {
  return LOOK_FEATURES[outfitId] ?? { ...FALLBACK_FEATURES, outfitId };
}

export const CATALOG_COLOR_TOKENS: ColorToken[] = [
  'white',
  'beige',
  'black',
  'lightBlue',
  'darkBlue',
  'gray',
  'darkGray',
  'brown',
];

export const UNAVAILABLE_COLOR_LABELS = ['綠色', '紅色', '粉色', '紫色', '黃色', '橘色'] as const;

export function lookSupportsColorFamily(outfitId: string, family: ColorFamily): boolean {
  const actual = getLookFeatures(outfitId).colorFamily;
  if (family === 'mixed') return true;
  if (actual === 'mixed') return true;
  return actual === family;
}

export function lookHasColor(outfitId: string, color: ColorToken): boolean {
  return getLookFeatures(outfitId).colors.includes(color);
}

export const COLOR_TOKEN_ZH: Record<ColorToken, string> = {
  white: '白色',
  beige: '米白',
  black: '黑色',
  lightBlue: '淺藍',
  darkBlue: '深藍',
  gray: '灰色',
  darkGray: '深灰',
  brown: '棕色',
};

/** 給受試者／顧問看的現貨色名（含棕色別名；條紋是圖案，不列在這裡） */
export const CATALOG_COLOR_LABELS = [
  '白色',
  '米白',
  '黑色',
  '淺藍',
  '深藍',
  '灰色',
  '深灰',
  '咖啡色',
  '深棕',
  '棕色',
] as const;

export function catalogHasColorFamily(family: ColorFamily): boolean {
  return Object.values(LOOK_FEATURES).some((features) => {
    if (family === 'mixed') return true;
    if (features.colorFamily === 'mixed') return true;
    return features.colorFamily === family;
  });
}

export function catalogHasColorToken(color: ColorToken): boolean {
  return Object.values(LOOK_FEATURES).some((features) => features.colors.includes(color));
}
