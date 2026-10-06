import { getAllOutfitIds } from '@/lib/looks';

export interface PkRoundPlan {
  round: number;
  leftOutfitId: string;
  rightOutfitId: string;
}

export interface PkRoundRecord extends PkRoundPlan {
  chosenOutfitId: string;
  timestamp: string;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

function randomOther(all: string[], exclude: string, alsoAvoid?: string): string {
  const pool = all.filter((id) => id !== exclude && id !== alsoAvoid);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 建立 5 輪 PK：
 * - 3 輪：favorite vs 隨機其他
 * - 2 輪：隨機 vs 隨機
 * - favorite 左右位置隨機
 * - 避免完全相同 pair 重複
 */
export function buildPhotoPkRounds(favoriteOutfitId: string): PkRoundPlan[] {
  const all = getAllOutfitIds();
  if (!all.includes(favoriteOutfitId)) {
    throw new Error('favoriteOutfitId 不在 12 套穿搭中');
  }

  const usedPairs = new Set<string>();
  const rounds: PkRoundPlan[] = [];

  const favoriteRoundSlots = shuffleInPlace([0, 1, 2, 3, 4]).slice(0, 3);

  for (let round = 1; round <= 5; round += 1) {
    const isFavoriteRound = favoriteRoundSlots.includes(round - 1);
    let left = '';
    let right = '';
    let attempts = 0;

    while (attempts < 40) {
      attempts += 1;
      if (isFavoriteRound) {
        const other = randomOther(all, favoriteOutfitId);
        if (Math.random() < 0.5) {
          left = favoriteOutfitId;
          right = other;
        } else {
          left = other;
          right = favoriteOutfitId;
        }
      } else {
        const first = all[Math.floor(Math.random() * all.length)];
        const second = randomOther(all, first);
        if (Math.random() < 0.5) {
          left = first;
          right = second;
        } else {
          left = second;
          right = first;
        }
      }

      const key = pairKey(left, right);
      if (!usedPairs.has(key) && left !== right) {
        usedPairs.add(key);
        break;
      }
    }

    rounds.push({ round, leftOutfitId: left, rightOutfitId: right });
  }

  return rounds;
}

export function summarizePkAgainstFavorite(
  favoriteOutfitId: string,
  pkRounds: PkRoundRecord[],
): {
  favoritePkAppearances: number;
  favoritePkWins: number;
  pkConsistencyWithFavorite: number | null;
} {
  let favoritePkAppearances = 0;
  let favoritePkWins = 0;

  for (const round of pkRounds) {
    const appears =
      round.leftOutfitId === favoriteOutfitId || round.rightOutfitId === favoriteOutfitId;
    if (!appears) continue;
    favoritePkAppearances += 1;
    if (round.chosenOutfitId === favoriteOutfitId) {
      favoritePkWins += 1;
    }
  }

  return {
    favoritePkAppearances,
    favoritePkWins,
    pkConsistencyWithFavorite:
      favoritePkAppearances > 0 ? favoritePkWins / favoritePkAppearances : null,
  };
}
