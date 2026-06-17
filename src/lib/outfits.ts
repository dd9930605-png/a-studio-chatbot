import outfitsData from '../../public/outfits.json';
import { sortOutfitIdsByLook } from '@/lib/looks';

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

export function validateExpectedOutfit(
  expectedOutfit: string,
  allowedOutfits: string[],
): string | null {
  if (!allowedOutfits.includes(expectedOutfit)) {
    return 'expectedOutfit 必須來自 allowedOutfits。';
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
  expectedOutfit: string;
  allowedOutfits: string[];
  blockedOutfits: string[];
}): {
  finalRecommendedOutfit: string;
  surpriseCandidateOutfits: string[];
} {
  const { surpriseMode, expectedOutfit, allowedOutfits, blockedOutfits } = params;

  const expectedError = validateExpectedOutfit(expectedOutfit, allowedOutfits);
  if (expectedError) {
    throw new Error(expectedError);
  }

  if (surpriseMode === 'no_surprise') {
    return {
      finalRecommendedOutfit: expectedOutfit,
      surpriseCandidateOutfits: [],
    };
  }

  const surpriseCandidateOutfits = getSurpriseCandidates(allowedOutfits, expectedOutfit);

  if (surpriseCandidateOutfits.length === 0) {
    throw new Error('surprise 模式下沒有可用的推薦候選穿搭。');
  }

  const safeCandidates = surpriseCandidateOutfits.filter(
    (id) => allowedOutfits.includes(id) && !blockedOutfits.includes(id),
  );

  if (safeCandidates.length === 0) {
    throw new Error('surprise 模式下沒有符合 allowedOutfits 的候選穿搭。');
  }

  const index = Math.floor(Math.random() * safeCandidates.length);
  return {
    finalRecommendedOutfit: safeCandidates[index],
    surpriseCandidateOutfits: safeCandidates,
  };
}

export function getRandomSurpriseMode(): SurpriseMode {
  return Math.random() < 0.5 ? 'surprise' : 'no_surprise';
}
