import assert from 'node:assert/strict';
import { generateFreeChatFallbackReply } from '../src/lib/aiResponses';
import { buildFreeChatSystemPrompt } from '../src/lib/botPrompts';
import { extractChatPreferences } from '../src/lib/chatPreferences';
import { conditions, getCondition } from '../src/lib/conditions';
import { ExperimentChatContext, buildExperimentKnowledgeBlock } from '../src/lib/experimentKnowledge';
import { LOW_AN_BANNED_PHRASES, LOW_AN_WORDING_SWAPS } from '../src/lib/manipulationScaleRules';

const highIds = conditions.filter((c) => c.anthropomorphism === 'high').map((c) => c.conditionId);
const lowIds = conditions.filter((c) => c.anthropomorphism === 'low').map((c) => c.conditionId);
assert.deepEqual(highIds, [1, 2, 5, 6, 9, 10, 13, 14]);
assert.deepEqual(lowIds, [3, 4, 7, 8, 11, 12, 15, 16]);

const contexts: Array<{ name: string; context: ExperimentChatContext }> = [
  {
    name: 'surprise, final chosen',
    context: {
      selectedOutfitCategory: 'female',
      allowedOutfits: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
      expectedOutfitBeforeAI: 'F1',
      finalRecommendedOutfit: 'F3',
      surpriseMode: 'surprise',
      chatPreferences: extractChatPreferences(['我面試會緊張']),
    },
  },
  {
    name: 'surprise, final pending',
    context: {
      selectedOutfitCategory: 'female',
      allowedOutfits: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
      expectedOutfitBeforeAI: 'F1',
      finalRecommendedOutfit: '',
      surpriseMode: 'surprise',
      chatPreferences: extractChatPreferences(['我不喜歡深色', '我想穿裙子，不要太正式']),
    },
  },
  {
    name: 'no_surprise',
    context: {
      selectedOutfitCategory: 'male',
      allowedOutfits: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
      expectedOutfitBeforeAI: 'M2',
      finalRecommendedOutfit: 'M2',
      surpriseMode: 'no_surprise',
      chatPreferences: extractChatPreferences(['我想穿深色', '褲子寬鬆一點']),
    },
  },
];

function promptFor(conditionId: number, context: ExperimentChatContext): string {
  const condition = getCondition(conditionId)!;
  return buildFreeChatSystemPrompt({
    condition,
    experimentKnowledge: buildExperimentKnowledgeBlock(context, condition),
  });
}

/** 把擬人化專屬的段落換成固定標記，用來比對其餘內容是否相同。 */
function stripAnthropomorphismSections(prompt: string): string {
  return prompt
    .replace(/^你是「[^」]+」，A\.STUDIO 線上韓系服飾網站的[^，]+，/, '你是〈AN〉，')
    .replace(/- 你是面試穿搭(顧問|推薦工具)，不是一般 ChatGPT/, '- 你是〈AN〉，不是一般 ChatGPT')
    .replace(/### 擬人化：[\s\S]*?(?=\n### 回應主動性)/, '〈AN rules〉\n')
    .replace(/### 離題對話處理[\s\S]*?(?=\n### 正交約束)/, '〈AN off-topic〉\n')
    .replace(/- AN (HIGH|LOW)：.*/, '- 〈AN self-check〉');
}

function revertLowWording(prompt: string): string {
  return LOW_AN_WORDING_SWAPS.reduce((text, [from, to]) => text.split(to).join(from), prompt);
}

const swapSeen: Record<string, boolean> = {};
for (const [from] of LOW_AN_WORDING_SWAPS) swapSeen[from] = false;

for (const { name, context } of contexts) {
  const high = promptFor(1, context);
  const low = promptFor(3, context);

  for (const id of highIds) {
    assert.equal(promptFor(id, context), high, `high prompt must not vary by EX/TS/PRO (${name}, c${id})`);
  }
  for (const id of lowIds) {
    assert.equal(promptFor(id, context), low, `low prompt must not vary by EX/TS/PRO (${name}, c${id})`);
  }

  for (const [from, to] of LOW_AN_WORDING_SWAPS) {
    if (high.includes(from)) {
      swapSeen[from] = true;
      assert.ok(low.includes(to), `low prompt should carry the neutral wording (${name}): ${to}`);
    }
    assert.ok(!low.includes(from), `low prompt still carries the tone wording (${name}): ${from}`);
    assert.ok(!high.includes(to), `high prompt must keep its original wording (${name}): ${to}`);
  }

  assert.equal(
    stripAnthropomorphismSections(revertLowWording(low)),
    stripAnthropomorphismSections(high),
    `outside the anthropomorphism sections, high and low prompts must carry the same rules (${name})`,
  );

  for (const leftover of ['先簡短同理', '先同理', '陪聊', '自然帶出', '句型可以固定、公式化']) {
    assert.ok(!low.includes(leftover), `low prompt should not instruct: ${leftover} (${name})`);
  }
}

for (const [from] of LOW_AN_WORDING_SWAPS) {
  assert.ok(swapSeen[from], `wording swap no longer matches the shared prompt text: ${from}`);
}
console.log(`PASS ${LOW_AN_WORDING_SWAPS.length} tone swaps apply to low only; other rules identical`);

const lowPrompt = promptFor(3, contexts[0].context);
const highPrompt = promptFor(1, contexts[0].context);
assert.match(lowPrompt, /不要使用第一人稱/);
assert.match(lowPrompt, /不同理、不安慰、不鼓勵/);
assert.match(lowPrompt, /不要變成固定表單/);
assert.match(lowPrompt, /自然語言理解與多輪對話能力必須與高擬人化相同/);
assert.match(lowPrompt, /提問的時機與次數必須與高擬人化相同/);
assert.ok(
  lowPrompt.includes(
    '目前尚未確認穿搭需求。請選擇希望呈現的面試形象，例如專業穩重、親和自然或俐落自信。',
  ),
);
for (const phrase of LOW_AN_BANNED_PHRASES) {
  assert.ok(lowPrompt.includes(`「${phrase}」`), `banned phrase missing from low prompt: ${phrase}`);
}
assert.doesNotMatch(highPrompt, /禁用人際互動用語/);
console.log('PASS low prompt carries the tool-voice rules; high prompt does not');

const EMOJI = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;
const PARTICLES = /[～~]|[喔呢啦耶囉嘛]([，。！？]|$)/;
const fallbackInputs = [
  '我面試會緊張，想穿深色',
  '我希望看起來專業但不要太嚴肅',
  '褲子想要寬鬆一點',
  '我想要項鍊',
  '我喜歡賽車風',
  '我喜歡綠色',
  '晚餐吃麥當勞',
  '還行',
  '都可以',
  '沒有其他偏好',
];
for (const input of fallbackInputs) {
  const reply = generateFreeChatFallbackReply(input, getCondition(3)!);
  const outsideQuotes = reply.replace(/「[^」]*」/g, '');
  assert.doesNotMatch(outsideQuotes, /我/, `low fallback uses first person: ${reply}`);
  assert.doesNotMatch(reply, EMOJI, `low fallback uses emoji: ${reply}`);
  assert.doesNotMatch(outsideQuotes, PARTICLES, `low fallback uses a particle: ${reply}`);
  for (const phrase of LOW_AN_BANNED_PHRASES) {
    assert.ok(!outsideQuotes.includes(phrase), `low fallback uses 「${phrase}」: ${reply}`);
  }
}
console.log(`PASS ${fallbackInputs.length} low fallback replies stay in tool voice`);
console.log('ALL AN LOW LANGUAGE QA PASSED');
