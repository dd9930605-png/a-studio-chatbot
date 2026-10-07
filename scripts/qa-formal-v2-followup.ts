import assert from 'node:assert/strict';
import conditionsData from '../public/conditions.json';
import { getCondition } from '../src/lib/conditions';
import {
  getOutfitPools,
  getOutfit,
  resolveFinalOutfit,
} from '../src/lib/outfits';
import { getAllOutfitIds, getLookNumberFromOutfitId } from '../src/lib/looks';
import {
  drawTournamentSeeds,
  getTournamentRoundPair,
  summarizeTournamentPk,
} from '../src/lib/outfitPk';
import {
  emptyChatPreferences,
  extractChatPreferences,
  formatPreferencesSummary,
  hasExplicitPreferences,
} from '../src/lib/chatPreferences';
import {
  buildRecommendationSections,
  describeResultPageModules,
} from '../src/lib/recommendationText';
import { generateFreeChatFallbackReply } from '../src/lib/aiResponses';
import { buildFreeChatSystemPrompt } from '../src/lib/botPrompts';

const expectedMapping = [
  ['high', 'high', 'high', 'high'],
  ['high', 'high', 'high', 'low'],
  ['high', 'high', 'low', 'high'],
  ['high', 'high', 'low', 'low'],
  ['high', 'low', 'high', 'high'],
  ['high', 'low', 'high', 'low'],
  ['high', 'low', 'low', 'high'],
  ['high', 'low', 'low', 'low'],
  ['low', 'high', 'high', 'high'],
  ['low', 'high', 'high', 'low'],
  ['low', 'high', 'low', 'high'],
  ['low', 'high', 'low', 'low'],
  ['low', 'low', 'high', 'high'],
  ['low', 'low', 'high', 'low'],
  ['low', 'low', 'low', 'high'],
  ['low', 'low', 'low', 'low'],
];

for (const [index, levels] of expectedMapping.entries()) {
  const condition = conditionsData[index];
  assert.equal(condition.conditionId, index + 1);
  assert.deepEqual(
    [
      condition.explainability,
      condition.twoSidedMessage,
      condition.anthropomorphism,
      condition.proactivity,
    ],
    levels,
  );
}
console.log('PASS condition mapping 1–16');

assert.equal(getAllOutfitIds().length, 12);
const male = getOutfitPools('male');
const female = getOutfitPools('female');
assert.deepEqual(male.blockedOutfits.map(getLookNumberFromOutfitId), [11, 12]);
assert.deepEqual(female.blockedOutfits.map(getLookNumberFromOutfitId), [5, 6]);
console.log('PASS visible catalog 12; male/female eligible pools 10');

// Favorite outside male eligible pool: first four rounds stay eligible; final includes Favorite.
const favorite = 'F6'; // Look 12
const seeds = drawTournamentSeeds(favorite, male.allowedOutfits);
assert.ok(seeds.every((id) => male.allowedOutfits.includes(id)));
const winners: Record<number, string> = {};
const records = [];
for (let roundNumber = 1; roundNumber <= 5; roundNumber += 1) {
  const pair = getTournamentRoundPair({
    roundNumber,
    seeds,
    favoriteOutfitId: favorite,
    winnersByRound: winners,
  });
  if (roundNumber <= 4) {
    assert.ok(male.allowedOutfits.includes(pair.leftOutfitId));
    assert.ok(male.allowedOutfits.includes(pair.rightOutfitId));
  } else {
    assert.deepEqual(
      new Set([pair.leftOutfitId, pair.rightOutfitId]),
      new Set([favorite, winners[4]]),
    );
  }
  const winnerOutfitId = pair.leftOutfitId;
  winners[roundNumber] = winnerOutfitId;
  records.push({
    ...pair,
    selectedOutfitId: winnerOutfitId,
    winnerOutfitId,
    chosenOutfitId: winnerOutfitId,
    timestamp: new Date().toISOString(),
  });
}
assert.equal(summarizeTournamentPk(favorite, records).pkFinalChallengerId, winners[4]);
console.log('PASS tournament progression with out-of-pool Favorite only in final');

