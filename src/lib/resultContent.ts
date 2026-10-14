import { LOOK_RESULT_CONTENT, LookResultCopy, getLookResultCopy } from '@/data/lookResultContent';
import { ExEvidenceItem } from '@/lib/dataRecorder';
import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { NeedField, NeedSummary, buildNeedSummary } from '@/lib/needSummary';
import { Outfit } from '@/lib/outfits';
import { QuickColor, QuickFormality, QuickImpression } from '@/lib/quickPreferences';

const SCENARIO_NEED_1 = '面試需要整潔合宜';
const SCENARIO_NEED_2 = '正式程度保持適中';
const SCENARIO_JUDGMENT_1 = '整潔與合宜的正式度';
const SCENARIO_JUDGMENT_2 = '線條清楚且不過度休閒';

const JUDGMENT_BY_VALUE: Record<string, string> = {
  偏正式: '正式感清楚、保持整潔',
  適中: '正式度適中、保持整潔',
  不要太正式: '避免過度拘謹、保持整潔',
  專業穩重: '穩重可靠的整體印象',
  簡約俐落: '線條清楚、配色單純',
  親和自然: '不過度嚴肅、保留親近感',
  深色系: '深色且對比清楚的配色',
  淺色系: '淺色且視覺乾淨的配色',
  中性色: '中性且低調的配色',
};

const FALLBACK_COPY: LookResultCopy = {
  outfitId: '',
  reviewStatus: 'pending_human_review',
  colorAttribute: '以這套單品的顏色為主',
  fitAttribute: '以上衣與下裝的輪廓為主',
  styleAttribute: '面試穿搭',
  positiveA: '整體線條清楚，顏色也單純。',
  positiveB: '搭配完整，沒有多餘的裝飾細節。',
  caution: '若公司文化較保守，較休閒的輪廓可能讓正式感稍弱。',
};

export interface ResultContent {
  userNeed1: string;
  userNeed2: string;
  judgmentPoint1: string;
  judgmentPoint2: string;
  neutralLookAttribute1: string;
  neutralLookAttribute2: string;
  neutralLookAttribute3: string;
  positiveA: string;
  positiveB: string;
  caution: string;
  finalLookId: string;
  finalLookName: string;
  finalLookLabel: string;
  evidenceItems: ExEvidenceItem[];
  positiveAId: string;
  positiveBId: string;
  cautionId: string;
}

function phraseNeed(field: NeedField): string {
  if (field.source === 'chat') return `你在對話中提到希望${field.value}`;
  if (field.source === 'quick_preference') return `你選擇：${field.value}`;
  return field.value;
}

function judgmentFor(field: NeedField): string {
  if (field.value === SCENARIO_NEED_1) return SCENARIO_JUDGMENT_1;
  if (field.value === SCENARIO_NEED_2) return SCENARIO_JUDGMENT_2;
  return JUDGMENT_BY_VALUE[field.value] ?? SCENARIO_JUDGMENT_1;
}

function scenarioField(value: string): NeedField {
  return { label: '情境', value, source: 'none', substantive: false };
}

function chooseNeeds(summary: NeedSummary): [NeedField, NeedField] {
  const ranked = [summary.formality, summary.impression, summary.color]
    .filter((field) => field.substantive)
    .sort((a, b) => {
      const rank = (source: NeedField['source']) => (source === 'chat' ? 0 : 1);
      return rank(a.source) - rank(b.source);
    });

  const first = ranked[0] ?? scenarioField(SCENARIO_NEED_1);
  const second = ranked[1] ?? scenarioField(ranked[0] ? SCENARIO_NEED_2 : SCENARIO_NEED_2);
  if (!ranked[0]) {
    return [scenarioField(SCENARIO_NEED_1), scenarioField(SCENARIO_NEED_2)];
  }
  if (!ranked[1]) {
    return [first, scenarioField(SCENARIO_NEED_2)];
  }
  return [first, second];
}

function evidenceOf(field: NeedField): ExEvidenceItem {
  if (field.source === 'chat' || field.source === 'quick_preference') {
    return { value: field.value, source: field.source };
  }
  return { value: field.value, source: 'scenario' };
}

export function buildResultContent(input: {
  outfit: Outfit;
  preferenceFormality: QuickFormality | '';
  preferenceImpression: QuickImpression | '';
  preferenceColor: QuickColor | '';
  userMessages: string[];
}): ResultContent {
  const summary = buildNeedSummary(input);
  const [need1, need2] = chooseNeeds(summary);
  const copy = getLookResultCopy(input.outfit.outfitId) ?? {
    ...FALLBACK_COPY,
    outfitId: input.outfit.outfitId,
  };
  const lookNumber = getLookNumberFromOutfitId(input.outfit.outfitId);

  return {
    userNeed1: phraseNeed(need1),
    userNeed2: phraseNeed(need2),
    judgmentPoint1: judgmentFor(need1),
    judgmentPoint2: judgmentFor(need2),
    neutralLookAttribute1: copy.colorAttribute,
    neutralLookAttribute2: copy.fitAttribute,
    neutralLookAttribute3: copy.styleAttribute,
    positiveA: copy.positiveA,
    positiveB: copy.positiveB,
    caution: copy.caution,
    finalLookId: input.outfit.outfitId,
    finalLookName: input.outfit.outfitName,
    finalLookLabel: lookNumber ? getLookLabel(lookNumber) : input.outfit.outfitId,
    evidenceItems: [evidenceOf(need1), evidenceOf(need2)],
    positiveAId: `${input.outfit.outfitId}-positiveA`,
    positiveBId: `${input.outfit.outfitId}-positiveB`,
    cautionId: `${input.outfit.outfitId}-caution`,
  };
}

