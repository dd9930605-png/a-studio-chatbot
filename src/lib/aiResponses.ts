import { Condition } from '@/lib/conditions';
import { ExperimentChatContext } from '@/lib/experimentKnowledge';
import { getOutfit } from '@/lib/outfits';

export type ResponseStep =
  | 'stylePreference'
  | 'bodyShape'
  | 'websitePreference'
  | 'koreanExperience'
  | 'usualStyle'
  | 'freeChat';

export interface ChatValidationResult {
  valid: boolean;
  rejectionMessage?: string;
}

const OFF_TOPIC_KEYWORDS = [
  '獸醫', '醫師', '醫生', '護士', '護理', '會計', '工程師', '程式', '寫程式',
  '天氣', '下雨', '晴天', '足球', '籃球', '棒球', '遊戲', '打電動', '玩遊戲', '打遊戲',
  '電影', '追劇', '唱歌', '煮飯', '做菜', '寵物', '貓咪', '狗狗', '數學', '物理',
  '化學', '歷史', '地理', '考試', '作業', '上班', '加班', '薪水', '吐司', '吃東西', '想吃',
  '英雄聯盟', '電競', '手遊', '魔獸', '寶可夢', '傳說對決', '吃雞', '打lol', '打LOL',
];

const OFF_TOPIC_PATTERNS = [
  /\blol\b/i,
  /打\s*lol/i,
  /玩\s*lol/i,
];

const SHORT_STYLE_TERMS = [
  '美式', '韓系', '日系', '歐美', '休閒', '正式', '簡約', '街頭', '運動', '商務',
  '高冷', '帥氣', '甜美', '知性', '幹練', '專業', '自然', '親切', '俐落', '百搭',
  '日常', '寬鬆', 'oversize', '西裝', '學院', '復古', '潮流', '古裝', '漢服', '民族',
];

const BODY_SHAPE_TERMS = [
  '肚子', '腰腹', '腰', '腿', '肩', '手臂', '胸', '臀', '比例', '顯瘦', '顯高', '修飾',
];

const SPECIFIC_RELEVANCE_KEYWORDS = [
  '穿', '搭', '服', '裝', '衣', '褲', '裙', '鞋', '外套', '西裝', '襯衫', '針織', '領帶',
  '面試', '正式', '休閒', '簡約', '風格', '款式', '穿搭', '造型', '形象', '顯瘦',
  '顯高', '修飾', '身材', '身形', '比例', '腰', '肩', '腿', '手臂', '韓系', '韓風',
  '購買', '買過', '偏好', '網站', '瀏覽', '感覺', '專業', '穩重',
  '親切', '自然', '自信', '俐落', '時尚', '百搭', '日常', '商務', '合身',
  '寬鬆', '顏色', '色系', '黑白', '素色', '乾淨', '整齊', '得體', '場合', '公司',
  '主管', '印象', '氣質', '精神', '好看', '苗條', '帥', '美', '酷',
  '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十',
  'look', '套',
];

const UNCERTAIN_PHRASES = ['忘記', '忘了', '不記得', '記不得', '想不起', '不確定', '记不清'];

