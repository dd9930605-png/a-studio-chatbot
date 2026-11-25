import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { NextRequest } from 'next/server';
import { generateFreeChatFallbackReply } from '../src/lib/aiResponses';
import {
  CATALOG_COLOR_SUMMARY,
  CatalogCorrectionRule,
  catalogColorListReply,
  catalogCorrectionReply,
  detectFalseUnavailableCatalogClaim,
} from '../src/lib/catalogBoundaries';
import { conditions, getCondition } from '../src/lib/conditions';
import { ChatMessage, initializeParticipantData } from '../src/lib/dataRecorder';
import { flattenParticipantForExport, getExportColumns } from '../src/lib/exportParticipants';
import { LOW_AN_BANNED_PHRASES } from '../src/lib/manipulationScaleRules';
import { ReplySource, resolveReplySource, summarizeReplySources } from '../src/lib/replySource';

/* ---------- 1. 庫存檢查：誤判與應判 ---------- */

const mustKeep: Array<[user: string, reply: string]> = [
  ['我喜歡深色', '好的，如果沒有其他偏好，深色系會是穩重的方向。'],
  ['我喜歡淺色', '淺色系有白色、米白、淺藍，沒有粉色。'],
  ['我想穿深色', '深色系有黑色、深灰、深藍、深棕。網站沒有紫色或綠色單品。'],
  ['我想穿裙子', '有及膝裙可以選；迷你裙和長裙目前沒有。'],
  ['我想穿裙子', '本網站沒有迷你裙，但有及膝裙。'],
  ['有深色的裙子嗎', '目前沒有深色的裙子，及膝裙是淺色系。'],
  ['我喜歡深色', '深色這個方向我記下來囉，沒有問題～'],
  ['我喜歡深色', '已納入條件：深色系。目前沒有其他需要確認的項目。'],
  ['我想穿深色，可是衣櫃裡沒有', '你手邊沒有深色的衣服也沒關係，網站上有黑色和深藍的搭配。'],
  ['我喜歡咖啡色', '咖啡色很有質感呢！沒有太多限制的話，可以搭配米白。'],
  ['我喜歡棕色', '並不是沒有棕色，本網站有深棕西褲。'],
  ['我喜歡深色', '深色系沒有紫色，但有黑色、深灰、深藍。'],
  ['我喜歡淺色的衣服', '淺色系單品包含白色、米白、淺藍。請問還有沒有其他偏好？'],
  ['我不喜歡深色', '了解，那就優先看沒有深色的搭配。'],
  ['我不要裙子', '好的，會改看沒有裙子的方案。'],
  ['有綠色嗎，不然深色也行', '本網站目前沒有綠色單品。深色系有黑色、深灰、深藍、深棕。'],
  ['我想要淺色', '淺色的方向沒有問題，白色與米白都有。'],
  ['我喜歡咖啡色的外套', '網站沒有紅色、粉色，咖啡色外搭則有現貨。'],
  ['裙子可以嗎', '可以，裙子沒有正式度不足的問題。'],
  ['我喜歡深色', '您沒有深色的偏好限制嗎？'],
  ['深色的領帶有嗎', '領帶目前沒有深色的。'],
  ['我喜歡咖啡色', '咖啡色我們有喔！不過沒有純咖啡色的西裝外套。'],
  ['我喜歡棕色', '我們沒有棕色以外的暖色系。'],
  ['我喜歡淺色', '淺色我們沒有很多，但有白色跟米白。'],
  ['我喜歡深色', '除了黑色，沒有其他深色的款式。'],
  ['我喜歡深色', '沒有比深色更穩重的選擇了。'],
  ['我喜歡棕色', '棕色沒有黑色那麼正式。'],
  ['我喜歡棕色', '沒有棕色的話，深藍也不錯。'],
  ['我想穿裙子', '目前沒有深色系的及膝裙。'],
  ['我喜歡深色，也想穿裙子', '沒有深色和裙子的組合。'],
  ['我想穿深色', '深色，沒有問題喔。'],
  ['我喜歡淺色', '本網站沒有淺色的牛仔褲。'],
  ['我想穿裙子', '裙子的部分我們只有及膝裙，沒有其他長度喔。'],
  ['我喜歡深色', '你擔心沒有深色嗎？其實有黑色、深灰、深藍。'],
];