function textLength(text: string): number {
  return Array.from(text).length;
}

function padClause(sentence: string, addition: string): string {
  return sentence.replace(/。$/, `，${addition}。`);
}

/** 把較短的那句補上中性子句，讓 EX 或 TS 的高低句長接近。 */
function alignToLonger(
  longerCandidateA: string,
  longerCandidateB: string,
  padsA: string[],
  padsB: string[],
): [string, string] {
  let left = longerCandidateA;
  let right = longerCandidateB;
  let indexA = 0;
  let indexB = 0;

  while (Math.abs(textLength(left) - textLength(right)) > 2 && (indexA < padsA.length || indexB < padsB.length)) {
    if (textLength(left) + 2 < textLength(right) && indexA < padsA.length) {
      left = padClause(left, padsA[indexA]);
      indexA += 1;
      continue;
    }
    if (textLength(right) + 2 < textLength(left) && indexB < padsB.length) {
      right = padClause(right, padsB[indexB]);
      indexB += 1;
      continue;
    }
    break;
  }

  return [left, right];
}

function stripEnding(text: string): string {
  return text.replace(/。+$/, '');
}

const EX_HIGH_PADS = ['這兩項是本次判斷重點', '推薦對應這兩項重點'];
const EX_LOW_PADS = ['顏色、輪廓與風格都列在上面', '三項都屬於這套的外觀'];
const TS_HIGH_PADS = ['請一併看這個情境'];
const TS_LOW_PADS = ['這也是這套的亮點'];

export interface ResultSentences {
  shared: string;
  exHigh: string;
  exLow: string;
  tsHigh: string;
  tsLow: string;
}

export function buildResultSentences(content: ResultContent): ResultSentences {
  const shared = `本次推薦 ${content.finalLookLabel}「${content.finalLookName}」，作為面試穿搭。`;
  const exHigh = `需求是${content.userNeed1}，以及${content.userNeed2}；判斷重點是${content.judgmentPoint1}，以及${content.judgmentPoint2}。`;
  const exLow = `色系是${content.neutralLookAttribute1}，版型是${content.neutralLookAttribute2}，整體風格是${content.neutralLookAttribute3}。`;
  const [alignedExHigh, alignedExLow] = alignToLonger(exHigh, exLow, EX_HIGH_PADS, EX_LOW_PADS);

  const highlight = stripEnding(content.positiveA);
  const tsHigh = `亮點是${highlight}，不過${stripEnding(content.caution)}。`;
  const tsLow = `亮點是${highlight}，另外${stripEnding(content.positiveB)}。`;
  const [alignedTsHigh, alignedTsLow] = alignToLonger(tsHigh, tsLow, TS_HIGH_PADS, TS_LOW_PADS);

  return {
    shared,
    exHigh: alignedExHigh,
    exLow: alignedExLow,
    tsHigh: alignedTsHigh,
    tsLow: alignedTsLow,
  };
}

export function buildResultParagraph(
  content: ResultContent,
  explainability: 'high' | 'low',
  twoSidedMessage: 'high' | 'low',
): string {
  const sentences = buildResultSentences(content);
  const ex = explainability === 'high' ? sentences.exHigh : sentences.exLow;
  const ts = twoSidedMessage === 'high' ? sentences.tsHigh : sentences.tsLow;
  return `${sentences.shared}${ex}${ts}`;
}

export function countSentences(paragraph: string): number {
  return paragraph.split('。').filter((part) => part.trim().length > 0).length;
}

export function describeResultModules(
  explainability: 'high' | 'low',
  twoSidedMessage: 'high' | 'low',
): string[] {
  const explanation =
    explainability === 'high'
      ? ['你的需求', 'AI 判斷重點', '本次推薦']
      : ['色系', '版型', '整體風格', '本次推薦'];
  const evaluation =
    twoSidedMessage === 'high' ? ['推薦亮點', '需要注意'] : ['推薦亮點', '另一項亮點'];
  return ['AI 穿搭推薦', ...explanation, 'AI 穿搭評估', ...evaluation];
}

export function listLookResultOutfitIds(): string[] {
  return Object.keys(LOOK_RESULT_CONTENT);
}
