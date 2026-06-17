/** Look 1–12 前台顯示 ↔ 後台 outfitId 對應 */

export const LOOK_TO_OUTFIT: Record<number, string> = {
  1: 'M1',
  2: 'F1',
  3: 'M2',
  4: 'F2',
  5: 'M3',
  6: 'F3',
  7: 'M4',
  8: 'F4',
  9: 'M5',
  10: 'F5',
  11: 'M6',
  12: 'F6',
};

export const OUTFIT_TO_LOOK: Record<string, number> = Object.fromEntries(
  Object.entries(LOOK_TO_OUTFIT).map(([look, id]) => [id, Number(look)]),
) as Record<string, number>;

export const ALL_LOOK_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export function getLookLabel(lookNumber: number): string {
  return `Look ${lookNumber}`;
}

export function getOutfitIdFromLook(lookNumber: number): string | undefined {
  return LOOK_TO_OUTFIT[lookNumber];
}

export function getLookNumberFromOutfitId(outfitId: string): number | undefined {
  return OUTFIT_TO_LOOK[outfitId];
}

export function outfitIdsToLookLabels(outfitIds: string[]): string[] {
  return sortOutfitIdsByLook(outfitIds)
    .map((id) => {
      const n = getLookNumberFromOutfitId(id);
      return n ? getLookLabel(n) : id;
    });
}

/** 依 Look 1–12 數字順序排列 outfitId */
export function sortOutfitIdsByLook(outfitIds: string[]): string[] {
  return [...outfitIds].sort((a, b) => {
    const lookA = getLookNumberFromOutfitId(a) ?? 999;
    const lookB = getLookNumberFromOutfitId(b) ?? 999;
    return lookA - lookB;
  });
}