const mustCorrect: Array<[user: string, reply: string, rule: CatalogCorrectionRule]> = [
  ['我喜歡棕色', '很抱歉，本網站目前沒有棕色的單品。', 'brown'],
  ['我喜歡咖啡色', '目前網站沒有提供咖啡色喔，要不要看看深藍？', 'brown'],
  ['有深棕的嗎', '本網站沒有紅色、深棕等選項。', 'brown'],
  ['我想找咖啡色', '咖啡色的話，目前沒有喔。', 'brown'],
  ['我喜歡棕色', '棕色單品本網站目前沒有提供。', 'brown'],
  ['我喜歡棕色', '很抱歉告訴你，目前沒有棕色。', 'brown'],
  ['我喜歡棕色', '要跟你說一聲目前沒有棕色喔。', 'brown'],
  ['有咖啡色嗎', '現有色系不包含咖啡色。', 'brown'],
  ['我想穿裙子', '本網站沒有裙子，可以考慮寬褲。', 'skirt'],
  ['有裙子嗎', '目前沒有裙裝的選項。', 'skirt'],
  ['我想穿裙子', '裙子目前沒有，建議改看西褲。', 'skirt'],
  ['我想穿及膝裙', '本網站沒有及膝裙。', 'skirt'],
  ['我想要淺色', '網站目前沒有淺色系的單品。', 'light'],
  ['我想要淺色', '淺色系目前沒有庫存。', 'light'],
  ['我喜歡深色', '本網站並無深色系商品。', 'dark'],
  ['我喜歡深色', '你想要的深色，本網站沒有。', 'dark'],
  ['我喜歡深色', '不好意思，目前沒有深色或黑色的穿搭喔！', 'dark'],
  ['我喜歡深色', '深色系目前無庫存。', 'dark'],
  ['我喜歡深色', '查無深色系商品。', 'dark'],
  ['我喜歡深色', '本網站沒有深色。', 'dark'],
];

for (const [user, reply] of mustKeep) {
  assert.equal(
    detectFalseUnavailableCatalogClaim(reply, user),
    null,
    `correct reply must not be replaced: ${user} → ${reply}`,
  );
}
for (const [user, reply, rule] of mustCorrect) {
  assert.equal(
    detectFalseUnavailableCatalogClaim(reply, user),
    rule,
    `false "not in stock" claim must be caught: ${user} → ${reply}`,
  );
}
console.log(
  `PASS catalog check keeps ${mustKeep.length} correct replies and catches ${mustCorrect.length} false claims`,
);

/* ---------- 2. 固定回覆的高低擬人化措辭 ---------- */

const EMOJI = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;
const PARTICLES = /[～~喔呢啦耶囉嘛吧]/;
const RULES: CatalogCorrectionRule[] = ['brown', 'skirt', 'light', 'dark'];
/** 每條規則高低兩版都必須帶到的商品資訊。 */
const RULE_FACTS: Record<CatalogCorrectionRule, string[]> = {
  brown: ['咖啡色', '深棕', '棕色', '穩重', '柔和'],
  skirt: ['及膝裙', '裙裝方案', '專業俐落', '柔和親和'],
  light: ['淺色系', '白色', '米白', '淺藍'],
  dark: ['深色系', '黑色', '深灰', '深藍', '深棕'],
};

function assertLowVoice(text: string, label: string): void {
  assert.doesNotMatch(text, /我|你|您/, `${label} (low) must not use personal pronouns: ${text}`);
  assert.doesNotMatch(text, EMOJI, `${label} (low) must not use emoji: ${text}`);
  assert.doesNotMatch(text, PARTICLES, `${label} (low) must not use particles: ${text}`);
  assert.doesNotMatch(text, /[！!]/, `${label} (low) must not use exclamation marks: ${text}`);
  for (const phrase of LOW_AN_BANNED_PHRASES) {
    assert.ok(!text.includes(phrase), `${label} (low) uses 「${phrase}」: ${text}`);
  }
}

