/** Look 1–12 前台顯示 ↔ 後台 outfitId 對應 */

/** Look 1–6 男款 M1–M6；Look 7–12 女款 F1–F6 */
export const LOOK_TO_OUTFIT: Record<number, string> = {
  1: 'M1',
  2: 'M2',
  3: 'M3',
  4: 'M4',
  5: 'M5',
  6: 'M6',
  7: 'F1',
  8: 'F2',
  9: 'F3',
  10: 'F4',
  11: 'F5',
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
