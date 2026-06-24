import { Condition } from '@/lib/conditions';

export type ResponseStep =
  | 'stylePreference'
  | 'bodyShape'
  | 'websitePreference'
  | 'koreanExperience'
  | 'usualStyle';

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

function matchesKeyword(normalized: string, keyword: string, step: ResponseStep): boolean {
  if (!normalized.includes(keyword)) {
    return false;
  }

  if (keyword === '喜歡' && (normalized.includes('不喜歡') || isUncertainAnswer(normalized))) {
    return false;
  }

  if (keyword === '有' && step === 'koreanExperience') {
    if (normalized.includes('沒有') || normalized.includes('沒買') || normalized.includes('不曾')) {
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
      keywords: ['有', '常買', '經常', '習慣'],
      response: '了解，你有韓系服飾的購買經驗，我會參考你熟悉的風格來推薦。',
    },
    {
      keywords: ['沒有', '沒買', '不曾', '不確定'],
      response: '了解，我會以容易接受且適合面試的韓系風格作為推薦方向。',
    },
    {
      keywords: ['偶爾', '有時', '少數'],
      response: '了解，你有一些韓系服飾經驗，我會在推薦時平衡熟悉感與面試需求。',
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

  const rules = KEYWORD_RULES[step];
  const normalized = userInput.trim();

  if (step === 'websitePreference' && isUncertainAnswer(normalized)) {
    return applyTone(
      '了解，你還不太確定喜歡哪一套，我會根據你其他的穿搭需求來推薦。',
      condition,
    );
  }

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
};