function assertHighVoice(text: string, label: string): void {
  assert.match(text, /我/, `${label} (high) should speak in first person: ${text}`);
  assert.doesNotMatch(text, /您|本網站|已納入條件/, `${label} (high) reads like the tool voice: ${text}`);
  assert.match(text, PARTICLES, `${label} (high) should sound conversational: ${text}`);
}

for (const rule of RULES) {
  const high = catalogCorrectionReply(rule, 'high');
  const low = catalogCorrectionReply(rule, 'low');
  assert.notEqual(high, low);
  assertHighVoice(high, `correction:${rule}`);
  assertLowVoice(low, `correction:${rule}`);
  for (const fact of RULE_FACTS[rule]) {
    assert.ok(high.includes(fact), `correction:${rule} (high) lost 「${fact}」`);
    assert.ok(low.includes(fact), `correction:${rule} (low) lost 「${fact}」`);
  }
  const asksHigh = /[？?]/.test(high);
  const asksLow = /請選擇/.test(low);
  assert.equal(asksHigh, asksLow, `correction:${rule} must ask in both versions or in neither`);
}

const colorHigh = catalogColorListReply('high');
const colorLow = catalogColorListReply('low');
assert.notEqual(colorHigh, colorLow);
assertHighVoice(colorHigh, 'color list');
assertLowVoice(colorLow, 'color list');
for (const text of [colorHigh, colorLow]) {
  assert.ok(text.includes(CATALOG_COLOR_SUMMARY), 'color list must carry every catalog colour');
  assert.ok(text.includes('12 套'));
}
console.log('PASS fixed replies: same catalog facts, Emma voice for high, tool voice for low');

/* ---------- 3. 程式產生的回覆不會被自己的庫存檢查換掉 ---------- */

const probeInputs = [
  '我喜歡深色',
  '我喜歡淺色',
  '我喜歡棕色',
  '我喜歡咖啡色',
  '我想穿裙子',
  '有哪些顏色，我喜歡深色',
  '我喜歡綠色和棕色',
  '我不喜歡深色，想穿裙子',
];
for (const level of ['high', 'low'] as const) {
  const condition = getCondition(level === 'high' ? 1 : 3)!;
  for (const input of probeInputs) {
    const programReplies = [
      generateFreeChatFallbackReply(input, condition),
      catalogColorListReply(level),
      ...RULES.map((rule) => catalogCorrectionReply(rule, level)),
    ];
    for (const reply of programReplies) {
      assert.equal(
        detectFalseUnavailableCatalogClaim(reply, input),
        null,
        `program reply flagged by the catalog check (${level}): ${input} → ${reply}`,
      );
    }
  }
}
console.log('PASS program-generated replies are never flagged by the catalog check');

/* ---------- 4. /api/chat：每條路徑回報的來源 ---------- */

type Scripted = { status: number; body: string };
let scripted: Scripted = { status: 200, body: '' };
let modelCalls = 0;
let lastRequest: { model?: string; temperature?: number; messages?: Array<{ role: string; content: string }> } = {};

function completion(content: string): Scripted {
  return {
    status: 200,
    body: JSON.stringify({
      id: 'chatcmpl-qa',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4o-mini',
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    }),
  };
}

function modelReply(reply: string): Scripted {
  return completion(JSON.stringify({ relevant: true, reply }));
}

interface ChatResult {
  reply: string;
  source: 'openai' | 'fallback';
  replySource: ReplySource;
  catalogCorrectionRule?: CatalogCorrectionRule;
  replacedReply?: string;
  replacedReplySource?: ReplySource;
}

