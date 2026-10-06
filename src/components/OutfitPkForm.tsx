'use client';

import React, { useMemo, useState } from 'react';
import { getOutfit } from '@/lib/outfits';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import {
  drawTournamentSeeds,
  getTournamentRoundPair,
  PkRoundPlan,
  PkRoundRecord,
} from '@/lib/outfitPk';

interface OutfitPkFormProps {
  favoriteOutfitId: string;
  eligibleOutfitIds: string[];
  onComplete: (pkRounds: PkRoundRecord[]) => void;
}

function PkOutfitCard({
  outfitId,
  selected,
  onSelect,
}: {
  outfitId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const outfit = getOutfit(outfitId);
  const lookNumber = getLookNumberFromOutfitId(outfitId);
  const lookLabel = lookNumber ? getLookLabel(lookNumber) : outfitId;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col items-center rounded-xl border-2 bg-white p-3 text-left transition sm:p-4 ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-blue-300 hover:bg-slate-50'
      }`}
    >
      <p className="text-sm font-bold text-slate-800 sm:text-base">{lookLabel}</p>
      <p className="mt-1 line-clamp-2 text-center text-xs text-slate-600 sm:text-sm">
        {outfit?.outfitName ?? outfitId}
      </p>
      {!imageFailed && outfit?.outfitImage ? (
        <div className="mt-3 flex h-48 w-full items-center justify-center rounded-lg bg-slate-50 p-2 sm:h-56">
          <img
            src={outfit.outfitImage}
            alt={outfit.outfitName}
            onError={() => setImageFailed(true)}
            className="max-h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-3 flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 sm:h-56">
          圖片暫未提供
        </div>
      )}
    </button>
  );
}

const TOTAL_ROUNDS = 5;

export function OutfitPkForm({
  favoriteOutfitId,
  eligibleOutfitIds,
  onComplete,
}: OutfitPkFormProps) {
  const seeds = useMemo(
    () => drawTournamentSeeds(favoriteOutfitId, eligibleOutfitIds),
    [favoriteOutfitId, eligibleOutfitIds],
  );

  const [roundNumber, setRoundNumber] = useState(1);
  const [winnersByRound, setWinnersByRound] = useState<Record<number, string>>({});
  const [records, setRecords] = useState<PkRoundRecord[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [currentPair, setCurrentPair] = useState<PkRoundPlan>(() =>
    getTournamentRoundPair({
      roundNumber: 1,
      seeds,
      favoriteOutfitId,
      winnersByRound: {},
    }),
  );

  const handleNext = () => {
    if (
      !selected ||
      (selected !== currentPair.leftOutfitId && selected !== currentPair.rightOutfitId)
    ) {
      setError('請選擇左邊或右邊其中一套。');
      return;
    }

    const nextRecord: PkRoundRecord = {
      ...currentPair,
      selectedOutfitId: selected,
      winnerOutfitId: selected,
      chosenOutfitId: selected,
      timestamp: new Date().toISOString(),
    };
    const nextRecords = [...records, nextRecord];
    const nextWinners = { ...winnersByRound, [roundNumber]: selected };
    setError('');

    if (roundNumber >= TOTAL_ROUNDS) {
      onComplete(nextRecords);
      return;
    }

    const nextRound = roundNumber + 1;
    const nextPair = getTournamentRoundPair({
      roundNumber: nextRound,
      seeds,
      favoriteOutfitId,
      winnersByRound: nextWinners,
    });

    setRecords(nextRecords);
    setWinnersByRound(nextWinners);
    setRoundNumber(nextRound);
    setCurrentPair(nextPair);
    setSelected('');
  };

  return (
    <div className="mx-auto max-w-5xl rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">前置問題 3</p>
      <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">穿搭照片 PK</h2>
      <p className="mt-2 text-base text-gray-600 sm:text-lg">
        請直覺選擇你比較喜歡的一套。共 {TOTAL_ROUNDS} 輪，目前第 {roundNumber} 輪。
        {roundNumber === 5 ? '（最終輪：你的最愛 vs 晉級挑戰者）' : ''}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <PkOutfitCard
          outfitId={currentPair.leftOutfitId}
          selected={selected === currentPair.leftOutfitId}
          onSelect={() => setSelected(currentPair.leftOutfitId)}
        />
        <PkOutfitCard
          outfitId={currentPair.rightOutfitId}
          selected={selected === currentPair.rightOutfitId}
          onSelect={() => setSelected(currentPair.rightOutfitId)}
        />
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleNext}
        disabled={!selected}
        className="mt-6 w-full rounded-lg bg-slate-800 px-6 py-3 text-lg font-bold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {roundNumber >= TOTAL_ROUNDS ? '完成 PK，進入下一題' : '下一輪'}
      </button>
    </div>
  );
}