function isUncertainAnswer(normalized: string): boolean {
  return UNCERTAIN_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function isUncertainUserAnswer(userInput: string): boolean {
  return isUncertainAnswer(userInput.trim());
}

function isNegativeKoreanExperienceAnswer(normalized: string): boolean {
  if (normalized === '沒有' || normalized === '无' || normalized === '沒') {
    return true;
  }
  return ['沒買', '不曾', '沒買過', '從未', '从未', '都沒有', '沒有買'].some((phrase) =>
    normalized.includes(phrase),
  );
}

export function getDeterministicAcknowledgment(
  step: ResponseStep,
  userInput: string,
  condition: Condition,
): string | null {
  const normalized = userInput.trim();

  if (step === 'freeChat' && /直接推薦|立刻推薦|現在推薦|直接給結果|看結果/.test(normalized)) {
    return applyTone(
      '我可以幫你推薦，不過為了讓建議更符合你的面試需求，我想再多了解一點你的偏好。你可以說說你希望整體更正式、親和，還是更有個人風格嗎？',
      condition,
    );
  }

  if (step === 'koreanExperience') {
    if (isNegativeKoreanExperienceAnswer(normalized) || isUncertainAnswer(normalized)) {
      return applyTone(
        '了解，你過去沒有或較少購買韓系服飾，我會以容易接受且適合面試的韓系風格作為推薦方向。',
        condition,
      );
    }
  }

  if (step === 'websitePreference' && isUncertainAnswer(normalized)) {
    return applyTone(
      '了解，你還不太確定喜歡哪一套，我會根據你其他的穿搭需求來推薦。',
      condition,
    );
  }

  return null;
}

function matchesKeyword(normalized: string, keyword: string, step: ResponseStep): boolean {
  if (!normalized.includes(keyword)) {
    return false;
  }

  if (keyword === '喜歡' && (normalized.includes('不喜歡') || isUncertainAnswer(normalized))) {
    return false;
  }

  if (keyword === '有' && step === 'koreanExperience') {
    if (
      isNegativeKoreanExperienceAnswer(normalized) ||
      normalized.includes('不曾') ||
      isUncertainAnswer(normalized)
    ) {
      return false;
    }
  }

  if (keyword === '有' && step === 'websitePreference') {
    if (normalized.includes('沒有') || isUncertainAnswer(normalized)) {
      return false;
    }
  }

  return true;
}

const STEP_HINTS: Record<ResponseStep, string> = {
  stylePreference: '請描述你希望這套面試穿搭給人的感覺（例如：專業、親切、自信）。',
  bodyShape: '請說明你希望修飾或強調的身形部位（例如：腰線、比例、顯瘦）。',
  websitePreference: '請說明你對剛才瀏覽的 12 套穿搭是否有符合喜好的款式，以及原因。',
  koreanExperience: '請描述你過去購買韓系服飾的經驗（例如：有/沒有、經常或偶爾）。',
  usualStyle: '請描述你平時的服飾款式或穿搭風格（例如：簡約、正式、韓系）。',
  freeChat: '請聚焦在面試穿搭需求，例如風格、正式度、顏色、身形修飾或搭配困擾。',
};

const KEYWORD_RULES: Record<ResponseStep, { keywords: string[]; response: string }[]> = {
  stylePreference: [
    {
      keywords: ['專業', '穩重', '正式', '面試', '嚴肅'],
      response: '了解，你希望整體看起來更正式專業，我會把面試場合需要的穩重感納入考量。',
    },
    {
      keywords: ['親切', '自然', '柔和', '友善'],
      response: '了解，你希望給人親切自然的感覺，我會優先考量能降低距離感的搭配。',
    },
    {
      keywords: ['自信', '精神', '俐落', '幹練'],
      response: '了解，你希望展現自信俐落的形象，我會把這個需求納入推薦考量。',
    },
    {
      keywords: ['時尚', '設計', '潮流', '有型'],
      response: '了解，你希望兼具專業與時尚感，我會留意整體風格的協調性。',
    },
    {
      keywords: ['高冷', '帥氣', '酷'],
      response: '了解，你希望呈現帥氣、有個性的形象，我會把這個風格方向納入推薦考量。',
    },
  ],
  bodyShape: [
    {
      keywords: ['胖', '肉', '肚子', '腰', '壯', '豐滿'],
      response: '了解，你比較在意身形修飾，我會優先考量能讓整體線條更俐落的穿搭。',
    },
    {
      keywords: ['矮', '身高', '腿短', '比例', '修長', '顯高'],
      response: '了解，你比較在意身高比例，我會優先考量能讓視覺比例更修長的搭配。',
    },
    {
      keywords: ['瘦', '單薄', '撐不起'],
      response: '了解，你希望穿搭能讓整體看起來更有份量感，我會把這個需求納入考量。',
    },
    {
      keywords: ['肩', '手臂', '腿', '胸'],
      response: '了解，你希望在穿搭上修飾特定部位，我會把這個需求納入推薦考量。',
    },
  ],
  websitePreference: [
    {
      keywords: ['忘記', '忘了', '不記得', '想不起', '不確定'],
      response: '了解，你還不太確定喜歡哪一套，我會根據你其他的穿搭需求來推薦。',
    },
    {
      keywords: ['沒有', '不符', '不喜歡', '都不'],
      response: '了解，你覺得網站上的款式不太符合喜好，我會根據你的描述來調整推薦方向。',
    },
    {
      keywords: ['有', '符合', '不錯'],
      response: '了解，你有找到符合喜好的款式，我會參考你的偏好來進行推薦。',
    },
    {
      keywords: ['喜歡'],
      response: '了解，你有找到符合喜好的款式，我會參考你的偏好來進行推薦。',
    },
    {
      keywords: ['簡約', '正式', '休閒', '韓系'],
      response: '了解，你對網站穿搭有明確的風格偏好，我會把這些資訊納入推薦考量。',
    },
  ],
  koreanExperience: [
    {
      keywords: ['沒有', '沒買', '不曾', '從未', '不確定'],
      response:
        '了解，你過去沒有或較少購買韓系服飾，我會以容易接受且適合面試的韓系風格作為推薦方向。',
    },
    {
      keywords: ['偶爾', '有時', '少數'],
      response: '了解，你有一些韓系服飾經驗，我會在推薦時平衡熟悉感與面試需求。',
    },
    {
      keywords: ['有', '常買', '經常', '習慣'],
      response: '了解，你有韓系服飾的購買經驗，我會參考你熟悉的風格來推薦。',
    },
  ],
  usualStyle: [
    {
      keywords: ['簡約', '休閒', '百搭', '日常'],
      response: '了解，你平時偏好簡約休閒風格，我會嘗試找到與面試場合平衡的搭配。',
    },
    {
      keywords: ['正式', '俐落', '商務', '西裝'],
      response: '了解，你平時就偏好正式俐落的穿搭，我會朝這個方向提供推薦。',
    },
    {
      keywords: ['韓系', '寬鬆', 'oversize'],
      response: '了解，你偏好韓系風格，我會在面試穿搭需求下調整推薦方向。',
    },
    {
      keywords: ['美式', '歐美', '日系', '街頭', '運動', '古裝', '漢服'],
      response: '了解，你平時偏好這類風格，我會在面試穿搭需求下調整推薦方向。',
    },
    {
      keywords: ['沒有', '不固定', '看場合'],
      response: '了解，我會根據面試情境的需求來提供適合的穿搭推薦。',
    },
  ],
  freeChat: [
    {
      keywords: ['推薦', '建議', '面試', '穿搭'],
      response: '了解，我會依照你剛提到的需求提供面試穿搭建議，並持續和你一起調整方向。',
    },
    {
      keywords: ['顏色', '正式', '風格', '比例', '顯瘦'],
      response: '了解，你的需求很明確，我會依這些條件整理更適合你的面試穿搭方向。',
    },
  ],
};

function applyTone(response: string, condition: Condition): string {
  if (condition.anthropomorphism === 'low') {
    return response
      .replace(/^了解，/, '已記錄：')
      .replace(/我會/g, '系統將')
      .replace(/我/g, '系統')
      .replace(/^抱歉，/, '提示：')
      .replace(/請再試一次/g, '請重新輸入');
  }

  return response;
}

function normalizeUserInput(input: string): string {
  return input.trim().replace(/[吧呢啊喔哦～~!！。,.，]/g, '');
}

/** 明顯離題：遊戲、職業、天氣等，優先於其他判斷。 */
export function isClearlyOffTopic(userInput: string): boolean {
  const normalized = userInput.trim();
  if (!normalized) {
    return true;
  }

  const compact = normalizeUserInput(normalized);
  if (!compact) {
    return true;
  }

  if (OFF_TOPIC_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (/^(.)\1{2,}$/.test(compact)) {
    return true;
  }

  return false;
}

/** 有穿搭／當前問題相關訊號：用於接受邊界有效回答（如古裝、第一套）。 */
export function hasOutfitRelevanceSignal(step: ResponseStep, userInput: string): boolean {
  const normalized = userInput.trim();
  if (!normalized || isClearlyOffTopic(normalized)) {
    return false;
  }

  if (matchesShortStyleTerm(normalized)) {
    return true;
  }

  if (
    (step === 'bodyShape' || step === 'stylePreference') &&
    matchesBodyShapeTerm(normalized)
  ) {
    return true;
  }

  if (getStepKeywords(step).some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  return SPECIFIC_RELEVANCE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function matchesShortStyleTerm(normalized: string): boolean {
  const compact = normalizeUserInput(normalized);
  return SHORT_STYLE_TERMS.some(
    (term) => compact === term || compact.includes(term) || term.includes(compact),
  );
}

function matchesBodyShapeTerm(normalized: string): boolean {
  return BODY_SHAPE_TERMS.some((term) => normalized.includes(term));
}

function getStepKeywords(step: ResponseStep): string[] {
  return KEYWORD_RULES[step].flatMap((rule) => rule.keywords);
}

export function validateChatInput(
  step: ResponseStep,
  userInput: string,
  condition: Condition,
): ChatValidationResult {
  const normalized = userInput.trim();

  if (isClearlyOffTopic(normalized)) {
    const message =
      condition.anthropomorphism === 'high'
        ? `抱歉，「${normalized}」似乎與面試穿搭無關。${STEP_HINTS[step]}`
        : `輸入內容與面試穿搭無關。${STEP_HINTS[step]}`;
    return { valid: false, rejectionMessage: applyTone(message, condition) };
  }

  if (hasOutfitRelevanceSignal(step, normalized)) {
    return { valid: true };
  }

  const message =
    condition.anthropomorphism === 'high'
      ? `抱歉，我不太確定這是否與穿搭有關。${STEP_HINTS[step]}`
      : `輸入內容無法判斷為穿搭相關。${STEP_HINTS[step]}`;
  return { valid: false, rejectionMessage: applyTone(message, condition) };
}

const ACCESSORY_PATTERN =
  /項鍊|耳環|戒指|手錶|墨鏡|太陽眼鏡|帽子|圍巾|包包|鞋|球鞋|皮鞋|高跟|靴|配件|銀飾|金飾/;

/** 無 OpenAI 時的自由對話備援，不做關鍵字篩選。 */
export function generateFreeChatFallbackReply(
  userInput: string,
  condition: Condition,
  experimentContext?: ExperimentChatContext,
): string {
  const trimmed = userInput.trim();
  const topic = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;

  if (ACCESSORY_PATTERN.test(trimmed)) {
    return applyTone(
      '本網站目前僅提供上衣與下裝（及套裝內含的領帶等）組合建議，不包含配件。我們可以專注在面試服裝的版型、顏色與正式度。',
      condition,
    );
  }

  if (/約會|咖啡廳|聚餐|旅遊/.test(trimmed)) {
    return applyTone(
      '了解你的場合需求。這次我們聚焦在面試穿搭，我會依你的職業與偏好來討論正式度與風格。',
      condition,
    );
  }

  if (experimentContext && /推薦|推薦什麼|會推薦|穿什麼/.test(trimmed)) {
    const final = getOutfit(experimentContext.finalRecommendedOutfit);
    if (final) {
      return applyTone(
        `依我們剛才的對話，結果頁會為你呈現「${final.outfitName}」這類方向的面試搭配；詳細內容請在互動結束後查看推薦結果。`,
        condition,
      );
    }
  }

  if (experimentContext && condition.proactivity === 'high') {
    return applyTone(
      `了解，你提到「${topic}」。我會依面試情境，從網站上的 12 套穿搭方向來整理適合你的正式度與色系。你還想補充身形修飾或風格偏好嗎？`,
      condition,
    );
  }

  if (condition.anthropomorphism === 'high') {
    if (condition.proactivity === 'high') {
      return applyTone(
        `了解，你提到「${topic}」。我會把這個需求納入面試穿著的考量，並依你的職業與場合調整正式度與版型。你還想補充偏好的顏色或風格嗎？`,
        condition,
      );
    }
    return applyTone(`了解，我會把「${topic}」納入你的面試穿搭建議。`, condition);
  }

  if (condition.proactivity === 'high') {
    return applyTone(
      `已收到需求：「${topic}」。建議可從正式度、色系與身形修飾三方面調整面試穿搭。`,
      condition,
    );
  }

  return applyTone(`已收到：「${topic}」，將納入穿著建議參考。`, condition);
}

export function generateAcknowledgment(
  step: ResponseStep,
  userInput: string,
  condition: Condition,
): string {
  if (condition.proactivity === 'low') {
    const shortReply =
      condition.anthropomorphism === 'high'
        ? '了解，已記下你的回答。'
        : '已記錄使用者輸入。';
    return applyTone(shortReply, condition);
  }

  const deterministic = getDeterministicAcknowledgment(step, userInput, condition);
  if (deterministic) {
    return deterministic;
  }

  const rules = KEYWORD_RULES[step];
  const normalized = userInput.trim();

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => matchesKeyword(normalized, keyword, step))) {
      return applyTone(rule.response, condition);
    }
  }

  const fallback =
    condition.anthropomorphism === 'high'
      ? `了解，我會將你提到的「${userInput}」納入穿搭推薦考量。`
      : `已記錄使用者輸入：「${userInput}」。系統將納入推薦分析。`;

  return fallback;
}

export const CHAT_PROMPTS: Record<
  ResponseStep,
  { question: string; answerKey: keyof import('@/lib/dataRecorder').ParticipantAnswers; nextStep: string }
> = {
  stylePreference: {
    question: '你希望這套面試穿搭給人什麼感覺？',
    answerKey: 'stylePreferenceInput',
    nextStep: 'bodyShape',
  },
  bodyShape: {
    question: '你在面試穿搭上比較希望修飾或強調哪個部分？',
    answerKey: 'bodyShapeInput',
    nextStep: 'websitePreference',
  },
  websitePreference: {
    question: '您剛剛瀏覽的網站穿搭中，有沒有符合您喜好的款式？請說明原因。',
    answerKey: 'websitePreferenceInput',
    nextStep: 'koreanExperience',
  },
  koreanExperience: {
    question: '您過去是否購買過韓系服飾？請簡單描述您的經驗。',
    answerKey: 'koreanClothingExperienceInput',
    nextStep: 'usualStyle',
  },
  usualStyle: {
    question: '請描述您平時較常購買的服飾款式或穿搭風格。',
    answerKey: 'usualStyleInput',
    nextStep: 'recommendation',
  },
  freeChat: {
    question: '請自由描述你的面試穿搭需求。',
    answerKey: 'usualStyleInput',
    nextStep: 'freeChat',
  },
};