async function main(): Promise<void> {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      modelCalls += 1;
      lastRequest = JSON.parse(raw);
      res.writeHead(scripted.status, { 'Content-Type': 'application/json' });
      res.end(scripted.body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;
  delete process.env.OPENAI_MODEL;

  const { POST } = await import('../src/app/api/chat/route');

  async function chat(conditionId: number, userInput: string): Promise<ChatResult> {
    const condition = getCondition(conditionId)!;
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        step: 'freeChat',
        question: 'free_chat',
        userInput,
        conversationHistory: [],
        condition,
      }),
    });
    const response = await POST(request);
    assert.equal(response.status, 200);
    return (await response.json()) as ChatResult;
  }

  try {
    const HIGH = 1;
    const LOW = 3;

    process.env.OPENAI_API_KEY = 'qa-key';

    for (const id of [HIGH, LOW]) {
      const level = getCondition(id)!.anthropomorphism;
      const text = level === 'high' ? '深色這個方向我記下來囉～' : '已納入條件：深色系。';

      scripted = modelReply(text);
      const normal = await chat(id, '我喜歡深色');
      assert.deepEqual(
        { reply: normal.reply, source: normal.source, replySource: normal.replySource },
        { reply: text, source: 'openai', replySource: 'gpt' },
        'a normal GPT reply must reach the participant untouched',
      );
      assert.equal(normal.replacedReply, undefined);
      assert.equal(lastRequest.model, 'gpt-4o-mini');
      assert.equal(lastRequest.temperature, 0.3);

      scripted = modelReply('好的，如果沒有其他偏好，深色系會是穩重的方向。');
      const formerFalsePositive = await chat(id, '我喜歡深色');
      assert.equal(formerFalsePositive.replySource, 'gpt');
      assert.equal(formerFalsePositive.reply, '好的，如果沒有其他偏好，深色系會是穩重的方向。');

      scripted = modelReply('很抱歉，本網站目前沒有棕色的單品。');
      const corrected = await chat(id, '我喜歡棕色');
      assert.equal(corrected.replySource, 'catalog_correction');
      assert.equal(corrected.reply, catalogCorrectionReply('brown', level));
      assert.equal(corrected.catalogCorrectionRule, 'brown');
      assert.equal(corrected.replacedReply, '很抱歉，本網站目前沒有棕色的單品。');
      assert.equal(corrected.replacedReplySource, 'gpt');

      const callsBeforeShortcut = modelCalls;
      const shortcut = await chat(id, '請問有哪些顏色');
      assert.equal(shortcut.replySource, 'color_shortcut');
      assert.equal(shortcut.reply, catalogColorListReply(level));
      assert.equal(modelCalls, callsBeforeShortcut, 'colour shortcut must not call the model');

      scripted = completion('這不是 JSON');
      const unparsable = await chat(id, '我喜歡深色');
      assert.equal(unparsable.replySource, 'parse_error');
      assert.equal(unparsable.source, 'fallback');
      assert.equal(unparsable.reply, generateFreeChatFallbackReply('我喜歡深色', getCondition(id)!));

      scripted = { status: 500, body: JSON.stringify({ error: { message: 'qa failure' } }) };
      const originalConsoleError = console.error;
      console.error = () => {};
      const failed = await chat(id, '我喜歡深色').finally(() => {
        console.error = originalConsoleError;
      });
      assert.equal(failed.replySource, 'api_error');
      assert.equal(failed.source, 'fallback');

      delete process.env.OPENAI_API_KEY;
      const callsBeforeMissingKey = modelCalls;
      const noKey = await chat(id, '我喜歡深色');
      assert.equal(noKey.replySource, 'missing_api_key');
      assert.equal(modelCalls, callsBeforeMissingKey);
      process.env.OPENAI_API_KEY = 'qa-key';
    }

    // 回覆來源不因 EX／TS／PRO 而不同；固定回覆只隨擬人化改變。
    for (const condition of conditions) {
      scripted = modelReply('很抱歉，本網站目前沒有裙子。');
      const corrected = await chat(condition.conditionId, '我想穿裙子');
      assert.equal(corrected.reply, catalogCorrectionReply('skirt', condition.anthropomorphism));
      const shortcut = await chat(condition.conditionId, '商品顏色有哪些');
      assert.equal(shortcut.reply, catalogColorListReply(condition.anthropomorphism));
    }
    console.log('PASS /api/chat reports gpt / parse_error / api_error / missing_api_key / color_shortcut / catalog_correction');
    console.log('PASS model stays gpt-4o-mini at temperature 0.3; fixed replies vary by anthropomorphism only (16 conditions)');
  } finally {
    server.close();
  }
}

/* ---------- 5. 受試者資料與匯出 ---------- */

function newParticipant(participantId: string, conditionId: number) {
  const condition = getCondition(conditionId)!;
  return initializeParticipantData(participantId, conditionId, 'no_surprise', {
    explainability: condition.explainability,
    twoSidedMessage: condition.twoSidedMessage,
    anthropomorphism: condition.anthropomorphism,
    proactivity: condition.proactivity,
  });
}

