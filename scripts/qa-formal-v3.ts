import assert from 'node:assert/strict';
import { getCondition } from '../src/lib/conditions';
import { getOutfit, resolveFinalOutfit, getOutfitPools } from '../src/lib/outfits';
import { LOOK_RESULT_CONTENT } from '../src/data/lookResultContent';
import {
  QUICK_PREFERENCE_QUESTIONS,
  isSubstantiveQuickValue,
} from '../src/lib/quickPreferences';
import {
  NEED_MISSING,
  buildNeedSummary,
  extractExplicitChatNeeds,
  formatNeedSummary,
  proSummaryCtaMessage,
  proSummaryGateMessage,
} from '../src/lib/needSummary';
import {
  buildResultContent,
  buildResultParagraph,
  buildResultSentences,
  countSentences,
  listLookResultOutfitIds,
} from '../src/lib/resultContent';
import { isResultLayoutSwitchEnabled, resolveResultLayout } from '../src/lib/resultLayout';
import { describeResultPageModules } from '../src/lib/recommendationText';
import { buildFreeChatSystemPrompt } from '../src/lib/botPrompts';
import { generateFreeChatFallbackReply } from '../src/lib/aiResponses';
import {
  emptyChatPreferences,
  extractChatPreferences,
  selectSurpriseOutfitBPlus,
} from '../src/lib/chatPreferences';

function chars(text: string): number {
  return Array.from(text).length;
}

assert.equal(QUICK_PREFERENCE_QUESTIONS.length, 3);
for (const question of QUICK_PREFERENCE_QUESTIONS) {
  assert.ok(question.options.some((option) => option.label === '無特別偏好'));
}
assert.equal(isSubstantiveQuickValue('none'), false);
assert.equal(isSubstantiveQuickValue('no_clear'), false);
assert.equal(isSubstantiveQuickValue('dark'), true);
console.log('PASS quick questions identical and optional');

const nonsense = buildNeedSummary({
  preferenceFormality: 'formal',
  preferenceImpression: 'minimal',
  preferenceColor: 'dark',
  userMessages: ['asdf'],
});
assert.equal(nonsense.formality.value, '偏正式');
assert.equal(nonsense.formality.source, 'quick_preference');
assert.doesNotMatch(formatNeedSummary(nonsense), /Look\s*\d|因為|所以|優點|缺點/);
console.log('PASS summary keeps quick answers and hides recommendation language');

const missing = buildNeedSummary({
  preferenceFormality: '',
  preferenceImpression: '',
  preferenceColor: '',
  userMessages: [],
});
assert.equal(missing.formality.value, NEED_MISSING);
assert.equal(missing.other.value, NEED_MISSING);
console.log('PASS missing fields render 尚未提供');

const weak = extractExplicitChatNeeds(['都可以', '還行', '應該可以吧', '隨便', '我穿都可以', '不知道']);
assert.equal(weak.formality, null);
assert.equal(weak.color, null);
const weakBoard = buildNeedSummary({
  preferenceFormality: 'formal',
  preferenceImpression: 'professional',
  preferenceColor: 'dark',
  userMessages: ['都可以', '還行'],
});
assert.equal(weakBoard.formality.value, '偏正式');
assert.equal(weakBoard.formality.source, 'quick_preference');
console.log('PASS weak statements do not override');

const conflict = buildNeedSummary({
  preferenceFormality: 'formal',
  preferenceImpression: 'professional',
  preferenceColor: 'dark',
  userMessages: ['我想改成淺色系'],
});
assert.equal(conflict.color.value, '淺色系');
assert.equal(conflict.color.source, 'chat');
assert.equal(conflict.formality.source, 'quick_preference');
console.log('PASS newer explicit chat overrides quick color');

const insufficient = buildResultContent({
  outfit: getOutfit('M4')!,
  preferenceFormality: 'none',
  preferenceImpression: 'none',
  preferenceColor: 'none',
  userMessages: ['都可以', '不知道'],
});
assert.ok(insufficient.evidenceItems.every((item) => item.source === 'scenario'));
assert.doesNotMatch(insufficient.userNeed1, /你說|你選擇|你在對話中/);
console.log('PASS insufficient info uses scenario fallback without fake quotes');

