import outfitsData from '../../public/outfits.json';
import { getAllOutfitIds, sortOutfitIdsByLook } from '@/lib/looks';

export type OutfitCategory = 'male' | 'female';
export type WearCategory = 'neutral' | 'male_only' | 'female_only';
export type SurpriseMode = 'surprise' | 'no_surprise';

export interface Outfit {
  outfitId: string;
  displayCategory: OutfitCategory;
  wearCategory: WearCategory;
  outfitName: string;
  outfitImage: string;
  styleTags: string[];
  reason: string;
  benefit: string;
  limitation: string;
  suggestion: string;
}

export const outfits = outfitsData as Outfit[];

const MALE_ALLOWED = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'F1', 'F2', 'F3', 'F4'];
const MALE_BLOCKED = ['F5', 'F6'];
const FEMALE_ALLOWED = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'M1', 'M2', 'M3', 'M4'];
const FEMALE_BLOCKED = ['M5', 'M6'];

export function getOutfit(outfitId: string): Outfit | undefined {
  return outfits.find((outfit) => outfit.outfitId === outfitId);
}

export function getAllowedOutfits(category: OutfitCategory): string[] {
  const ids = category === 'male' ? [...MALE_ALLOWED] : [...FEMALE_ALLOWED];
  return sortOutfitIdsByLook(ids);
}

export function getBlockedOutfits(category: OutfitCategory): string[] {
  return category === 'male' ? [...MALE_BLOCKED] : [...FEMALE_BLOCKED];
}

export function getOutfitPools(category: OutfitCategory): {
  allowedOutfits: string[];
  blockedOutfits: string[];
} {
  return {
    allowedOutfits: getAllowedOutfits(category),
    blockedOutfits: getBlockedOutfits(category),
  };
}

export function validateExpectedOutfit(expectedOutfit: string): string | null {
  if (!getAllOutfitIds().includes(expectedOutfit)) {
    return '請選擇有效的穿搭。';
  }

  return null;
}

export function getSurpriseCandidates(
  poolOutfits: string[],
  expectedOutfit: string,
): string[] {
  return poolOutfits.filter((id) => id !== expectedOutfit);
}

export function resolveFinalOutfit(params: {
  surpriseMode: SurpriseMode;
  expectedOutfitBeforeAI: string;
  /** @deprecated 請改用 expectedOutfitBeforeAI */
  favoriteOutfitBeforeAI?: string;
  /** @deprecated */
  expectedOutfit?: string;
  allowedOutfits: string[];
  blockedOutfits: string[];
}): {
  finalRecommendedOutfit: string;
  surpriseCandidateOutfits: string[];
} {
  const expectedOutfitBeforeAI =
    params.expectedOutfitBeforeAI || params.favoriteOutfitBeforeAI || params.expectedOutfit || '';
  const { surpriseMode, allowedOutfits, blockedOutfits } = params;

  const expectedError = validateExpectedOutfit(expectedOutfitBeforeAI);
  if (expectedError) {
    throw new Error(expectedError);
  }

  if (surpriseMode === 'no_surprise') {
    return {
      finalRecommendedOutfit: expectedOutfitBeforeAI,
      surpriseCandidateOutfits: [],
    };
  }

  const surpriseCandidateOutfits = getSurpriseCandidates(
    allowedOutfits,
    expectedOutfitBeforeAI,
  );

  if (surpriseCandidateOutfits.length === 0) {
    throw new Error('surprise 模式下沒有可用的推薦候選穿搭。');
  }

  const safeCandidates = surpriseCandidateOutfits.filter(
    (id) => allowedOutfits.includes(id) && !blockedOutfits.includes(id),
  );

  if (safeCandidates.length === 0) {
    throw new Error('surprise 模式下沒有符合 allowedOutfits 的候選穿搭。');
  }

  return {
    finalRecommendedOutfit: '',
    surpriseCandidateOutfits: safeCandidates,
  };
}

export function getRandomSurpriseMode(): SurpriseMode {
  return Math.random() < 0.5 ? 'surprise' : 'no_surprise';
}
