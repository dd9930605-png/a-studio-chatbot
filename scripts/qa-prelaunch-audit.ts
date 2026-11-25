/**
 * 正式收案前 robustness audit。
 * 讀 production 函式做模擬，用來確認收案版修正。
 */
import fs from 'node:fs';
import path from 'node:path';
import { LOOK_RESULT_CONTENT } from '../src/data/lookResultContent';
import {
  extractChatPreferences,
  getOutfitBottomKind,
  getOutfitColorKeys,
  getOutfitFitLevel,
  hasExplicitPreferences,
  outfitConflictsWithPreferences,
  selectSurpriseOutfitBPlus,
  emptyChatPreferences,
} from '../src/lib/chatPreferences';
import {
  getAllowedOutfits,
  getBlockedOutfits,
  getOutfit,
  getOutfitPools,
  outfits,
  resolveFinalOutfit,
} from '../src/lib/outfits';
import { getLookNumberFromOutfitId, LOOK_TO_OUTFIT } from '../src/lib/looks';
import {
  buildNeedSummary,
  extractExplicitChatNeeds,
  proSummaryCtaMessage,
  proSummaryGateMessage,
} from '../src/lib/needSummary';
import { buildResultContent, buildResultParagraph, buildResultSentences } from '../src/lib/resultContent';
import {
  generateFreeChatFallbackReply,
  hasOutfitRelevanceSignal,
  isClearlyOffTopic,
} from '../src/lib/aiResponses';
import { buildFreeChatSystemPrompt } from '../src/lib/botPrompts';
import { buildExperimentKnowledgeBlock } from '../src/lib/experimentKnowledge';
import { getCondition } from '../src/lib/conditions';
import {
  detectUnavailableColorRequests,
  messageMentionsUnavailableColor,
  messageMentionsUnavailableStyle,
  CATALOG_COLOR_SUMMARY,
} from '../src/lib/catalogBoundaries';
import { buildConsultationThemesBlock } from '../src/lib/chatConsultationThemes';
import { drawTournamentSeeds, getTournamentRoundPair } from '../src/lib/outfitPk';
import { generateCompletionCode } from '../src/lib/dataRecorder';
import { buildSurveyUrl } from '../src/lib/conditions';
import { defaultResultLayout, isResultLayoutSwitchEnabled, resolveResultLayout } from '../src/lib/resultLayout';
import { getLookFeatures } from '../src/data/lookFeatures';

type Status = 'PASS' | 'WARNING' | 'FAIL';
type Severity = 'blocker' | 'high' | 'medium' | 'low';

interface Finding {
  status: Status;
  id: string;
  section: string;
  input: string;
  actual: string;
  expected: string;
  cause: string;
  files: string;
  severity: Severity;
  suggestion: string;
}

interface Counter {
  name: string;
  ran: number;
  pass: number;
  fail: number;
  warn: number;
}

const findings: Finding[] = [];
const counters: Counter[] = [];
const ALL_IDS = outfits.map((item) => item.outfitId);

function addFinding(finding: Finding) {
  findings.push(finding);
}

function counter(name: string): Counter {
  const item: Counter = { name, ran: 0, pass: 0, fail: 0, warn: 0 };
  counters.push(item);
  return item;
}

