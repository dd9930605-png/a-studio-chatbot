/**
 * Test-only QA: 16 conditionId 的 TS High/Low 必須在正式結果頁卡片上分叉。
 * High → ✓ 推薦亮點 + △ 需要注意（caution）
 * Low  → ✓ 推薦亮點 + ✓ 另一項亮點（positiveB）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import conditionsData from '../public/conditions.json';
import { ResultExplanationView } from '../src/components/ResultExplanationView';
import { getCondition } from '../src/lib/conditions';
import { getOutfit } from '../src/lib/outfits';
import {
  buildResultContent,
  getTsEvaluationRows,
} from '../src/lib/resultContent';
import { LOOK_RESULT_CONTENT } from '../src/data/lookResultContent';

const EXPECTED: Array<['high' | 'low', 'high' | 'low', 'high' | 'low', 'high' | 'low']> = [
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

const TS_HIGH_IDS = [1, 2, 3, 4, 9, 10, 11, 12];
const TS_LOW_IDS = [5, 6, 7, 8, 13, 14, 15, 16];
const SAMPLE_LOOKS = ['M1', 'F5'] as const;

const m1 = getOutfit('M1');
assert.ok(m1, 'M1 must exist');

type CardShot = {
  conditionId: number;
  twoSidedMessage: 'high' | 'low';
  firstTitle: string;
  secondTitle: string;
  secondField: 'caution' | 'positiveB';
  htmlHasCautionTitle: boolean;
  htmlHasPositiveBTitle: boolean;
  htmlHasCautionBody: boolean;
  htmlHasPositiveBBody: boolean;
};

const shots: CardShot[] = [];

assert.equal(conditionsData.length, 16);
for (let index = 0; index < 16; index += 1) {
  const conditionId = index + 1;
  const fromJson = conditionsData[index];
  const restored = getCondition(conditionId);
  assert.ok(restored, `missing condition ${conditionId}`);
  assert.equal(fromJson.conditionId, conditionId);
  assert.deepEqual(
    [
      fromJson.explainability,
      fromJson.twoSidedMessage,
      fromJson.anthropomorphism,
      fromJson.proactivity,
    ],
    EXPECTED[index],
    `conditions.json mapping for ${conditionId}`,
  );
  assert.equal(restored.twoSidedMessage, fromJson.twoSidedMessage);
  assert.equal(restored.explainability, fromJson.explainability);
}

assert.deepEqual(
  conditionsData.filter((row) => row.twoSidedMessage === 'high').map((row) => row.conditionId),
  TS_HIGH_IDS,
);
assert.deepEqual(
  conditionsData.filter((row) => row.twoSidedMessage === 'low').map((row) => row.conditionId),
  TS_LOW_IDS,
);
console.log('PASS A. 16 conditionId TS mapping: High 1–4,9–12 / Low 5–8,13–16');

for (const outfitId of SAMPLE_LOOKS) {
  const outfit = getOutfit(outfitId);
  assert.ok(outfit, outfitId);
  const content = buildResultContent({
    outfit,
    preferenceFormality: 'formal',
    preferenceImpression: 'minimal',
    preferenceColor: 'dark',
    userMessages: ['我想穿得正式一點'],
  });
  assert.ok(content.caution.trim().length > 0, `${outfitId} caution empty`);
  assert.ok(content.positiveB.trim().length > 0, `${outfitId} positiveB empty`);
  assert.notEqual(content.caution, content.positiveB);

  for (const conditionId of [...TS_HIGH_IDS, ...TS_LOW_IDS]) {
    const condition = getCondition(conditionId)!;
    const rows = getTsEvaluationRows(condition.twoSidedMessage);
    assert.equal(rows[0].title, '推薦亮點');
    assert.equal(rows[0].bodyKey, 'positiveA');
    assert.equal(rows[0].mark, '✓');

    if (condition.twoSidedMessage === 'high') {
      assert.equal(rows[1].title, '需要注意');
      assert.equal(rows[1].bodyKey, 'caution');
      assert.equal(rows[1].mark, '△');
      assert.equal(rows[1].tone, 'caution');
    } else {
      assert.equal(rows[1].title, '另一項亮點');
      assert.equal(rows[1].bodyKey, 'positiveB');
      assert.equal(rows[1].mark, '✓');
      assert.equal(rows[1].tone, 'positive');
    }

    const html = renderToStaticMarkup(
      React.createElement(ResultExplanationView, {
        content,
        explainability: condition.explainability,
        twoSidedMessage: condition.twoSidedMessage,
      }),
    );

    assert.match(html, new RegExp(`data-ts="${condition.twoSidedMessage}"`));
    assert.match(html, /data-testid="ts-positive-a"/);
    assert.match(html, /推薦亮點/);
    assert.ok(html.includes(content.positiveA), `${conditionId} ${outfitId} missing positiveA`);

    if (condition.twoSidedMessage === 'high') {
      assert.match(html, /data-testid="ts-caution"/);
      assert.doesNotMatch(html, /data-testid="ts-positive-b"/);
      assert.match(html, /需要注意/);
      assert.doesNotMatch(html, /另一項亮點/);
      assert.ok(html.includes(content.caution), `${conditionId} ${outfitId} missing caution body`);
      assert.equal(html.includes(content.positiveB), false, `${conditionId} leaked positiveB`);
    } else {
      assert.match(html, /data-testid="ts-positive-b"/);
      assert.doesNotMatch(html, /data-testid="ts-caution"/);
      assert.match(html, /另一項亮點/);
      assert.doesNotMatch(html, /需要注意/);
      assert.ok(html.includes(content.positiveB), `${conditionId} ${outfitId} missing positiveB body`);
      assert.equal(html.includes(content.caution), false, `${conditionId} leaked caution`);
    }

    if (outfitId === 'M1') {
      shots.push({
        conditionId,
        twoSidedMessage: condition.twoSidedMessage,
        firstTitle: rows[0].title,
        secondTitle: rows[1].title,
        secondField: rows[1].bodyKey === 'caution' ? 'caution' : 'positiveB',
        htmlHasCautionTitle: html.includes('需要注意'),
        htmlHasPositiveBTitle: html.includes('另一項亮點'),
        htmlHasCautionBody: html.includes(content.caution),
        htmlHasPositiveBBody: html.includes(content.positiveB),
      });
    }
  }
}
console.log('PASS B–E. 16 conditions × 2 looks: card HTML uses caution iff TS High');

for (const copy of Object.values(LOOK_RESULT_CONTENT)) {
  assert.ok(copy.caution.trim().length > 8, `${copy.outfitId} caution too short`);
  assert.ok(copy.positiveB.trim().length > 8, `${copy.outfitId} positiveB too short`);
}
console.log('PASS all 12 looks have distinct caution / positiveB copy');

const cardSrc = fs.readFileSync('src/components/RecommendationCard.tsx', 'utf8');
const chatPage = fs.readFileSync('src/app/chat/ChatPageContent.tsx', 'utf8');
const resultView = fs.readFileSync('src/components/ResultExplanationView.tsx', 'utf8');
const prePage = fs.readFileSync('src/app/pre/PrePageContent.tsx', 'utf8');
const recorder = fs.readFileSync('src/lib/dataRecorder.ts', 'utf8');
const chatIf = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

assert.match(cardSrc, /twoSidedMessage=\{condition\.twoSidedMessage\}/);
assert.match(chatPage, /getCondition\(draft\.conditionId\)/);
assert.match(chatPage, /twoSidedMessage,/);
assert.match(resultView, /getTsEvaluationRows\(twoSidedMessage\)/);
assert.doesNotMatch(resultView, /twoSidedMessage === ['"]low['"] \?/);
assert.match(prePage, /searchParams\.get\('condition'\)/);
assert.match(prePage, /twoSidedMessage: cond\.twoSidedMessage/);
assert.match(recorder, /sessionStorage\.setItem\(PARTICIPANT_DRAFT_KEY/);
assert.match(recorder, /sessionStorage\.setItem\(SESSION_KEY/);
assert.doesNotMatch(chatPage, /conditionInfo\.twoSidedMessage/);
console.log('PASS F. no fallback remaps TS High→Low; result page uses getCondition(conditionId)');

assert.match(chatPage, /if \(draft\.chatPageEnteredAt\)/);
assert.match(chatPage, /setCondition\(cond\)/);
console.log('PASS G. reload/resume rehydrates condition from draft.conditionId via getCondition');

assert.match(resultView, /sm:grid-cols-2/);
assert.match(resultView, /sm:hidden/);
console.log('PASS H. mobile/desktop share the same TS rows; only arrow/grid layout changes');

assert.match(chatPage, /data-testid="pro-summary-gate"/);
assert.match(chatPage, /data-testid="pro-summary-gate-button"/);
assert.match(chatPage, /data-testid="pro-summary-max-gate-button"/);
assert.match(chatPage, /maxDialogDismissed/);
assert.match(chatIf, /data-testid="pro-summary-low-button"/);
assert.match(chatIf, /userMessageCount >= 2/);
assert.match(chatIf, /proSummaryCtaMessage/);
assert.match(chatIf, /!isHighProactivity/);
console.log('PASS PRO Low gate is website chrome with in-place 整理 button');

const gateFn = fs.readFileSync('src/lib/needSummary.ts', 'utf8');
assert.match(gateFn, /進入推薦結果前，請先完成目前需求確認。/);
assert.doesNotMatch(
  gateFn.slice(gateFn.indexOf('function proSummaryGateMessage')),
  /我提醒你|我先幫你|😊/,
);

console.log('\n=== 16-condition TS card shots (Look M1) ===');
console.log(
  [
    'ID',
    'TS',
    'row1',
    'row2',
    'secondField',
    'htmlCautionTitle',
    'htmlPositiveBTitle',
  ].join('\t'),
);
for (const shot of shots) {
  console.log(
    [
      shot.conditionId,
      shot.twoSidedMessage,
      shot.firstTitle,
      shot.secondTitle,
      shot.secondField,
      shot.htmlHasCautionTitle ? 'yes' : 'no',
      shot.htmlHasPositiveBTitle ? 'yes' : 'no',
    ].join('\t'),
  );
}

const highlight = (id: number) => shots.find((shot) => shot.conditionId === id);
for (const id of [1, 4, 9, 12, 5, 8, 13, 16]) {
  const shot = highlight(id);
  assert.ok(shot, `missing shot ${id}`);
  if (TS_HIGH_IDS.includes(id)) {
    assert.equal(shot.secondField, 'caution');
    assert.equal(shot.htmlHasCautionTitle, true);
    assert.equal(shot.htmlHasPositiveBTitle, false);
  } else {
    assert.equal(shot.secondField, 'positiveB');
    assert.equal(shot.htmlHasPositiveBTitle, true);
    assert.equal(shot.htmlHasCautionTitle, false);
  }
}

console.log('PASS 16/16 TS card mapping');