const chatNeedMismatch = buildResultContent({
  outfit: getOutfit('M4')!,
  preferenceFormality: 'formal',
  preferenceImpression: 'none',
  preferenceColor: 'dark',
  userMessages: ['我想穿淺色'],
});
assert.doesNotMatch(
  `${chatNeedMismatch.userNeed1}${chatNeedMismatch.userNeed2}`,
  /淺色/,
);
assert.match(`${chatNeedMismatch.userNeed1}${chatNeedMismatch.userNeed2}`, /偏正式|面試需要/);
console.log('PASS EX drops chat evidence that contradicts the final Look');

const chatNeed = buildResultContent({
  outfit: getOutfit('F1')!,
  preferenceFormality: 'none',
  preferenceImpression: 'none',
  preferenceColor: 'none',
  userMessages: ['我想穿淺色'],
});
assert.match(chatNeed.userNeed1, /你在對話中提到希望淺色系/);
assert.equal(chatNeed.evidenceItems[0]?.source, 'chat');
console.log('PASS EX source priority is chat then quick');

assert.equal(listLookResultOutfitIds().length, 12);
for (const copy of Object.values(LOOK_RESULT_CONTENT)) {
  assert.equal(copy.reviewStatus, 'pending_human_review');
  assert.doesNotMatch(copy.caution, /不適合你|不好看|不夠正式/);
  assert.doesNotMatch(`${copy.colorAttribute}${copy.fitAttribute}${copy.styleAttribute}`, /因為|因此|所以/);
}
console.log('PASS 12 look copies are fixed and pending review');

const profiles = [
  {
    name: 'quick',
    preferenceFormality: 'formal' as const,
    preferenceImpression: 'minimal' as const,
    preferenceColor: 'dark' as const,
    userMessages: [] as string[],
  },
  {
    name: 'chat-override',
    preferenceFormality: 'formal' as const,
    preferenceImpression: 'professional' as const,
    preferenceColor: 'dark' as const,
    userMessages: ['我想穿淺色，不要太正式'],
  },
  {
    name: 'none',
    preferenceFormality: 'none' as const,
    preferenceImpression: 'none' as const,
    preferenceColor: 'no_clear' as const,
    userMessages: ['不知道'],
  },
];