const maleOutOfPoolPrediction = 'F6';
const noSurprise = resolveFinalOutfit({
  surpriseMode: 'no_surprise',
  expectedOutfitBeforeAI: maleOutOfPoolPrediction,
  allowedOutfits: male.allowedOutfits,
  blockedOutfits: male.blockedOutfits,
});
assert.equal(noSurprise.finalRecommendedOutfit, maleOutOfPoolPrediction);
const surprise = resolveFinalOutfit({
  surpriseMode: 'surprise',
  expectedOutfitBeforeAI: maleOutOfPoolPrediction,
  allowedOutfits: male.allowedOutfits,
  blockedOutfits: male.blockedOutfits,
});
assert.ok(surprise.surpriseCandidateOutfits.every((id) => male.allowedOutfits.includes(id)));
assert.ok(!surprise.surpriseCandidateOutfits.includes(maleOutOfPoolPrediction));
console.log('PASS no_surprise exact prediction; surprise category-eligible');

const noPreferenceCases = ['我穿都可以', '不知道', '算可以吧', '西褲好像還行'];
for (const input of noPreferenceCases) {
  const preferences = extractChatPreferences([input]);
  assert.equal(hasExplicitPreferences(preferences), false, input);
}
const lessFormal = extractChatPreferences(['我不想要太專業']);
assert.equal(lessFormal.wantsFormal, false);
assert.equal(lessFormal.wantsLessFormal, true);
assert.match(formatPreferencesSummary(lessFormal), /不要過度正式/);
console.log('PASS weak/no preference and formal-negation parsing');

const outfit = getOutfit('M4');
assert.ok(outfit);
const formalPrefs = emptyChatPreferences();
formalPrefs.wantsFormal = true;
const lessFormalSections = buildRecommendationSections(
  getCondition(1)!,
  outfit,
  lessFormal,
);
assert.match(lessFormalSections.userNeed ?? '', /不要過度正式/);
assert.doesNotMatch(lessFormalSections.userNeed ?? '', /希望正式、專業感/);
console.log('PASS High EX user-need fidelity');

const resultExpected: Record<number, string[]> = {
  1: ['推薦結果', '你的需求', 'AI 判斷依據', '因此推薦', '搭配優點', '需要注意'],
  5: ['推薦結果', '你的需求', 'AI 判斷依據', '因此推薦', '搭配優點'],
  9: ['推薦結果', '推薦說明', '搭配優點', '需要注意'],
  13: ['推薦結果', '推薦說明', '搭配優點'],
};
for (const [idText, modules] of Object.entries(resultExpected)) {
  assert.deepEqual(describeResultPageModules(getCondition(Number(idText))!), modules);
}
assert.deepEqual(describeResultPageModules(getCondition(1)!), describeResultPageModules(getCondition(2)!));
assert.deepEqual(describeResultPageModules(getCondition(1)!), describeResultPageModules(getCondition(3)!));
console.log('PASS result-page EX×TS matrix and AN/PRO isolation');

const userInput = '我希望簡約，但不要穿得太拘謹';
const pairs: Array<[number, number, string]> = [
  [1, 9, 'EX'],
  [1, 5, 'TS'],
  [1, 3, 'AN'],
  [1, 2, 'PRO'],
];
for (const [a, b, factor] of pairs) {
  const aReply = generateFreeChatFallbackReply(userInput, getCondition(a)!);
  const bReply = generateFreeChatFallbackReply(userInput, getCondition(b)!);
  assert.notEqual(aReply, bReply, `${factor} fallback output`);
  console.log(`${factor} ${a}/${b}`, { aReply, bReply });
}

const prompt1 = buildFreeChatSystemPrompt({ condition: getCondition(1)! });
const prompt9 = buildFreeChatSystemPrompt({ condition: getCondition(9)! });
assert.match(prompt1, /使用者資訊 → 判斷依據 → 建議／推薦/);
assert.match(prompt9, /不要完整呈現/);
assert.match(buildFreeChatSystemPrompt({ condition: getCondition(5)! }), /僅呈現正面/);
assert.match(buildFreeChatSystemPrompt({ condition: getCondition(3)! }), /不要使用第一人稱/);
assert.match(buildFreeChatSystemPrompt({ condition: getCondition(2)! }), /回覆中出現追問／問號/);
console.log('PASS prompt-level one-factor rules');

console.log('ALL FORMAL V2 FOLLOW-UP QA PASSED');
