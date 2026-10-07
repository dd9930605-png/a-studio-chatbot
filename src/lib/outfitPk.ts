import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';

export interface PkRoundPlan {
  round: number;
  roundNumber: number;
  leftOutfitId: string;
  rightOutfitId: string;
}

export interface PkRoundRecord extends PkRoundPlan {
  /** 受試者點選 */
  selectedOutfitId: string;
  /** 與 selectedOutfitId 相同（二選一勝出） */
  winnerOutfitId: string;
  /** @deprecated 相容欄位，等同 selectedOutfitId */
  chosenOutfitId: string;
  timestamp: string;
}

export interface PkTournamentSummary {
  favoriteOutfitId: string;
  pkFinalChallengerId: string;
  pkFinalWinnerId: string;
  favoriteRetainedInFinalPK: boolean;
  favoritePkWins: number;
  favoritePkAppearances: number;
  pkConsistencyWithFavorite: number | null;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function randomizeSides(a: string, b: string): { leftOutfitId: string; rightOutfitId: string } {
  if (Math.random() < 0.5) {
    return { leftOutfitId: a, rightOutfitId: b };
  }
  return { leftOutfitId: b, rightOutfitId: a };
}

/**
 * 從 eligible pool 排除 Favorite 後，隨機抽 5 個不重複 Challenger seeds：A–E。
 */
export function drawTournamentSeeds(
  favoriteOutfitId: string,
  eligiblePool: string[],
): [string, string, string, string, string] {
  // Favorite 題可從完整 12 套選擇；前四輪 seeds 僅來自 category eligible pool。
  // 若 Favorite 本身不在 eligible pool，仍只在最終輪以 Favorite 身分出現。
  const others = eligiblePool.filter((id) => id !== favoriteOutfitId);
  if (others.length < 5) {
    throw new Error('eligible pool 不足以抽出 5 個 PK challenger');
  }

  const picked = shuffleInPlace([...others]).slice(0, 5);
  return [picked[0], picked[1], picked[2], picked[3], picked[4]];
}

/**
 * 晉級制 5 輪：
 * R1 A vs B → W1
 * R2 C vs D → W2
 * R3 W1 vs W2 → W3
 * R4 W3 vs E → Challenger
 * R5 Favorite vs Challenger → Final
 *
 * 後輪依前輪 winner 決定；最後一輪不得加入未參賽的新 Look。
 */
export function getTournamentRoundPair(params: {
  roundNumber: number;
  seeds: [string, string, string, string, string];
  favoriteOutfitId: string;
  winnersByRound: Record<number, string>;
}): PkRoundPlan {
  const { roundNumber, seeds, favoriteOutfitId, winnersByRound } = params;
  const [a, b, c, d, e] = seeds;

  let pair: { leftOutfitId: string; rightOutfitId: string };

  switch (roundNumber) {
    case 1:
      pair = randomizeSides(a, b);
      break;
    case 2:
      pair = randomizeSides(c, d);
      break;
    case 3: {
      const w1 = winnersByRound[1];
      const w2 = winnersByRound[2];
      if (!w1 || !w2) throw new Error('Round 3 需要 Round 1/2 的勝者');
      pair = randomizeSides(w1, w2);
      break;
    }
    case 4: {
      const w3 = winnersByRound[3];
      if (!w3) throw new Error('Round 4 需要 Round 3 的勝者');
      pair = randomizeSides(w3, e);
      break;
    }
    case 5: {
      const challenger = winnersByRound[4];
      if (!challenger) throw new Error('Round 5 需要 Round 4 的 Challenger');
      pair = randomizeSides(favoriteOutfitId, challenger);
      break;
    }
    default:
      throw new Error(`不支援的 PK round: ${roundNumber}`);
  }

  return {
    round: roundNumber,
    roundNumber,
    leftOutfitId: pair.leftOutfitId,
    rightOutfitId: pair.rightOutfitId,
  };
}

export function summarizeTournamentPk(
  favoriteOutfitId: string,
  pkRounds: PkRoundRecord[],
): PkTournamentSummary {
  const finalRound = pkRounds.find((round) => round.roundNumber === 5 || round.round === 5);
  const challengerRound = pkRounds.find((round) => round.roundNumber === 4 || round.round === 4);

  const pkFinalChallengerId =
    challengerRound?.winnerOutfitId ||
    challengerRound?.selectedOutfitId ||
    challengerRound?.chosenOutfitId ||
    '';
  const pkFinalWinnerId =
    finalRound?.winnerOutfitId || finalRound?.selectedOutfitId || finalRound?.chosenOutfitId || '';

  let favoritePkAppearances = 0;
  let favoritePkWins = 0;
  for (const round of pkRounds) {
    const appears =
      round.leftOutfitId === favoriteOutfitId || round.rightOutfitId === favoriteOutfitId;
    if (!appears) continue;
    favoritePkAppearances += 1;
    const winner = round.winnerOutfitId || round.selectedOutfitId || round.chosenOutfitId;
    if (winner === favoriteOutfitId) favoritePkWins += 1;
  }

  return {
    favoriteOutfitId,
    pkFinalChallengerId,
    pkFinalWinnerId,
    favoriteRetainedInFinalPK: pkFinalWinnerId === favoriteOutfitId,
    favoritePkAppearances,
    favoritePkWins,
    pkConsistencyWithFavorite:
      favoritePkAppearances > 0 ? favoritePkWins / favoritePkAppearances : null,
  };
}

/** @deprecated 保留給舊呼叫；正式流程請用 tournament API */
export function buildPhotoPkRounds(
  favoriteOutfitId: string,
  eligiblePool?: string[],
): PkRoundPlan[] {
  const pool = eligiblePool && eligiblePool.length > 0 ? eligiblePool : [favoriteOutfitId];
  const seeds = drawTournamentSeeds(favoriteOutfitId, pool);
  // 僅能預建前兩輪；其餘需 winner。此函式僅供相容／測試抽 seeds 用。
  return [
    getTournamentRoundPair({
      roundNumber: 1,
      seeds,
      favoriteOutfitId,
      winnersByRound: {},
    }),
    getTournamentRoundPair({
      roundNumber: 2,
      seeds,
      favoriteOutfitId,
      winnersByRound: {},
    }),
  ];
}

export function summarizePkAgainstFavorite(
  favoriteOutfitId: string,
  pkRounds: PkRoundRecord[],
): {
  favoritePkAppearances: number;
  favoritePkWins: number;
  pkConsistencyWithFavorite: number | null;
} {
  const summary = summarizeTournamentPk(favoriteOutfitId, pkRounds);
  return {
    favoritePkAppearances: summary.favoritePkAppearances,
    favoritePkWins: summary.favoritePkWins,
    pkConsistencyWithFavorite: summary.pkConsistencyWithFavorite,
  };
}

export function describeLook(outfitId: string): string {
  const lookNumber = getLookNumberFromOutfitId(outfitId);
  return lookNumber ? getLookLabel(lookNumber) : outfitId;
}
