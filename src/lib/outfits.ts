import outfitsData from '../../public/outfits.json';

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
  return category === 'male' ? [...MALE_ALLOWED] : [...FEMALE_ALLOWED];
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

export function validateAcceptableOutfits(
  acceptableOutfits: string[],
  allowedOutfits: string[],
): string | null {
  if (acceptableOutfits.length < 3) {
    return '請至少選擇 3 套你可以接受或願意考慮的穿搭，以便 AI 進行推薦。';
  }

  const invalid = acceptableOutfits.filter((id) => !allowedOutfits.includes(id));
  if (invalid.length > 0) {
    return 'acceptableOutfits 必須全部來自 allowedOutfits。';
  }

  return null;
}

export function validateExpectedOutfit(
  expectedOutfit: string,
  acceptableOutfits: string[],
): string | null {
  if (!acceptableOutfits.includes(expectedOutfit)) {
    return 'expectedOutfit 必須來自 acceptableOutfits。';
  }

  return null;
}

export function getSurpriseCandidates(
  acceptableOutfits: string[],
  expectedOutfit: string,
): string[] {
  return acceptableOutfits.filter((id) => id !== expectedOutfit);
}

export function resolveFinalOutfit(params: {
  surpriseMode: SurpriseMode;
  expectedOutfit: string;
  acceptableOutfits: string[];
  allowedOutfits: string[];
  blockedOutfits: string[];
}): {
  finalRecommendedOutfit: string;
  surpriseCandidateOutfits: string[];
} {
  const { surpriseMode, expectedOutfit, acceptableOutfits, allowedOutfits, blockedOutfits } =
    params;

  const acceptableError = validateAcceptableOutfits(acceptableOutfits, allowedOutfits);
  if (acceptableError) {
    throw new Error(acceptableError);
  }

  const expectedError = validateExpectedOutfit(expectedOutfit, acceptableOutfits);
  if (expectedError) {
    throw new Error(expectedError);
  }

  if (surpriseMode === 'no_surprise') {
    return {
      finalRecommendedOutfit: expectedOutfit,
      surpriseCandidateOutfits: [],
    };
  }

  const surpriseCandidateOutfits = getSurpriseCandidates(acceptableOutfits, expectedOutfit);

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