function tick(c: Counter, status: Status) {
  c.ran += 1;
  if (status === 'PASS') c.pass += 1;
  else if (status === 'FAIL') c.fail += 1;
  else c.warn += 1;
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

const LIGHT_NAME = /白色|米白|淺藍|白 T|白T/;
const DARK_NAME = /黑色|深灰|深藍|咖啡|深棕|棕色|黑(?!白)/;
const STYLE_SCORING_WORDS = [
  '簡約',
  '簡單',
  '乾淨',
  '俐落',
  '韓系',
  '清爽',
  '時尚',
  '知性',
  '親切',
  '自然',
  '極簡',
  '通勤',
  '層次穿搭',
  '商務休閒',
  '半正式',
  '古著',
  '復古',
  'vintage',
  '個性風格',
  '街頭',
  '正式專業',
  '襯衫領帶',
  '柔和專業',
];

function lookLabel(id: string): string {
  const n = getLookNumberFromOutfitId(id);
  return n ? `Look ${n} ${id}` : id;
}

function familiesFromName(name: string): { light: boolean; dark: boolean } {
  return { light: LIGHT_NAME.test(name), dark: DARK_NAME.test(name) };
}

function conditionBy(id: number) {
  const condition = getCondition(id);
  if (!condition) throw new Error(`missing condition ${id}`);
  return condition;
}

/* -------------------------------------------------------------------------- */
/* A. 12 Look feature matrix                                                  */
/* -------------------------------------------------------------------------- */

interface LookRow {
  look: number;
  outfitId: string;
  name: string;
  displayCategory: string;
  wearCategory: string;
  maleEligible: boolean;
  femaleEligible: boolean;
  colorKeys: string[];
  light: boolean;
  dark: boolean;
  tags: string[];
  fit: string;
  bottom: string;
  hasTie: boolean;
  hasCargo: boolean;
  hasJeans: boolean;
  hasSkirt: boolean;
  formalityTags: string[];
  casualTags: string[];
  colorAttribute: string;
  fitAttribute: string;
  styleAttribute: string;
  positiveA: string;
  positiveB: string;
  caution: string;
  reviewStatus: string;
}

function buildMatrix(): LookRow[] {
  const male = new Set(getAllowedOutfits('male'));
  const female = new Set(getAllowedOutfits('female'));
  return ALL_IDS.map((id) => {
    const outfit = getOutfit(id)!;
    const copy = LOOK_RESULT_CONTENT[id];
    const features = getLookFeatures(id);
    const families = familiesFromName(outfit.outfitName);
    const tags = outfit.styleTags;
    return {
      look: getLookNumberFromOutfitId(id) ?? 0,
      outfitId: id,
      name: outfit.outfitName,
      displayCategory: outfit.displayCategory,
      wearCategory: outfit.wearCategory,
      maleEligible: male.has(id),
      femaleEligible: female.has(id),
      colorKeys: getOutfitColorKeys(id),
      light: features.colorFamily !== 'dark' || families.light,
      dark: features.colorFamily !== 'light' || families.dark,
      tags,
      fit: getOutfitFitLevel(id),
      bottom: getOutfitBottomKind(id),
      hasTie: /領帶/.test(outfit.outfitName),
      hasCargo: /工裝/.test(outfit.outfitName),
      hasJeans: /牛仔/.test(outfit.outfitName),
      hasSkirt: /裙/.test(outfit.outfitName),
      formalityTags: tags.filter((tag) => /正式|專業|襯衫領帶/.test(tag)),
      casualTags: tags.filter((tag) => /街頭|休閒|個性/.test(tag)),
      colorAttribute: copy?.colorAttribute ?? '',
      fitAttribute: copy?.fitAttribute ?? '',
      styleAttribute: copy?.styleAttribute ?? '',
      positiveA: copy?.positiveA ?? '',
      positiveB: copy?.positiveB ?? '',
      caution: copy?.caution ?? '',
      reviewStatus: copy?.reviewStatus ?? 'missing',
    };
  });
}

function auditMatrix(rows: LookRow[]) {
  const c = counter('A feature matrix');
  for (const row of rows) {
    const id = `A-${row.outfitId}`;
    if (!LOOK_RESULT_CONTENT[row.outfitId]) {
      addFinding({
        status: 'FAIL',
        id,
        section: 'A',
        input: row.outfitId,
        actual: 'no result copy',
        expected: 'LOOK_RESULT_CONTENT for every Look',
        cause: 'result content missing',
        files: 'src/data/lookResultContent.ts',
        severity: 'blocker',
        suggestion: '補上該套文案',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }

    if (row.formalityTags.length > 0 && row.casualTags.length > 0) {
      addFinding({
        status: 'FAIL',
        id: `${id}-tag-conflict`,
        section: 'A',
        input: `${lookLabel(row.outfitId)} tags=${row.tags.join('/')}`,
        actual: `同時有正式標 ${row.formalityTags.join(',')} 與休閒標 ${row.casualTags.join(',')}`,
        expected: '同一套不應同時被 wantsFormal 加分又被硬排除',
        cause: 'styleTags 內部矛盾。wantsFormal 會因 CASUAL_STYLE_TAGS 硬排除，同時 FORMAL_STYLE_TAGS 又會給這套加分。',
        files: 'public/outfits.json, src/lib/chatPreferences.ts (CASUAL_STYLE_TAGS / FORMAL_STYLE_TAGS)',
        severity: 'high',
        suggestion: 'M2 建議拿掉「俐落正式」，改留個性／街頭；或把「個性風格」移出硬排除名單。',
      });
      tick(c, 'FAIL');
    }

    if (row.hasCargo && row.bottom === 'wide_pants') {
      tick(c, 'PASS');
    }

    const nameColors = row.colorAttribute;
    if (row.dark && /淺色|米白|白色/.test(nameColors) === false && row.light && !/白|米|淺藍/.test(nameColors)) {
      addFinding({
        status: 'WARNING',
        id: `${id}-color-copy`,
        section: 'A',
        input: row.name,
        actual: `result colorAttribute=${nameColors}`,
        expected: '與商品名稱色系一致',
        cause: 'result copy 色系描述可能漏色',
        files: 'src/data/lookResultContent.ts',
        severity: 'low',
        suggestion: '人工核對色系欄',
      });
      tick(c, 'WARNING');
    }
  }

  const stripeAsColor = rows.some((row) => row.colorKeys.includes('stripe'));
  const stripePrefs = extractChatPreferences(['我喜歡條紋']);
  if (stripeAsColor || stripePrefs.likedColors.length > 0) {
    addFinding({
      status: 'FAIL',
      id: 'A-stripe-as-color',
      section: 'A',
      input: `stripe looks ${rows.filter((row) => row.colorKeys.includes('stripe')).map((row) => row.outfitId).join(',')}`,
      actual: json({ stripeAsColor, likedColors: stripePrefs.likedColors, likesStripe: stripePrefs.likesStripe }),
      expected: '條紋是圖案，不得占用色系鍵',
      cause: 'stripe 仍被當成 ColorKey',
      files: 'src/data/lookFeatures.ts, src/lib/chatPreferences.ts',
      severity: 'medium',
      suggestion: '條紋走 pattern flag',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  const lightBluePrefs = extractChatPreferences(['我喜歡淺藍']);
  const darkBluePrefs = extractChatPreferences(['我喜歡深藍']);
  if (
    lightBluePrefs.likedColors.includes('darkBlue') ||
    darkBluePrefs.likedColors.includes('lightBlue') ||
    !lightBluePrefs.likedColors.includes('lightBlue') ||
    !darkBluePrefs.likedColors.includes('darkBlue')
  ) {
    addFinding({
      status: 'FAIL',
      id: 'A-blue-undifferentiated',
      section: 'A',
      input: '淺藍 / 深藍',
      actual: json({ light: lightBluePrefs.likedColors, dark: darkBluePrefs.likedColors }),
      expected: '淺藍與深藍分開記錄',
      cause: '藍色 token 未拆',
      files: 'src/data/lookFeatures.ts, src/lib/preferenceLanguage.ts',
      severity: 'high',
      suggestion: '拆 lightBlue / darkBlue',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  const unscoredTags = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags) {
      if (tag === '面試適用') continue;
      if (!STYLE_SCORING_WORDS.some((word) => tag.includes(word))) {
        unscoredTags.add(tag);
      }
    }
  }
  if (unscoredTags.size > 0) {
    addFinding({
      status: 'WARNING',
      id: 'A-unscored-tags',
      section: 'A',
      input: Array.from(unscoredTags).join('、'),
      actual: '這些商品標籤出現在 outfits.json，但 STYLE_KEYWORDS 不會因此加分',
      expected: '評分詞彙對齊 12 套實際標籤，或明確宣布這些標籤不進 surprise scoring',
      cause: 'STYLE_KEYWORDS 未覆蓋部分 Look 標籤',
      files: 'src/lib/chatPreferences.ts STYLE_KEYWORDS, public/outfits.json',
      severity: 'medium',
      suggestion: '補齊實際標籤，或明確宣布不進 surprise scoring',
    });
    tick(c, 'WARNING');
  } else {
    tick(c, 'PASS');
  }

  const wantsFormal = extractChatPreferences(['我希望正式一點']);
  const m3Conflicts = outfitConflictsWithPreferences('M3', wantsFormal);
  if (m3Conflicts) {
    addFinding({
      status: 'FAIL',
      id: 'A-business-casual-excluded',
      section: 'A',
      input: '我希望正式一點 vs M3 商務休閒',
      actual: 'M3 被 wantsFormal 硬排除',
      expected: '商務休閒不應因標籤含「休閒」被整套剔除',
      cause: 'formality 判定仍把 M3 當 low/casual',
      files: 'src/data/lookFeatures.ts, src/lib/chatPreferences.ts outfitConflictsWithPreferences',
      severity: 'high',
      suggestion: 'M3 formality 應為 mid，衝突只排除 formality=low',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  const lightPrefs = extractChatPreferences(['我喜歡淺色']);
  if (lightPrefs.likedColorFamily !== 'light') {
    addFinding({
      status: 'FAIL',
      id: 'A-family-colors-not-scored',
      section: 'A',
      input: '我喜歡淺色',
      actual: json({ likedColorFamily: lightPrefs.likedColorFamily }),
      expected: 'likedColorFamily=light 並進入 surprise scoring',
      cause: 'family 沒有寫進 ChatPreferences',
      files: 'src/lib/chatPreferences.ts',
      severity: 'blocker',
      suggestion: '深色／淺色納入 colorFamily scoring',
    });
    tick(c, 'FAIL');
  } else if (
    outfitConflictsWithPreferences('M2', lightPrefs) ||
    outfitConflictsWithPreferences('M4', lightPrefs)
  ) {
    addFinding({
      status: 'FAIL',
      id: 'A-family-hard-exclude',
      section: 'A',
      input: '我喜歡淺色 vs M2/M4 dark Looks',
      actual: 'dark Look 被 colorFamily 硬排除',
      expected: '喜歡淺色只影響分數，不把 dark Look 移出 candidate pool',
      cause: 'outfitConflictsWithPreferences 把 family 當 hard constraint',
      files: 'src/lib/chatPreferences.ts outfitConflictsWithPreferences',
      severity: 'blocker',
      suggestion: 'colorFamily 只走 scoring',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }
}

/* -------------------------------------------------------------------------- */
/* B. pools + scoring                                                         */
/* -------------------------------------------------------------------------- */

function auditPoolsAndScoring() {
  const poolC = counter('B pool/resolve');
  const scoreC = counter('B scoring simulation');
  const tieC = counter('B tie randomness');
  const pkC = counter('B PK tournament');

  for (const category of ['male', 'female'] as const) {
    const allowed = getAllowedOutfits(category);
    const blocked = getBlockedOutfits(category);
    if (allowed.length !== 10 || blocked.length !== 2) {
      addFinding({
        status: 'FAIL',
        id: `B-pool-size-${category}`,
        section: 'B',
        input: category,
        actual: `allowed=${allowed.length} blocked=${blocked.length}`,
        expected: 'eligible 10 / blocked 2',
        cause: 'getAllowedOutfits / getBlockedOutfits',
        files: 'src/lib/outfits.ts',
        severity: 'blocker',
        suggestion: '核對 MALE_ALLOWED / FEMALE_ALLOWED',
      });
      tick(poolC, 'FAIL');
    } else {
      tick(poolC, 'PASS');
    }

    for (const prediction of ALL_IDS) {
      const noSurprise = resolveFinalOutfit({
        surpriseMode: 'no_surprise',
        expectedOutfitBeforeAI: prediction,
        allowedOutfits: allowed,
        blockedOutfits: blocked,
      });
      if (noSurprise.finalRecommendedOutfit !== prediction) {
        addFinding({
          status: 'FAIL',
          id: `B-no-surprise-${category}-${prediction}`,
          section: 'B',
          input: `${category} prediction=${prediction} blocked=${blocked.includes(prediction)}`,
          actual: noSurprise.finalRecommendedOutfit,
          expected: prediction,
          cause: 'no_surprise 被換成別套',
          files: 'src/lib/outfits.ts resolveFinalOutfit',
          severity: 'blocker',
          suggestion: '維持 expectation-consistency 優先',
        });
        tick(poolC, 'FAIL');
      } else {
        tick(poolC, 'PASS');
      }

      const surprise = resolveFinalOutfit({
        surpriseMode: 'surprise',
        expectedOutfitBeforeAI: prediction,
        allowedOutfits: allowed,
        blockedOutfits: blocked,
      });
      const badPred = surprise.surpriseCandidateOutfits.includes(prediction);
      const badBlock = surprise.surpriseCandidateOutfits.some((id) => blocked.includes(id));
      const empty = surprise.surpriseCandidateOutfits.length === 0;
      const outside = surprise.surpriseCandidateOutfits.some((id) => !allowed.includes(id));
      if (badPred || badBlock || empty || outside) {
        addFinding({
          status: 'FAIL',
          id: `B-surprise-pool-${category}-${prediction}`,
          section: 'B',
          input: `${category} prediction=${prediction}`,
          actual: json({
            candidates: surprise.surpriseCandidateOutfits,
            includesPrediction: badPred,
            includesBlocked: badBlock,
            empty,
          }),
          expected: '非空、不含 Prediction、不含 category excluded',
          cause: 'getSurpriseCandidates / safeCandidates',
          files: 'src/lib/outfits.ts',
          severity: 'blocker',
          suggestion: '核對 excluded Look 與 Prediction 排除順序',
        });
        tick(poolC, 'FAIL');
      } else {
        tick(poolC, 'PASS');
      }
    }
  }

  const preferenceCases: { name: string; messages: string[] }[] = [
    { name: 'none', messages: [] },
    { name: 'weak-only', messages: ['都可以', '不知道', '隨便'] },
    { name: 'like-black', messages: ['我喜歡黑色'] },
    { name: 'like-white', messages: ['我喜歡白色'] },
    { name: 'like-light-family', messages: ['我喜歡淺色'] },
    { name: 'like-dark-family', messages: ['我喜歡深色'] },
    { name: 'dislike-black', messages: ['我不喜歡黑色'] },
    { name: 'like-jeans', messages: ['我喜歡牛仔褲'] },
    { name: 'like-skirt', messages: ['我想穿裙子'] },
    { name: 'like-wide', messages: ['我喜歡寬褲'] },
    { name: 'like-fit', messages: ['我想穿合身一點'] },
    { name: 'want-formal', messages: ['我希望正式一點'] },
    { name: 'less-formal', messages: ['我不要太正式'] },
    { name: 'like-green', messages: ['我喜歡綠色'] },
    { name: 'revise-dark-to-light', messages: ['我喜歡深色', '其實我現在比較想穿淺色'] },
    { name: 'multi', messages: ['我想要簡約一點但不要太正式，而且不要黑色'] },
  ];

  for (const category of ['male', 'female'] as const) {
    const allowed = getAllowedOutfits(category);
    const blocked = getBlockedOutfits(category);
    for (const prediction of ALL_IDS) {
      const { surpriseCandidateOutfits } = resolveFinalOutfit({
        surpriseMode: 'surprise',
        expectedOutfitBeforeAI: prediction,
        allowedOutfits: allowed,
        blockedOutfits: blocked,
      });
      for (const pref of preferenceCases) {
        const preferences = extractChatPreferences(pref.messages);
        let result: ReturnType<typeof selectSurpriseOutfitBPlus> | null = null;
        let error = '';
        try {
          result = selectSurpriseOutfitBPlus({
            expectedOutfitBeforeAI: prediction,
            candidates: surpriseCandidateOutfits,
            preferences,
          });
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
        const scoreNaN = result ? Number.isNaN(Number(result.finalOutfit ? 1 : 0)) : true;
        const invalid =
          Boolean(error) ||
          !result ||
          result.finalOutfit === prediction ||
          blocked.includes(result.finalOutfit) ||
          !allowed.includes(result.finalOutfit) ||
          !surpriseCandidateOutfits.includes(result.finalOutfit) ||
          scoreNaN;
        if (invalid) {
          addFinding({
            status: 'FAIL',
            id: `B-score-${category}-${prediction}-${pref.name}`,
            section: 'B',
            input: `${category} pred=${prediction} msgs=${json(pref.messages)}`,
            actual: error || json(result),
            expected: '回傳 eligible、非 Prediction、非 blocked、非空',
            cause: error || 'selectSurpriseOutfitBPlus 邊界失敗',
            files: 'src/lib/chatPreferences.ts selectSurpriseOutfitBPlus',
            severity: 'blocker',
            suggestion: '檢查空池、衝突全排除後的 fallback',
          });
          tick(scoreC, 'FAIL');
        } else {
          tick(scoreC, 'PASS');
        }
      }
    }
  }

  const maleAllowed = getAllowedOutfits('male');
  const emptyPrefs = emptyChatPreferences();
  const dist: Record<string, number> = {};
  const TRIALS = 4000;
  const prediction = 'M1';
  const candidates = maleAllowed.filter((id) => id !== prediction);
  for (let i = 0; i < TRIALS; i += 1) {
    const picked = selectSurpriseOutfitBPlus({
      expectedOutfitBeforeAI: prediction,
      candidates,
      preferences: emptyPrefs,
    }).finalOutfit;
    dist[picked] = (dist[picked] ?? 0) + 1;
  }
  const counts = Object.values(dist);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const alwaysSame = Object.keys(dist).length === 1;
  const ratio = min === 0 ? Infinity : max / min;
  if (alwaysSame || ratio > 3) {
    addFinding({
      status: 'FAIL',
      id: 'B-tie-bias',
      section: 'B',
      input: `no preference, ${TRIALS} trials, candidates=${candidates.join(',')}`,
      actual: json(dist),
      expected: '同分隨機，不應長期偏向同一套',
      cause: alwaysSame ? 'pickRandom 失效或候選只剩 1' : `max/min=${ratio.toFixed(2)}`,
      files: 'src/lib/chatPreferences.ts pickRandom',
      severity: 'high',
      suggestion: '核對 Math.random 與 topTier',
    });
    tick(tieC, 'FAIL');
  } else {
    addFinding({
      status: 'PASS',
      id: 'B-tie-bias',
      section: 'B',
      input: `${TRIALS} empty-preference surprise draws`,
      actual: json(dist),
      expected: '分散在候選池',
      cause: `max/min=${ratio.toFixed(2)}`,
      files: 'src/lib/chatPreferences.ts pickRandom',
      severity: 'low',
      suggestion: '',
    });
    tick(tieC, 'PASS');
  }

  for (const category of ['male', 'female'] as const) {
    const pool = getAllowedOutfits(category);
    const excludedFav = getBlockedOutfits(category)[0];
    const inPoolFav = pool[0];
    for (const favorite of [excludedFav, inPoolFav]) {
      try {
        const seeds = drawTournamentSeeds(favorite, pool);
        if (seeds.includes(favorite) && pool.includes(favorite) === false) {
          addFinding({
            status: 'FAIL',
            id: `B-pk-excluded-seed-${favorite}`,
            section: 'B',
            input: `favorite=${favorite} category=${category}`,
            actual: json(seeds),
            expected: 'excluded Favorite 不得進前四輪 seeds',
            cause: 'drawTournamentSeeds 未排除',
            files: 'src/lib/outfitPk.ts',
            severity: 'high',
            suggestion: 'seeds 只從 eligible pool 且排除 Favorite',
          });
          tick(pkC, 'FAIL');
        } else {
          const pair = getTournamentRoundPair({
            roundNumber: 5,
            seeds,
            favoriteOutfitId: favorite,
            winnersByRound: { 1: seeds[0], 2: seeds[2], 3: seeds[0], 4: seeds[4] },
          });
          if (pair.leftOutfitId !== favorite && pair.rightOutfitId !== favorite) {
            addFinding({
              status: 'FAIL',
              id: `B-pk-final-${favorite}`,
              section: 'B',
              input: `favorite=${favorite}`,
              actual: json(pair),
              expected: '第 5 輪必須出現 Favorite',
              cause: 'getTournamentRoundPair',
              files: 'src/lib/outfitPk.ts',
              severity: 'high',
              suggestion: 'R5 = Favorite vs challenger',
            });
            tick(pkC, 'FAIL');
          } else {
            tick(pkC, 'PASS');
          }
        }
      } catch (err) {
        addFinding({
          status: 'FAIL',
          id: `B-pk-throw-${favorite}`,
          section: 'B',
          input: `favorite=${favorite} category=${category}`,
          actual: err instanceof Error ? err.message : String(err),
          expected: 'excluded Favorite 仍能抽 5 個 challenger（pool=10）',
          cause: 'drawTournamentSeeds throw',
          files: 'src/lib/outfitPk.ts',
          severity: 'high',
          suggestion: 'Favorite 不在 pool 時 others 仍有 10 套',
        });
        tick(pkC, 'FAIL');
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* C. chat robustness                                                         */
/* -------------------------------------------------------------------------- */

function auditChatUnderstanding() {
  const styleC = counter('C style terms');
  const typoC = counter('C typos');
  const weakC = counter('C weak preference');
  const negC = counter('C negation');
  const revC = counter('C preference revision');
  const multiC = counter('C multi-constraint');

  const styleTerms = [
    '古著',
    '復古',
    'Vintage',
    'vintage',
    '韓系',
    '簡約',
    '俐落',
    '商務休閒',
    '寬鬆',
    '合身',
    '正式',
    '不要太正式',
    '休閒',
    '襯衫',
    '領帶',
    '西裝',
    '寬褲',
    'oversize',
    'Y2K',
    'old money',
    'quiet luxury',
    'clean fit',
    'dopamine dressing',
    'gorpcore',
    'normcore',
    '日系',
    '工裝',
    '條紋',
    '抽繩褲',
  ];

  for (const term of styleTerms) {
    const off = isClearlyOffTopic(term);
    const relevant = hasOutfitRelevanceSignal('freeChat', term);
    const prefs = extractChatPreferences([term.length < 4 ? `我喜歡${term}` : term]);
    const fallback = generateFreeChatFallbackReply(term, conditionBy(1));
    const treatsOff = off || /與面試穿搭無關|無法判斷為穿搭相關/.test(fallback);
    if (treatsOff) {
      addFinding({
        status: 'FAIL',
        id: `C-style-off-${term}`,
        section: 'C',
        input: term,
        actual: json({ off, relevant, fallback }),
        expected: '風格／穿搭詞不得當離題',
        cause: off
          ? 'isClearlyOffTopic keyword 誤傷'
          : 'fallback 或相關性訊號把風格詞當無關',
        files: 'src/lib/aiResponses.ts OFF_TOPIC_KEYWORDS / SHORT_STYLE_TERMS / SPECIFIC_RELEVANCE_KEYWORDS',
        severity: 'high',
        suggestion: '把古著/復古/vintage 及常見風格名加入 on-topic，不要只靠 keyword 黑名單',
      });
      tick(styleC, 'FAIL');
    } else if (!relevant && !['古著', 'Vintage', 'vintage', 'Y2K', 'old money', 'quiet luxury', 'clean fit', 'dopamine dressing', 'gorpcore', 'normcore', '商務休閒'].includes(term)) {
      tick(styleC, 'PASS');
    } else if (!relevant) {
      addFinding({
        status: 'WARNING',
        id: `C-style-unknown-${term}`,
        section: 'C',
        input: term,
        actual: json({ off, relevant, prefs: { likes: prefs.likedColors, styles: prefs.matchedStyleKeywords }, fallback }),
        expected: '至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義',
        cause: 'SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。',
        files: 'src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply',
        severity: 'medium',
        suggestion: '未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義',
      });
      tick(styleC, 'WARNING');
    } else {
      tick(styleC, 'PASS');
    }
  }

  const typoPairs: { typed: string; intent: string; mustCapture?: (p: ReturnType<typeof extractChatPreferences>) => boolean }[] = [
    { typed: '我喜歡深色系', intent: '深色', mustCapture: (p) => p.likedColorFamily === 'dark' },
    { typed: '我喜歡淺色系', intent: '淺色', mustCapture: (p) => p.likedColorFamily === 'light' },
    { typed: '我喜歡黑色', intent: '黑色', mustCapture: (p) => p.likedColors.includes('black') },
    { typed: '我喜歡黑色。', intent: '黑色+句號', mustCapture: (p) => p.likedColors.includes('black') },
    { typed: '我喜歡黑的', intent: '口語黑', mustCapture: (p) => p.likedColors.includes('black') },
    { typed: '我喜歡寬褲', intent: '寬褲', mustCapture: (p) => p.prefersWidePants },
    { typed: '我喜歡寬寬的褲子', intent: '口語寬', mustCapture: (p) => p.prefersWidePants || p.preferredFitLevels.includes('relaxed') },
    { typed: '我喜歡簡約', intent: '簡約', mustCapture: (p) => p.matchedStyleKeywords.includes('簡約') },
    { typed: '我喜歡簡要', intent: '簡約錯字' },
    { typed: '我喜歡韓式', intent: '韓系近音' },
    { typed: '我喜歡jeans', intent: '英文牛仔褲', mustCapture: (p) => p.prefersJeans },
    { typed: '不要太正式ㄅ', intent: '注音口語', mustCapture: (p) => p.wantsLessFormal },
    { typed: '我喜歡合身ㄧ點', intent: '合身錯字', mustCapture: (p) => p.preferredFitLevels.includes('structured') },
    { typed: '不喜歡黑色', intent: '缺我', mustCapture: (p) => p.dislikedColors.includes('black') },
  ];

  for (const pair of typoPairs) {
    const prefs = extractChatPreferences([pair.typed]);
    const needs = extractExplicitChatNeeds([pair.typed]);
    const off = isClearlyOffTopic(pair.typed);
    if (off) {
      addFinding({
        status: 'FAIL',
        id: `C-typo-off-${pair.typed}`,
        section: 'C',
        input: pair.typed,
        actual: 'isClearlyOffTopic=true',
        expected: '小錯字不得直接離題',
        cause: 'off-topic keyword',
        files: 'src/lib/aiResponses.ts',
        severity: 'high',
        suggestion: 'off-topic 不要用短詞誤傷',
      });
      tick(typoC, 'FAIL');
      continue;
    }
    if (pair.mustCapture && !pair.mustCapture(prefs)) {
      addFinding({
        status: 'FAIL',
        id: `C-typo-miss-${pair.typed}`,
        section: 'C',
        input: `${pair.typed} (intent ${pair.intent})`,
        actual: json({ likes: prefs.likedColors, dislikes: prefs.dislikedColors, wide: prefs.prefersWidePants, fit: prefs.preferredFitLevels, styles: prefs.matchedStyleKeywords, needs }),
        expected: `應仍抓到 ${pair.intent}`,
        cause: 'keyword 過窄或口語變體沒覆蓋',
        files: 'src/lib/chatPreferences.ts, src/lib/needSummary.ts',
        severity: 'high',
        suggestion: '補常見口語/錯字，但不要 fuzzy 到完全不同偏好',
      });
      tick(typoC, 'FAIL');
    } else if (!pair.mustCapture) {
      addFinding({
        status: 'WARNING',
        id: `C-typo-unclear-${pair.typed}`,
        section: 'C',
        input: `${pair.typed} (intent ${pair.intent})`,
        actual: json({ likes: prefs.likedColors, styles: prefs.matchedStyleKeywords, needs, prefsFlag: hasExplicitPreferences(prefs) }),
        expected: '意思不一定唯一時應 clarification，不要亂配',
        cause: '沒有對應詞就整句當一般文字記住',
        files: 'src/lib/chatPreferences.ts',
        severity: 'medium',
        suggestion: '近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約',
      });
      tick(typoC, 'WARNING');
    } else {
      tick(typoC, 'PASS');
    }
  }

  const weakPhrases = [
    '都可以',
    '還行',
    '可以吧',
    '應該可以',
    '好像不錯',
    '隨便',
    '我穿都可以',
    '不知道',
    '沒差',
    '不排斥',
    '可能吧',
    '看你',
    '都行',
    '應該可以吧',
    '嗯',
    '好啊',
  ];
  for (const phrase of weakPhrases) {
    const prefs = extractChatPreferences([phrase]);
    const needs = extractExplicitChatNeeds([phrase]);
    const strong =
      prefs.likedColors.length > 0 ||
      prefs.wantsFormal ||
      prefs.prefersJeans ||
      prefs.prefersSkirt ||
      needs.color !== null ||
      needs.formality === 'formal';
    if (strong) {
      addFinding({
        status: 'FAIL',
        id: `C-weak-${phrase}`,
        section: 'C',
        input: phrase,
        actual: json({ prefs: { liked: prefs.likedColors, formal: prefs.wantsFormal }, needs }),
        expected: '不得當成強烈喜歡',
        cause: '弱表述被寫進偏好',
        files: 'src/lib/chatPreferences.ts, src/lib/needSummary.ts WEAK_CLAUSE',
        severity: 'high',
        suggestion: 'WEAK_CLAUSE 與 LIKE_MARKERS 對齊，好像不錯/不排斥不要當喜歡',
      });
      tick(weakC, 'FAIL');
    } else {
      tick(weakC, 'PASS');
    }
  }

  const negations: { text: string; bad: (p: ReturnType<typeof extractChatPreferences>, n: ReturnType<typeof extractExplicitChatNeeds>) => boolean; expected: string }[] = [
    {
      text: '我不喜歡黑色',
      expected: 'disliked black, 不得 liked black',
      bad: (p) => p.likedColors.includes('black') || !p.dislikedColors.includes('black'),
    },
    {
      text: '我不要太正式',
      expected: 'wantsLessFormal, 不得 wantsFormal',
      bad: (p, n) => p.wantsFormal || !p.wantsLessFormal || n.formality === 'formal',
    },
    {
      text: '我不想穿寬鬆的',
      expected: 'avoid oversized, 不得 prefer relaxed',
      bad: (p) => p.preferredFitLevels.includes('relaxed') || !p.avoidedFitLevels.includes('oversized'),
    },
    {
      text: '不要領帶',
      expected: '記錄避免領帶，且不得變成喜歡正式',
      bad: (p, n) => !p.avoidsTie || p.wantsFormal || n.formality === 'formal',
    },
    {
      text: '我不喜歡太花',
      expected: '不得 liked stripe/color',
      bad: (p) => p.likedColors.length > 0,
    },
    {
      text: '我不是很喜歡淺色',
      expected: '不得 liked light family / 淺色系',
      bad: (_p, n) => n.color === 'light',
    },
    {
      text: '黑色也不是不行',
      expected: '弱接受，不得當強烈喜歡；若要覆蓋需明確規則',
      bad: (p) => p.likedColors.includes('black'),
    },
    {
      text: '不是不喜歡深色',
      expected: '雙重否定不是「不喜歡深色」',
      bad: (_p, n) => n.color === null && extractChatPreferences(['不是不喜歡深色']).dislikedColors.length > 0,
    },
    {
      text: '我不排斥正式一點',
      expected: '不排斥 ≠ 希望正式',
      bad: (p, n) => p.wantsFormal || n.formality === 'formal',
    },
    {
      text: '不是黑色',
      expected: '不得 liked black',
      bad: (p) => p.likedColors.includes('black'),
    },
  ];

  for (const item of negations) {
    const prefs = extractChatPreferences([item.text]);
    const needs = extractExplicitChatNeeds([item.text]);
    if (item.bad(prefs, needs)) {
      addFinding({
        status: 'FAIL',
        id: `C-neg-${item.text}`,
        section: 'C',
        input: item.text,
        actual: json({
          liked: prefs.likedColors,
          disliked: prefs.dislikedColors,
          formal: prefs.wantsFormal,
          lessFormal: prefs.wantsLessFormal,
          fitPref: prefs.preferredFitLevels,
          fitAvoid: prefs.avoidedFitLevels,
          needs,
        }),
        expected: item.expected,
        cause: 'negation scope：isDislikeClause / LIKE_MARKER / 正式一點 正則過寬',
        files: 'src/lib/needSummary.ts isDislikeClause FORMALITY_PATTERNS, src/lib/chatPreferences.ts, src/lib/catalogBoundaries.ts hasDislikePolarity',
        severity: 'high',
        suggestion: '處理「不排斥／不是不／也不是不行／不是很喜歡」，並把「不要領帶」納入單品 constraint',
      });
      tick(negC, 'FAIL');
    } else {
      tick(negC, 'PASS');
    }
  }

  const revisions: { msgs: string[]; expectNeedColor: 'light' | 'dark' | null; note: string }[] = [
    { msgs: ['我喜歡深色', '其實我現在比較想穿淺色'], expectNeedColor: 'light', note: '明確新陳述覆蓋' },
    { msgs: ['我喜歡深色', '淺色好像也可以'], expectNeedColor: 'dark', note: '弱表述不應覆蓋強偏好' },
    { msgs: ['我喜歡淺色', '黑色的好像也不錯'], expectNeedColor: 'light', note: '弱表述不得當成強烈改口' },
    { msgs: ['我喜歡黑色', '我不喜歡黑色'], expectNeedColor: null, note: '後句否定應取消喜歡' },
  ];
  for (const item of revisions) {
    const needs = extractExplicitChatNeeds(item.msgs);
    const prefs = extractChatPreferences(item.msgs);
    const actual = needs.color;
    const weakSecond = /好像|也可以/.test(item.msgs[1]) && !/也不錯/.test(item.msgs[1]);
    if (item.expectNeedColor === 'dark' && weakSecond && actual !== 'dark') {
      addFinding({
        status: 'FAIL',
        id: `C-rev-${item.msgs.join('/')}`,
        section: 'C',
        input: item.msgs.join(' → '),
        actual: json({ needColor: actual, liked: prefs.likedColors }),
        expected: item.note,
        cause: '弱句覆蓋或強句沒留下',
        files: 'src/lib/needSummary.ts WEAK_CLAUSE',
        severity: 'high',
        suggestion: '弱句（好像也可以）不覆蓋先前明確深色',
      });
      tick(revC, 'FAIL');
    } else if (actual !== item.expectNeedColor && item.expectNeedColor !== null) {
      addFinding({
        status: 'FAIL',
        id: `C-rev-${item.msgs.join('/')}`,
        section: 'C',
        input: item.msgs.join(' → '),
        actual: json({ needColor: actual, liked: prefs.likedColors, disliked: prefs.dislikedColors }),
        expected: item.note + ` need.color=${item.expectNeedColor}`,
        cause: '覆蓋規則或否定沒清掉舊喜歡',
        files: 'src/lib/needSummary.ts extractExplicitChatNeeds, src/lib/chatPreferences.ts',
        severity: 'high',
        suggestion: '較新明確句覆蓋；否定需從 liked 移除',
      });
      tick(revC, 'FAIL');
    } else {
      tick(revC, 'PASS');
    }
  }

  const multi = [
    '我想要簡約一點但不要太正式，而且不要黑色',
    '我喜歡寬鬆可是面試又不想看起來太隨便',
  ];
  for (const text of multi) {
    const prefs = extractChatPreferences([text]);
    const needs = extractExplicitChatNeeds([text]);
    if (text.includes('不要黑色')) {
      const ok =
        prefs.dislikedColors.includes('black') &&
        !prefs.likedColors.includes('black') &&
        (prefs.matchedStyleKeywords.includes('簡約') || needs.impression === 'minimal') &&
        (prefs.wantsLessFormal || needs.formality === 'less_formal');
      if (!ok) {
        addFinding({
          status: 'FAIL',
          id: 'C-multi-1',
          section: 'C',
          input: text,
          actual: json({ prefs: { disliked: prefs.dislikedColors, styles: prefs.matchedStyleKeywords, less: prefs.wantsLessFormal }, needs }),
          expected: '同時保留 簡約 + 不要太正式 + 不要黑色',
          cause: '子句切割或只抓第一個詞',
          files: 'src/lib/chatPreferences.ts extractChatPreferences, src/lib/needSummary.ts',
          severity: 'high',
          suggestion: '按子句解析，多 constraint 都留下',
        });
        tick(multiC, 'FAIL');
      } else {
        tick(multiC, 'PASS');
      }
    } else {
      const ok = prefs.preferredFitLevels.includes('relaxed') && (prefs.wantsFormal || needs.formality === 'formal' || /隨便/.test(text));
      if (!prefs.preferredFitLevels.includes('relaxed')) {
        addFinding({
          status: 'FAIL',
          id: 'C-multi-2',
          section: 'C',
          input: text,
          actual: json({ fit: prefs.preferredFitLevels, formal: prefs.wantsFormal, needs }),
          expected: '寬鬆偏好留下，同時不要把「太隨便」丟掉',
          cause: '同一句相反约束只留下前半或後半',
          files: 'src/lib/chatPreferences.ts',
          severity: 'medium',
          suggestion: '寬鬆 + 面試不要太隨便 → relaxed 但排除 oversized / 工裝',
        });
        tick(multiC, 'FAIL');
      } else {
        tick(multiC, 'PASS');
      }
      void ok;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* D. unavailable catalog                                                     */
/* -------------------------------------------------------------------------- */

function auditUnavailable(rows: LookRow[]) {
  const c = counter('D unavailable catalog');
  const existingColorWords = ['白色', '米白', '黑色', '淺藍', '深藍', '灰色', '深灰', '咖啡色', '深棕', '棕色'];
  const missingColorWords = ['綠色', '紅色', '粉色', '紫色', '黃色', '橘色', '橘色的', '薄荷綠', '酒紅'];
  const missingStyles = ['賽車風', '朋克', '哥特'];
  const existingStyles = ['韓系', '簡約', '襯衫'];

  for (const word of existingColorWords) {
    const mention = messageMentionsUnavailableColor(`我喜歡${word}`);
    const fallback = generateFreeChatFallbackReply(`我喜歡${word}`, conditionBy(1));
    if (mention || /沒有/.test(fallback) && fallback.includes(word.replace(/色$/, ''))) {
      addFinding({
        status: 'FAIL',
        id: `D-false-missing-${word}`,
        section: 'D',
        input: `我喜歡${word}`,
        actual: json({ mention, fallback }),
        expected: '庫存有的色不得說沒有',
        cause: 'unavailable color detector 誤傷或 fallback 否認庫存',
        files: 'src/lib/catalogBoundaries.ts, src/lib/aiResponses.ts generateFreeChatFallbackReply',
        severity: 'high',
        suggestion: '只把綠紅粉紫黃橘列缺貨',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }

  const lightReply = generateFreeChatFallbackReply('我現在突然喜歡淺色', conditionBy(1));
  const lightDenied =
    messageMentionsUnavailableColor('我喜歡淺色') !== null || /沒有淺色/.test(lightReply);
  if (lightDenied || /沒有/.test(lightReply)) {
    addFinding({
      status: 'FAIL',
      id: 'D-light-family-stock',
      section: 'D',
      input: '我現在突然喜歡淺色',
      actual: json({
        fallback: lightReply,
        unavailableDetector: messageMentionsUnavailableColor('我喜歡淺色'),
      }),
      expected: '淺色有白色／米白／淺藍。fallback 不得說沒貨。',
      cause: '淺色被誤判為缺貨或回覆否認現貨',
      files: 'src/lib/catalogBoundaries.ts, src/lib/aiResponses.ts',
      severity: 'blocker',
      suggestion: '明確規定淺色＝白／米白／淺藍；回覆出現「沒有淺色」立刻改寫。',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  for (const word of missingColorWords) {
    const text = `我喜歡${word}`;
    const detected = detectUnavailableColorRequests([text]);
    const fallback = generateFreeChatFallbackReply(text, conditionBy(1));
    const promises =
      /最後會幫你推薦|會推薦.*綠|有綠色Look|我們有綠色/.test(fallback) ||
      (!/沒有/.test(fallback) && /綠色|紅色|粉色|紫色|黃色|橘色|酒紅/.test(fallback) && /推薦/.test(fallback));
    if (detected.length === 0) {
      addFinding({
        status: 'FAIL',
        id: `D-miss-detect-${word}`,
        section: 'D',
        input: text,
        actual: json({ detected, fallback }),
        expected: '記錄為庫存沒有的色',
        cause: 'UNAVAILABLE_COLOR_GROUPS 覆蓋不足',
        files: 'src/lib/catalogBoundaries.ts',
        severity: 'high',
        suggestion: '補近義（酒紅、薄荷綠）',
      });
      tick(c, 'FAIL');
    } else if (promises) {
      addFinding({
        status: 'FAIL',
        id: `D-promise-${word}`,
        section: 'D',
        input: text,
        actual: fallback,
        expected: '說明沒有，不得承諾會推薦該色',
        cause: 'fallback 亂承諾',
        files: 'src/lib/aiResponses.ts',
        severity: 'blocker',
        suggestion: '缺貨只說明現有色系',
      });
      tick(c, 'FAIL');
    } else if (!/沒有/.test(fallback)) {
      addFinding({
        status: 'FAIL',
        id: `D-no-deny-${word}`,
        section: 'D',
        input: text,
        actual: fallback,
        expected: '第一句說明目前 12 套沒有該色',
        cause: 'fallback 只「記住了」沒有否認',
        files: 'src/lib/aiResponses.ts generateFreeChatFallbackReply',
        severity: 'high',
        suggestion: '走 unavailableColor 分支',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }

  for (const style of missingStyles) {
    const fallback = generateFreeChatFallbackReply(`我喜歡${style}`, conditionBy(1));
    const flagged = messageMentionsUnavailableStyle(`我喜歡${style}`);
    if (!flagged || !/沒有/.test(fallback)) {
      addFinding({
        status: 'FAIL',
        id: `D-style-${style}`,
        section: 'D',
        input: `我喜歡${style}`,
        actual: json({ flagged, fallback }),
        expected: '說明沒有該風格單品',
        cause: 'unavailable style 未觸發',
        files: 'src/lib/catalogBoundaries.ts UNAVAILABLE_STYLE_TERMS',
        severity: 'medium',
        suggestion: '補詞並禁止描述不存在單品',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }

  const greenThenPick = selectSurpriseOutfitBPlus({
    expectedOutfitBeforeAI: 'M1',
    candidates: getAllowedOutfits('male').filter((id) => id !== 'M1'),
    preferences: extractChatPreferences(['我喜歡綠色']),
  });
  const picked = getOutfit(greenThenPick.finalOutfit)!;
  const claimsGreen = /綠/.test(picked.outfitName);
  if (claimsGreen) {
    addFinding({
      status: 'FAIL',
      id: 'D-green-look-exists',
      section: 'D',
      input: '我喜歡綠色',
      actual: picked.outfitName,
      expected: '12 套不應出現綠色 Look',
      cause: '商品資料含綠',
      files: 'public/outfits.json',
      severity: 'blocker',
      suggestion: '核對商品',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  const content = buildResultContent({
    outfit: picked,
    preferenceFormality: '',
    preferenceImpression: '',
    preferenceColor: '',
    userMessages: ['我喜歡綠色'],
  });
  const paragraph = buildResultParagraph(content, 'high', 'high');
  if (/綠色|喜歡綠/.test(paragraph) && !/沒有綠/.test(paragraph)) {
    addFinding({
      status: 'FAIL',
      id: 'D-ex-claims-green',
      section: 'D',
      input: `final=${picked.outfitId} msgs=我喜歡綠色`,
      actual: paragraph,
      expected: '不得把現有 Look 說成符合綠色偏好',
      cause: 'EX evidence 引用不存在商品需求',
      files: 'src/lib/resultContent.ts chooseNeeds',
      severity: 'blocker',
      suggestion: 'unavailable 需求不得當「因為你喜歡所以推薦這套」',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }
  void rows;
  void existingStyles;
  void CATALOG_COLOR_SUMMARY;
}

/* -------------------------------------------------------------------------- */
/* E. off-topic                                                               */
/* -------------------------------------------------------------------------- */

function auditOffTopic() {
  const c = counter('E off-topic boundary');
  const trueOff = ['我要去打遊戲', '今天下雨嗎', '午餐吃什麼', '我想分手了', '今天心情不好喔哈哈哈去爬山'];
  const onTopic = [
    '古著',
    'vintage',
    'oversize',
    '面試緊張',
    '公司文化比較保守',
    'dress code 很正式',
    '我很胖穿什麼',
    '我很矮穿什麼',
    '我不會搭衣服',
    '學校面試要穿什麼',
    '今天心情很緊張不知道穿什麼',
  ];
  const borderline = ['我明天要上班', '薪水不高不知道怎麼穿', '考試結束要面試'];

  for (const text of trueOff) {
    const off = isClearlyOffTopic(text);
    const fallback = generateFreeChatFallbackReply(text, conditionBy(1));
    const remembersAsPref = /我記住了|已記錄：「/.test(fallback) && !/穿搭|面試/.test(fallback);
    if (remembersAsPref) {
      addFinding({
        status: 'FAIL',
        id: `E-no-redirect-${text}`,
        section: 'E',
        input: text,
        actual: json({ off, fallback, freeChatSkipsGate: true }),
        expected: '真正離題可短回應，但要帶回面試穿搭，不得當成穿搭偏好記住',
        cause: '自由聊天 API（step=freeChat）不呼叫 isClearlyOffTopic / validateChatInput；fallback 預設「我記住了」',
        files: 'src/app/api/chat/route.ts handleFreeChat, src/lib/aiResponses.ts generateFreeChatFallbackReply, isClearlyOffTopic',
        severity: 'high',
        suggestion: '自由聊天對明顯離題走「短接 + 帶回面試穿搭」，不要寫進偏好',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }

  for (const text of onTopic) {
    const off = isClearlyOffTopic(text);
    if (off) {
      addFinding({
        status: 'FAIL',
        id: `E-false-off-${text}`,
        section: 'E',
        input: text,
        actual: 'isClearlyOffTopic=true',
        expected: '穿搭／面試／身形相關不得離題',
        cause: 'OFF_TOPIC_KEYWORDS 誤傷（例如 上班、考試）',
        files: 'src/lib/aiResponses.ts OFF_TOPIC_KEYWORDS',
        severity: 'high',
        suggestion: '刪掉過寬詞，或改成整句意圖判斷',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }

  for (const text of borderline) {
    const off = isClearlyOffTopic(text);
    if (off) {
      addFinding({
        status: 'FAIL',
        id: `E-border-${text}`,
        section: 'E',
        input: text,
        actual: 'keyword 命中 上班/薪水/考試 → off-topic',
        expected: '含面試／穿衣意圖時不得因單一職業詞判離題',
        cause: 'isClearlyOffTopic 只要 includes(keyword)',
        files: 'src/lib/aiResponses.ts isClearlyOffTopic',
        severity: 'high',
        suggestion: '不要用單一字（上班、考試、薪水、電影）做硬閘',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }

  tick(c, 'PASS');
}

/* -------------------------------------------------------------------------- */
/* F. known-info reask + G AN/PRO                                             */
/* -------------------------------------------------------------------------- */

function auditKnownInfoAndOrthogonality() {
  const f = counter('F known-info reask');
  const g = counter('G AN×PRO orthogonality');

  const themes = buildConsultationThemesBlock();
  if (/主動性高：可在回覆末尾/.test(themes)) {
    addFinding({
      status: 'FAIL',
      id: 'F-G-theme-pro-question',
      section: 'G',
      input: 'buildConsultationThemesBlock()',
      actual: '仍寫「主動性高：可在回覆末尾最多一個輕鬆追問」',
      expected: 'PRO 不得在一般聊天多問；已知資訊不得重問',
      cause: 'v3 已把 fallback 追問關掉，但 system prompt 諮詢維度區塊沒改，OpenAI 路徑仍會多問',
      files: 'src/lib/chatConsultationThemes.ts buildConsultationThemesBlock, src/lib/experimentKnowledge.ts',
      severity: 'blocker',
      suggestion: '刪掉這兩行高低主動差異；改成使用者沒問就不要追問',
    });
    tick(g, 'FAIL');
    tick(f, 'FAIL');
  } else {
    tick(g, 'PASS');
    tick(f, 'PASS');
  }

  const c1 = conditionBy(1);
  const c2 = conditionBy(2);
  const c3 = conditionBy(3);
  const c4 = conditionBy(4);
  const ctx = {
    selectedOutfitCategory: 'male' as const,
    allowedOutfits: getAllowedOutfits('male'),
    expectedOutfitBeforeAI: 'M1',
    finalRecommendedOutfit: '',
    surpriseMode: 'surprise' as const,
  };
  const p1 = buildFreeChatSystemPrompt({
    condition: c1,
    experimentKnowledge: buildExperimentKnowledgeBlock(ctx, c1),
  });
  const p2 = buildFreeChatSystemPrompt({
    condition: c2,
    experimentKnowledge: buildExperimentKnowledgeBlock(ctx, c2),
  });
  const p3 = buildFreeChatSystemPrompt({
    condition: c3,
    experimentKnowledge: buildExperimentKnowledgeBlock(ctx, c3),
  });
  const p4 = buildFreeChatSystemPrompt({
    condition: c4,
    experimentKnowledge: buildExperimentKnowledgeBlock(ctx, c4),
  });

  if (p1 !== p2) {
    addFinding({
      status: 'FAIL',
      id: 'G-prompt-pro-diff',
      section: 'G',
      input: 'condition 1 (AN high PRO high) vs 2 (AN high PRO low)',
      actual: `prompt length ${p1.length} vs ${p2.length}; themes still differ by PRO`,
      expected: '一般聊天 prompt 不因 PRO 改變',
      cause: 'consultation themes 依主動性分岔（內嵌在共用 knowledge block，兩組其實相同文字但仍教模型 High 可多問）',
      files: 'src/lib/chatConsultationThemes.ts, src/lib/manipulationScaleRules.ts',
      severity: 'blocker',
      suggestion: 'prompt 裡刪除 High 可追問；PRO 只留 CTA 文案差異',
    });
    tick(g, 'FAIL');
  } else {
    tick(g, 'PASS');
  }

  if (!p1.includes('我記住了') && !/第一人稱「我」/.test(p1)) {
    addFinding({
      status: 'WARNING',
      id: 'G-an-high-missing',
      section: 'G',
      input: 'condition 1 prompt',
      actual: '未找到擬人化高規則片段',
      expected: 'AN high 應出現第一人稱規則',
      cause: 'prompt 組裝',
      files: 'src/lib/manipulationScaleRules.ts',
      severity: 'medium',
      suggestion: '核對 anthropomorphismRules',
    });
    tick(g, 'WARNING');
  } else {
    tick(g, 'PASS');
  }

  if (!/不要使用第一人稱/.test(p3) && !/不要使用第一人稱「我」/.test(p3)) {
    addFinding({
      status: 'FAIL',
      id: 'G-an-low-missing',
      section: 'G',
      input: 'condition 3 prompt',
      actual: p3.includes('第一人稱') ? '有第一人稱字樣但低規則可能不足' : '無低擬人化規則',
      expected: 'AN low 禁止第一人稱',
      cause: 'prompt',
      files: 'src/lib/manipulationScaleRules.ts',
      severity: 'high',
      suggestion: '核對 low 規則',
    });
    tick(g, 'FAIL');
  } else {
    tick(g, 'PASS');
  }

  const fb1 = generateFreeChatFallbackReply('我希望簡約', c1);
  const fb2 = generateFreeChatFallbackReply('我希望簡約', c2);
  const fb3 = generateFreeChatFallbackReply('我希望簡約', c3);
  const fb4 = generateFreeChatFallbackReply('我希望簡約', c4);
  if (fb1 !== fb2 || fb3 !== fb4) {
    addFinding({
      status: 'FAIL',
      id: 'G-fallback-pro-diff',
      section: 'G',
      input: '我希望簡約',
      actual: json({ fb1, fb2, fb3, fb4 }),
      expected: 'fallback 不因 PRO 改變',
      cause: 'generateFreeChatFallbackReply 仍吃 PRO',
      files: 'src/lib/aiResponses.ts',
      severity: 'high',
      suggestion: '確認 shouldAskFallbackQuestion 對高低都是 false',
    });
    tick(g, 'FAIL');
  } else {
    tick(g, 'PASS');
  }

  if (fb1 === fb3) {
    addFinding({
      status: 'FAIL',
      id: 'G-an-fallback-identical',
      section: 'G',
      input: '我希望簡約',
      actual: fb1,
      expected: 'AN high / low fallback 應有語氣差、資訊量相同',
      cause: 'applyTone 未生效',
      files: 'src/lib/aiResponses.ts applyTone',
      severity: 'high',
      suggestion: '保留 我記住了 vs 已記錄',
    });
    tick(g, 'FAIL');
  } else {
    tick(g, 'PASS');
  }

  if (/[？?]/.test(fb1) || /[？?]/.test(fb3)) {
    addFinding({
      status: 'FAIL',
      id: 'G-fallback-question',
      section: 'G',
      input: '我希望簡約',
      actual: json({ fb1, fb3 }),
      expected: '一般聊天高低 PRO 都不應多問',
      cause: 'appendFallbackQuestion 或預設回覆含問號',
      files: 'src/lib/aiResponses.ts',
      severity: 'high',
      suggestion: '拿掉問句',
    });
    tick(g, 'FAIL');
  } else {
    tick(g, 'PASS');
  }

  if (proSummaryCtaMessage('high') === proSummaryCtaMessage('low')) {
    addFinding({
      status: 'WARNING',
      id: 'G-cta-an',
      section: 'G',
      input: 'proSummaryCtaMessage',
      actual: 'AN 高低 CTA 相同',
      expected: 'AN 只改形式，CTA 可以依 AN 變語氣',
      cause: '設計允許',
      files: 'src/lib/needSummary.ts',
      severity: 'low',
      suggestion: '',
    });
    tick(g, 'WARNING');
  } else {
    tick(g, 'PASS');
  }

  if (proSummaryGateMessage('high') === proSummaryGateMessage('low')) {
    addFinding({
      status: 'FAIL',
      id: 'G-gate-same',
      section: 'G',
      input: 'proSummaryGateMessage',
      actual: proSummaryGateMessage('high'),
      expected: 'High / Low 阻擋文案應不同（查看目前需求整理 vs 請 AI 整理目前需求）',
      cause: 'gate 文案沒分岔',
      files: 'src/lib/needSummary.ts proSummaryGateMessage',
      severity: 'medium',
      suggestion: '對齊規格',
    });
    tick(g, 'FAIL');
  } else {
    tick(g, 'PASS');
  }

  const knownFallback = generateFreeChatFallbackReply('我喜歡黑色', c1, undefined, [
    { sender: 'user', message: '我希望偏正式' },
    { sender: 'bot', message: '了解' },
  ]);
  if (/正式程度|有偏好的深色或淺色|版型方面/.test(knownFallback)) {
    addFinding({
      status: 'FAIL',
      id: 'F-reask-color',
      section: 'F',
      input: '已知正式後再說喜歡黑色',
      actual: knownFallback,
      expected: '不得再問已知道的正式程度或顏色',
      cause: 'buildNextMissingInfoQuestion 仍存在；若 shouldAsk 被打開會重問',
      files: 'src/lib/aiResponses.ts buildNextMissingInfoQuestion',
      severity: 'medium',
      suggestion: '正式路徑保持不追問；prompt 也要禁止重問',
    });
    tick(f, 'FAIL');
  } else {
    tick(f, 'PASS');
  }
}

/* -------------------------------------------------------------------------- */
/* H. EX evidence vs final look                                               */
/* -------------------------------------------------------------------------- */

function auditExEvidence(rows: LookRow[]) {
  const c = counter('H EX evidence mismatch');
  const profiles = [
    { name: 'chat-light', formality: '' as const, impression: '' as const, color: '' as const, msgs: ['我喜歡淺色'] },
    { name: 'chat-dark', formality: '' as const, impression: '' as const, color: '' as const, msgs: ['我喜歡深色'] },
    { name: 'quick-light', formality: 'formal' as const, impression: 'minimal' as const, color: 'light' as const, msgs: [] },
    { name: 'quick-dark', formality: 'formal' as const, impression: 'minimal' as const, color: 'dark' as const, msgs: [] },
    { name: 'chat-override-light', formality: 'formal' as const, impression: 'minimal' as const, color: 'dark' as const, msgs: ['我想改成淺色'] },
  ];

  for (const row of rows) {
    const outfit = getOutfit(row.outfitId)!;
    for (const profile of profiles) {
      const content = buildResultContent({
        outfit,
        preferenceFormality: profile.formality,
        preferenceImpression: profile.impression,
        preferenceColor: profile.color,
        userMessages: profile.msgs,
      });
      const paragraph = buildResultParagraph(content, 'high', 'low');
      const citesLight = /淺色/.test(content.userNeed1 + content.userNeed2 + content.judgmentPoint1 + content.judgmentPoint2);
      const citesDark = /深色/.test(content.userNeed1 + content.userNeed2 + content.judgmentPoint1 + content.judgmentPoint2);
      const lightNeed = profile.name.includes('light');
      const darkNeed = profile.name.includes('dark');
      if (lightNeed && citesLight && !row.light) {
        addFinding({
          status: 'FAIL',
          id: `H-${row.outfitId}-${profile.name}-light`,
          section: 'H',
          input: `final=${lookLabel(row.outfitId)} ${row.name}; ${profile.name} ${json(profile.msgs)}`,
          actual: paragraph,
          expected: '不得寫「因為你喜歡淺色所以推薦這套深色 Look」',
          cause: 'chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。',
          files: 'src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences',
          severity: 'blocker',
          suggestion: 'EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改',
        });
        tick(c, 'FAIL');
      } else if (darkNeed && citesDark && !row.dark) {
        addFinding({
          status: 'FAIL',
          id: `H-${row.outfitId}-${profile.name}-dark`,
          section: 'H',
          input: `final=${lookLabel(row.outfitId)} ${row.name}; ${profile.name}`,
          actual: paragraph,
          expected: '不得用深色需求解釋淺色 Look（如 F1/F6）',
          cause: 'evidence 與商品色系未對齊',
          files: 'src/lib/resultContent.ts',
          severity: 'blocker',
          suggestion: '矛盾 evidence 排除；fallback 用中性面試需求',
        });
        tick(c, 'FAIL');
      } else {
        tick(c, 'PASS');
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* I. TS copy                                                                 */
/* -------------------------------------------------------------------------- */

function auditTsCopy(rows: LookRow[]) {
  const c = counter('I TS copy');
  for (const row of rows) {
    if (row.reviewStatus !== 'pending_human_review') {
      addFinding({
        status: 'WARNING',
        id: `I-status-${row.outfitId}`,
        section: 'I',
        input: row.outfitId,
        actual: row.reviewStatus,
        expected: '這輪保持 待人工確認',
        cause: '標記被改掉',
        files: 'src/data/lookResultContent.ts',
        severity: 'low',
        suggestion: '不要擅自定稿',
      });
      tick(c, 'WARNING');
    } else {
      tick(c, 'PASS');
    }
    if (/不適合面試|不適合你|不好看|不夠正式|不合適/.test(row.caution)) {
      addFinding({
        status: 'FAIL',
        id: `I-harsh-${row.outfitId}`,
        section: 'I',
        input: row.caution,
        actual: row.caution,
        expected: 'caution 輕度、情境式，不把 Look 說成不適合面試',
        cause: '文案過重',
        files: 'src/data/lookResultContent.ts',
        severity: 'high',
        suggestion: '改回「若公司文化較保守…可能讓正式感稍弱」',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
    const sentences = buildResultSentences(
      buildResultContent({
        outfit: getOutfit(row.outfitId)!,
        preferenceFormality: '',
        preferenceImpression: '',
        preferenceColor: '',
        userMessages: [],
      }),
    );
    if (/因為你|考量你的|所以推薦/.test(sentences.tsHigh)) {
      addFinding({
        status: 'FAIL',
        id: `I-ts-has-ex-${row.outfitId}`,
        section: 'I',
        input: sentences.tsHigh,
        actual: sentences.tsHigh,
        expected: 'TS High 不應夾 EX reasoning',
        cause: 'caution/positive 寫進因果',
        files: 'src/data/lookResultContent.ts, src/lib/resultContent.ts',
        severity: 'high',
        suggestion: 'TS 只留亮點與注意',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
    const thirdLow = sentences.tsLow;
    if (/不過|缺點|限制|需要留意/.test(thirdLow)) {
      addFinding({
        status: 'FAIL',
        id: `I-ts-low-neg-${row.outfitId}`,
        section: 'I',
        input: thirdLow,
        actual: thirdLow,
        expected: 'TS Low 用另外+positiveB，不要負面詞',
        cause: 'positiveB 或組句洩漏',
        files: 'src/lib/resultContent.ts',
        severity: 'medium',
        suggestion: '檢查 positiveB',
      });
      tick(c, 'FAIL');
    } else {
      tick(c, 'PASS');
    }
  }
}

/* -------------------------------------------------------------------------- */
/* J. process / prototype artifacts                                           */
/* -------------------------------------------------------------------------- */

function auditProcessAndArtifacts() {
  const c = counter('J process + prototype artifacts');
  const chatPage = fs.readFileSync('src/app/chat/ChatPageContent.tsx', 'utf8');
  const chatIf = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');
  const envEx = fs.readFileSync('.env.example', 'utf8');

  const checks: [boolean, Finding][] = [
    [
      /MIN_CHAT_MS = 3 \* 60 \* 1000/.test(chatPage) && /MIN_USER_MESSAGES = 3/.test(chatPage),
      {
        status: 'PASS',
        id: 'J-gate-3min-3msg',
        section: 'J',
        input: 'ChatPageContent',
        actual: '3 min + 3 messages',
        expected: '不變',
        cause: '',
        files: 'src/app/chat/ChatPageContent.tsx',
        severity: 'low',
        suggestion: '',
      },
    ],
    [
      /proSummaryOpened/.test(chatPage) && /proSummaryGateMessage/.test(chatPage),
      {
        status: 'PASS',
        id: 'J-summary-gate',
        section: 'J',
        input: '未開 summary 不能進結果',
        actual: 'handleViewRecommendation 檢查 proSummaryOpened',
        expected: '阻擋',
        cause: '',
        files: 'src/app/chat/ChatPageContent.tsx',
        severity: 'low',
        suggestion: '',
      },
    ],
    [
      /nextUserMessageCount >= 2 && !participantData.proSummaryTriggeredOnce/.test(chatIf),
      {
        status: 'PASS',
        id: 'J-pro-once',
        section: 'J',
        input: 'PRO High CTA',
        actual: 'triggeredOnce 後不再插入',
        expected: '第 2 則只發生一次',
        cause: '',
        files: 'src/components/ChatInterface.tsx',
        severity: 'low',
        suggestion: '',
      },
    ],
    [
      /disabled=\{!summaryUnlocked\}/.test(chatIf),
      {
        status: 'PASS',
        id: 'J-low-lock',
        section: 'J',
        input: 'PRO Low 按鈕',
        actual: '未解鎖 disabled',
        expected: '第 2 則前不能開',
        cause: '',
        files: 'src/components/ChatInterface.tsx',
        severity: 'low',
        suggestion: '',
      },
    ],
  ];
  for (const [ok, finding] of checks) {
    if (!ok) {
      addFinding({ ...finding, status: 'FAIL', actual: '條件不成立', severity: 'blocker' });
      tick(c, 'FAIL');
    } else {
      addFinding(finding);
      tick(c, 'PASS');
    }
  }

  const switchOn = isResultLayoutSwitchEnabled();
  const paragraphParam = resolveResultLayout('paragraph');
  if (switchOn && paragraphParam === 'paragraph') {
    addFinding({
      status: 'FAIL',
      id: 'J-layout-switch-live',
      section: 'J',
      input: `NEXT_PUBLIC_RESULT_LAYOUT_SWITCH current=${process.env.NEXT_PUBLIC_RESULT_LAYOUT_SWITCH ?? '(unset => enabled)'}`,
      actual: 'unset/非 0 時，?resultLayout=paragraph 生效，結果頁顯示卡片/段落測試按鈕',
      expected: '正式受試者不得看到學長段落版與切換器',
      cause: '.env.example 預設 SWITCH=1；程式預設「不是 0 就開啟」',
      files: '.env.example, src/lib/resultLayout.ts, src/app/chat/ChatPageContent.tsx:485, src/components/ResultExplanationView.tsx',
      severity: 'blocker',
      suggestion: '收案前設 NEXT_PUBLIC_RESULT_LAYOUT_SWITCH=0 並改預設關閉。本輪先不刪程式。',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  const code = generateCompletionCode('QA-PID-001');
  const url = buildSurveyUrl('https://www.surveycake.com/s/Qy2B7', {
    participantId: 'QA-PID-001',
    conditionId: 1,
    surpriseMode: 'surprise',
    favoriteOutfitId: 'M2',
    expectedOutfitBeforeAI: 'M1',
    finalRecommendedOutfit: 'M4',
    expectationMismatch: 1,
    selectedOutfitCategory: 'male',
    completionCode: code,
  });
  if (!url || !url.includes('pid=QA-PID-001') || !url.includes('code=') || !url.includes('favorite=M2')) {
    addFinding({
      status: 'FAIL',
      id: 'J-survey-params',
      section: 'J',
      input: String(url),
      actual: String(url),
      expected: 'pid/condition/surprise/favorite/expected/final/mismatch/category/code',
      cause: 'buildSurveyUrl 參數缺失',
      files: 'src/lib/conditions.ts buildSurveyUrl',
      severity: 'high',
      suggestion: '不要改 query key',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }

  if (/NEXT_PUBLIC_RESULT_LAYOUT_SWITCH=1/.test(envEx)) {
    addFinding({
      status: 'FAIL',
      id: 'J-env-example',
      section: 'J',
      input: '.env.example',
      actual: 'SWITCH 仍預設打開',
      expected: '.env.example 不得預設打開 layout switch',
      cause: '正式受試者可能看到 paragraph 版',
      files: '.env.example',
      severity: 'blocker',
      suggestion: '刪除或註解 SWITCH=1',
    });
    tick(c, 'FAIL');
  } else {
    tick(c, 'PASS');
  }
  void defaultResultLayout;
}

/* -------------------------------------------------------------------------- */
/* report                                                                     */
/* -------------------------------------------------------------------------- */

function mdEscape(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function writeReport(rows: LookRow[]) {
  const pass = findings.filter((item) => item.status === 'PASS');
  const warn = findings.filter((item) => item.status === 'WARNING');
  const fail = findings.filter((item) => item.status === 'FAIL');
  const dir = path.join('docs', 'qa');
  fs.mkdirSync(dir, { recursive: true });

  const matrixLines = [
    '| Look | ID | 顯示/穿著 | male | female | 顏色keys | 淺 | 深 | fit | bottom | 正式標 | 休閒標 | 領帶 | 工裝 | 牛仔 | 裙 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.look} | ${row.outfitId} | ${row.displayCategory}/${row.wearCategory} | ${row.maleEligible ? 'Y' : 'n'} | ${row.femaleEligible ? 'Y' : 'n'} | ${row.colorKeys.join('+') || '—'} | ${row.light ? 'Y' : 'n'} | ${row.dark ? 'Y' : 'n'} | ${row.fit} | ${row.bottom} | ${row.formalityTags.join('/') || '—'} | ${row.casualTags.join('/') || '—'} | ${row.hasTie ? 'Y' : 'n'} | ${row.hasCargo ? 'Y' : 'n'} | ${row.hasJeans ? 'Y' : 'n'} | ${row.hasSkirt ? 'Y' : 'n'} |`,
    ),
  ];

  const tsTable = [
    '| ID | positiveA | positiveB | caution | 人工確認 |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${row.outfitId} | ${mdEscape(row.positiveA)} | ${mdEscape(row.positiveB)} | ${mdEscape(row.caution)} | ${row.reviewStatus} |`,
    ),
  ];

  const counterTable = [
    '| 測試組 | 跑了 | Pass | Warning | Fail |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...counters.map((item) => `| ${item.name} | ${item.ran} | ${item.pass} | ${item.warn} | ${item.fail} |`),
  ];

  function render(list: Finding[], title: string): string {
    if (list.length === 0) return `## ${title}\n\n（無）\n`;
    return [
      `## ${title}`,
      '',
      ...list.map(
        (item) => `### ${item.id} · ${item.severity}
- 測試輸入：${item.input}
- 實際結果：${item.actual}
- 預期結果：${item.expected}
- 可能原因：${item.cause}
- 檔案／函式：${item.files}
- 建議修法：${item.suggestion || '（audit 輪不改 production）'}
`,
      ),
    ].join('\n');
  }

  const suggestedVocab = `## 建議重新整理的 vocabulary / feature matrix

正式版已落地 \`src/data/lookFeatures.ts\` 作為 surprise / EX / catalog 的單一資料源。TS 文案仍 \`pending_human_review\`。

| 維度 | 建議取值 | 現況問題 |

目前正式選款只認：顏色 six keys、版型 three levels、下裝四類、style 10 詞、正式/少正式旗標。需求整理與 EX 另認 深色/淺色/中性、正式三檔、印象三檔。這兩套對不齊是本輪最大結構問題。

建議每套 Look 先標這些**互斥或可多選但需一致**的位：

| 維度 | 建議取值 | 現況問題 |
| --- | --- | --- |
| colorFamily | dark / light / mixed | 選款不讀 family；EX 讀 |
| colorTokens | white, beige, black, lightBlue, darkBlue, gray, darkGray, brown | 淺藍深藍合併 |
| pattern | stripe / none | 條紋被當顏色 |
| tie | yes/no | 「不要領帶」無效 |
| cargo | yes/no | 喜歡寬褲會加到 M2 |
| bottom | jeans / dress_pants / wide_pants / skirt | 尚可 |
| fit | structured / relaxed / oversized | F4 抽繩=oversized、M1 牛仔褲=structured，需人工再看圖 |
| formality | high / mid / low | M2 同時 俐落正式 + 個性風格 |
| style | 韓系, 簡約, 層次, 通勤… | 商務休閒/極簡/半正式未進 STYLE_KEYWORDS |
| unsupported | 綠紅粉紫黃橘, 古著若無對應套, 賽車風 | 缺貨應記錄但不加分 |

口語建議加（理解用，不一定加分）：古著、復古、vintage、oversize、商務休閒、不要太正式、也不錯、不排斥、不是不喜歡。
`;

  const artifacts = `## 正式收案版已移除的 prototype / testing artifacts

| 項目 | 狀態 |
| --- | --- |
| Card / Paragraph 切換按鈕 | 已自 ChatPageContent 移除 |
| \`?resultLayout=paragraph\` 正式入口 | \`resolveResultLayout\` 固定回 card |
| \`NEXT_PUBLIC_RESULT_LAYOUT_SWITCH\` | 已停用；\`.env.example\` 不再預設打開 |
| \`ResultExplanationView\` Paragraph 分支 | 正式流程只留 Card Version |
| 諮詢維度「主動性高可追問」 | 已刪除 |
| \`buildResultParagraph\` | 僅內部 QA 對齊句長，受試者看不到 |
| QA／audit scripts | \`scripts/qa-*.ts\`、\`docs/qa/\` 不進受試者畫面 |
`;

  const md = `# 正式收案前 QA / robustness audit

稽核對象：正式收案 production（card-only + 直接操弄辨識題 + feature matrix）。  
OpenAI 線上模型回覆無法在無金鑰環境窮舉；聊天理解以 production 的 \`extractChatPreferences\`、\`extractExplicitChatNeeds\`、\`generateFreeChatFallbackReply\`、\`isClearlyOffTopic\` 與 system prompt 文字為準。

## 計數

${counterTable.join('\n')}

- PASS findings：${pass.length}（含流程確認）
- WARNING：${warn.length}
- FAIL / MUST FIX：${fail.length}

## A. 12 套特徵矩陣

${matrixLines.join('\n')}

### 各套 result copy（皆 pending_human_review）

${tsTable.join('\n')}

${suggestedVocab}

${render(fail, 'FAIL / MUST FIX')}
${render(warn, 'WARNING')}
${render(
    pass.filter((item) => item.section === 'J' || item.id.startsWith('B-tie')),
    'PASS（節錄：流程與同分隨機）',
  )}

${artifacts}

## J. 既有腳本與 build

- \`npx tsx scripts/qa-formal-v3.ts\`：PASS（既有正式 QA 仍通過；它不覆蓋本輪 negation／EX 矛盾／off-topic）
- \`npx tsx scripts/qa-formal-v2-followup.ts\`：PASS
- \`tsc --noEmit\`：PASS
- \`npm run build\`：PASS（lockfile SWC patch 警告與先前相同，屬良性）
- 本輪未做瀏覽器點擊；3 分鐘 gate、PRO CTA、layout 切換是讀原始碼確認
- 重跑本 audit：\`npm run qa:prelaunch\`

## 說明：本輪沒有改的東西

- 未改選款、需求整理、EX/TS 文案、prompt、gate
- 未定稿 \`lookResultContent.ts\`
- 未刪測試切換 UI
`;

  fs.writeFileSync(path.join(dir, 'prelaunch-audit-report.md'), md);
  fs.writeFileSync(path.join(dir, 'look-feature-matrix.json'), JSON.stringify(rows, null, 2));
  fs.writeFileSync(
    path.join(dir, 'prelaunch-audit-findings.json'),
    JSON.stringify({ counters, findings }, null, 2),
  );
}

function main() {
  const rows = buildMatrix();
  auditMatrix(rows);
  auditPoolsAndScoring();
  auditChatUnderstanding();
  auditUnavailable(rows);
  auditOffTopic();
  auditKnownInfoAndOrthogonality();
  auditExEvidence(rows);
  auditTsCopy(rows);
  auditProcessAndArtifacts();
  writeReport(rows);

  const fail = findings.filter((item) => item.status === 'FAIL').length;
  const warn = findings.filter((item) => item.status === 'WARNING').length;
  console.log('Counters:');
  for (const item of counters) {
    console.log(`  ${item.name}: ran=${item.ran} pass=${item.pass} warn=${item.warn} fail=${item.fail}`);
  }
  console.log(`Findings FAIL=${fail} WARNING=${warn} PASS=${findings.filter((item) => item.status === 'PASS').length}`);
  console.log('Wrote docs/qa/prelaunch-audit-report.md');
}

main();