function message(sender: ChatMessage['sender'], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { step: 'freeChat', sender, message: text, timestamp: '2026-11-25T00:00:00.000Z', ...extra };
}

function checkExport(): void {
  const participant = newParticipant('qa-reply-source', 3);
  participant.chatLog = [
    message('user', '我喜歡深色'),
    message('bot', '已納入條件：深色系。', { replySource: 'gpt' }),
    message('user', '我喜歡棕色'),
    message('bot', catalogCorrectionReply('brown', 'low'), {
      replySource: 'catalog_correction',
      catalogCorrectionRule: 'brown',
      replacedReply: '本網站沒有棕色。',
      replacedReplySource: 'gpt',
    }),
    message('bot', '目前對話資訊已完成整理，可開啟確認。', {
      kind: 'proSummaryCta',
      replySource: 'program_fixed',
    }),
    message('user', '有哪些顏色'),
    message('bot', catalogColorListReply('low'), { replySource: 'color_shortcut' }),
    message('system', '你點選了『請 AI 整理目前需求』', { kind: 'proSummaryUserAction' }),
    message('user', '褲子寬鬆一點'),
    message('bot', '備援回覆一', { replySource: 'api_error' }),
    message('bot', '備援回覆二', { replySource: 'parse_error' }),
    message('bot', '備援回覆三', { replySource: 'missing_api_key' }),
    message('bot', '正常回覆', { replySource: 'gpt' }),
  ];

  const summary = summarizeReplySources(participant.chatLog);
  assert.equal(summary.total, 8);
  assert.equal(summary.backup, 3);
  assert.equal(summary.counts.gpt, 2);

  const row = flattenParticipantForExport(participant);
  assert.equal(row.aiReplyCount, 8);
  assert.equal(row.aiReplyGptCount, 2);
  assert.equal(row.aiReplyBackupCount, 3);
  assert.equal(row.aiReplyApiErrorCount, 1);
  assert.equal(row.aiReplyMissingApiKeyCount, 1);
  assert.equal(row.aiReplyParseErrorCount, 1);
  assert.equal(row.aiReplyColorShortcutCount, 1);
  assert.equal(row.aiReplyCatalogCorrectionCount, 1);
  assert.equal(row.aiReplyProgramFixedCount, 1);
  assert.equal(row.aiReplyUnknownSourceCount, 0);
  assert.equal(
    row.aiReplySources,
    'gpt | catalog_correction | program_fixed | color_shortcut | api_error | parse_error | missing_api_key | gpt',
  );
  assert.equal(
    String(row.aiReplySources).split(' | ').length,
    String(row.allBotMessages).split(' | ').length,
    'aiReplySources must line up with allBotMessages',
  );
  assert.equal(row.catalogCorrectionDetails, 'brown（原回覆來源 gpt）:本網站沒有棕色。');

  const columns = getExportColumns();
  for (const key of Object.keys(row)) {
    assert.ok(columns.includes(key), `export column list is missing ${key}`);
  }

  // 加入來源欄位前的舊資料：只有需求整理提示能回推，其餘標為 unknown。
  const legacy = newParticipant('qa-legacy', 1);
  legacy.chatLog = [
    message('user', '我喜歡深色'),
    message('bot', '舊回覆'),
    message('bot', '舊的需求整理提示', { kind: 'proSummaryCta' }),
  ];
  assert.equal(resolveReplySource(legacy.chatLog[1]), 'unknown');
  const legacyRow = flattenParticipantForExport(legacy);
  assert.equal(legacyRow.aiReplyUnknownSourceCount, 1);
  assert.equal(legacyRow.aiReplyProgramFixedCount, 1);
  assert.equal(legacyRow.aiReplyGptCount, 0);
  assert.equal(legacyRow.aiReplySources, 'unknown | program_fixed');
  console.log('PASS participant export carries per-reply sources and per-participant counts; legacy data reads as unknown');
}

main()
  .then(() => {
    checkExport();
    console.log('ALL REPLY SOURCE QA PASSED');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