for (const outfitId of listLookResultOutfitIds()) {
  const outfit = getOutfit(outfitId);
  assert.ok(outfit, outfitId);
  for (const profile of profiles) {
    const content = buildResultContent({ outfit, ...profile });
    const cells = [
      buildResultParagraph(content, 'high', 'high'),
      buildResultParagraph(content, 'high', 'low'),
      buildResultParagraph(content, 'low', 'high'),
      buildResultParagraph(content, 'low', 'low'),
    ];
    for (const cell of cells) {
      assert.equal(countSentences(cell), 3, `${outfitId} ${profile.name} sentence count\n${cell}`);
    }
    const lengths = cells.map(chars);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    assert.ok(max <= min * 1.1, `${outfitId} ${profile.name} length ${lengths.join(',')}`);

    const sentences = buildResultSentences(content);
    assert.doesNotMatch(sentences.exLow, /因為|因此|所以|考量你/);
    assert.doesNotMatch(sentences.tsLow, /不過|需要留意|缺點|限制/);
    assert.doesNotMatch(sentences.tsHigh, /你選擇|你在對話中|你的需求/);
    assert.doesNotMatch(sentences.tsLow, /你選擇|你在對話中|你的需求/);
    assert.match(sentences.tsHigh, /不過/);
    assert.match(sentences.tsLow, /另外/);
    assert.match(cells[2], new RegExp(content.neutralLookAttribute1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
}
console.log('PASS four EX×TS paragraphs share 3 sentences and ±10% length');

const shared = buildResultContent({
  outfit: getOutfit('F5')!,
  preferenceFormality: 'moderate',
  preferenceImpression: 'approachable',
  preferenceColor: 'light',
  userMessages: [],
});
const highTs = buildResultParagraph(shared, 'high', 'high');
const lowTs = buildResultParagraph(shared, 'high', 'low');
assert.match(highTs, /不過/);
assert.match(lowTs, /另外/);
assert.doesNotMatch(lowTs, /需要注意/);
const lowThird = lowTs.split('。').filter((part) => part.trim())[2] ?? '';
assert.doesNotMatch(lowThird, /不過|需要留意|缺點|限制/);
assert.ok(highTs.includes(shared.positiveA.replace(/。$/, '')));
assert.ok(lowTs.includes(shared.positiveA.replace(/。$/, '')));
console.log('PASS TS high/low share positiveA and diverge on caution vs positiveB');

for (const id of [1, 2, 3, 4]) {
  assert.deepEqual(describeResultPageModules(getCondition(id)!), describeResultPageModules(getCondition(1)!));
}
assert.notDeepEqual(describeResultPageModules(getCondition(1)!), describeResultPageModules(getCondition(5)!));
assert.notDeepEqual(describeResultPageModules(getCondition(1)!), describeResultPageModules(getCondition(9)!));
console.log('PASS result modules ignore AN and PRO');

assert.equal(proSummaryCtaMessage('high').includes('我'), true);
assert.equal(proSummaryCtaMessage('low').includes('我'), false);
assert.doesNotMatch(proSummaryCtaMessage('high'), /我現在主動幫你/);
assert.equal(proSummaryGateMessage('low'), '請先使用『請 AI 整理目前需求』功能確認目前資訊。');
console.log('PASS PRO copy differs by AN form only');

const promptHighEx = buildFreeChatSystemPrompt({ condition: getCondition(1)! });
const promptLowEx = buildFreeChatSystemPrompt({ condition: getCondition(9)! });
assert.equal(promptHighEx.includes('使用者資訊 → 判斷依據'), false);
assert.equal(promptLowEx.includes('使用者資訊 → 判斷依據'), false);
const replyExHigh = generateFreeChatFallbackReply('我希望簡約', getCondition(1)!);
const replyExLow = generateFreeChatFallbackReply('我希望簡約', getCondition(9)!);
assert.equal(replyExHigh, replyExLow);
const replyTsLow = generateFreeChatFallbackReply('我希望簡約', getCondition(5)!);
assert.equal(replyExHigh, replyTsLow);
const replyProLow = generateFreeChatFallbackReply('我希望簡約', getCondition(2)!);
assert.equal(replyExHigh, replyProLow);
assert.doesNotMatch(replyExHigh, /[？?]/);
const promptProLow = buildFreeChatSystemPrompt({ condition: getCondition(2)! });
assert.equal(promptHighEx, promptProLow);
assert.doesNotMatch(promptHighEx, /每輪最多 1 個問題/);
console.log('PASS chat fallback and prompt do not carry EX, TS, or an extra PRO question');

const male = getOutfitPools('male');
const surprise = resolveFinalOutfit({
  surpriseMode: 'surprise',
  expectedOutfitBeforeAI: 'M1',
  allowedOutfits: male.allowedOutfits,
  blockedOutfits: male.blockedOutfits,
});
const preferences = emptyChatPreferences();
const picked = selectSurpriseOutfitBPlus({
  expectedOutfitBeforeAI: 'M1',
  candidates: surprise.surpriseCandidateOutfits,
  preferences,
});
assert.ok(surprise.surpriseCandidateOutfits.includes(picked.finalOutfit));
assert.notEqual(picked.finalOutfit, 'M1');
const sameChatDifferentQuick = extractChatPreferences(['我喜歡淺色']);
const pickedAgain = selectSurpriseOutfitBPlus({
  expectedOutfitBeforeAI: 'M1',
  candidates: surprise.surpriseCandidateOutfits,
  preferences: sameChatDifferentQuick,
});
assert.ok(surprise.surpriseCandidateOutfits.includes(pickedAgain.finalOutfit));
assert.notEqual(pickedAgain.finalOutfit, 'M1');
console.log('PASS surprise selection stays on chat preferences and ignores quick-question fields');

assert.equal(isResultLayoutSwitchEnabled(), false);
assert.equal(resolveResultLayout('paragraph'), 'card');
assert.equal(resolveResultLayout('card'), 'card');
assert.equal(resolveResultLayout(null), 'card');
console.log('PASS production result layout is card-only');

console.log('ALL FORMAL V3 QA PASSED');
