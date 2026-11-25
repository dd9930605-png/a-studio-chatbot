import { ColorFamily, ColorToken } from '@/data/lookFeatures';

export type PreferenceStrength = 'strong' | 'weak';

export const FASHION_STYLE_TERMS = [
  '古著',
  '復古',
  'vintage',
  'Vintage',
  'Y2K',
  'y2k',
  'old money',
  'quiet luxury',
  'clean fit',
  'oversize',
  'oversized',
  '韓系',
  '韓風',
  '商務休閒',
  '極簡',
  '通勤',
  '層次穿搭',
  '簡約',
  '俐落',
  '正式',
  '休閒',
  '合身',
  '寬鬆',
  '寬褲',
  '襯衫',
  '領帶',
  '西裝',
  '條紋',
  '工裝',
];

const TRUE_OFF_TOPIC =
  /打遊戲|玩遊戲|打電動|手遊|英雄聯盟|\blol\b|今天下雨|天氣如何|午餐吃|晚餐吃|早餐吃|我想分手|去爬山|去看電影|追劇|足球|籃球|棒球/;

const WEAK_EXACT =
  /^(都可以|還行|可以吧|應該可以|應該可以吧|好像不錯|隨便|隨便都可以|我穿都可以|不知道|沒差|無所謂|都行|還可以|算可以|好像還行|我都可以|嗯|哦|好|好啊|可以|可能吧|看你|不排斥)$/;

const WEAK_COLOR_OR_STYLE = /好像也可以|好像不錯|也不錯|也好|也行|也可以|還可以吧|應該還好/;

export function splitPreferenceClauses(message: string): string[] {
  return message
    .split(/[，,。！？?!；;\n]|但是|不過|可是|而且|(?<![不])但/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isWeakStandalone(clause: string): boolean {
  return WEAK_EXACT.test(clause.trim());
}

export function isWeakPreference(clause: string): boolean {
  if (isWeakStandalone(clause)) return true;
  return WEAK_COLOR_OR_STYLE.test(clause);
}

export function isAcceptanceNotRequest(clause: string): boolean {
  return /不排斥|不介意|不是不行|也不是不行|可以接受/.test(clause);
}

export function isSoftNegative(clause: string): boolean {
  return /不是很喜歡|不太喜歡|沒那麼喜歡|不是很想/.test(clause);
}

export function isStrongNegative(clause: string): boolean {
  if (isAcceptanceNotRequest(clause) || isSoftNegative(clause)) return false;
  return /不喜歡|討厭|不要|別推|不想要|不想穿|不想/.test(clause);
}

export function includesUnnegated(text: string, phrase: string): boolean {
  let from = 0;
  while (from <= text.length) {
    const index = text.indexOf(phrase, from);
    if (index < 0) return false;
    const before = text.slice(Math.max(0, index - 2), index);
    if (!before.endsWith('不') && !before.endsWith('沒') && !before.endsWith('非')) {
      return true;
    }
    from = index + phrase.length;
  }
  return false;
}

export function isFashionRelated(text: string): boolean {
  const lower = text.toLowerCase();
  if (FASHION_STYLE_TERMS.some((term) => lower.includes(term.toLowerCase()))) return true;
  return /穿|搭|衣|褲|裙|色|正式|面試|風格|版型|合身|寬鬆|領帶|襯衫/.test(text);
}

export function isOffTopicForPreferences(text: string): boolean {
  if (isFashionRelated(text)) return false;
  return TRUE_OFF_TOPIC.test(text);
}

export function clauseColorFamily(clause: string): ColorFamily | null {
  if (/深色系|深色|偏深|暗色/.test(clause)) return 'dark';
  if (/淺色系|淺色|偏淺|亮色/.test(clause)) return 'light';
  return null;
}

export function clauseColorTokens(clause: string): ColorToken[] {
  const found: ColorToken[] = [];
  const pairs: [ColorToken, string[]][] = [
    ['beige', ['米白', '米色']],
    ['white', ['白色']],
    ['lightBlue', ['淺藍']],
    ['darkBlue', ['深藍']],
    ['darkGray', ['深灰']],
    ['black', ['黑色', '黑']],
    ['gray', ['灰色', '灰']],
    ['brown', ['咖啡色', '深棕', '棕色', '咖啡', '棕']],
  ];
  for (const [token, terms] of pairs) {
    if (terms.some((term) => clause.includes(term))) found.push(token);
  }
  if (/藍色|藍/.test(clause) && !found.includes('lightBlue') && !found.includes('darkBlue')) {
    found.push('lightBlue', 'darkBlue');
  }
  return found;
}

export function clauseMentionsTie(clause: string): boolean {
  return /領帶/.test(clause);
}

export function clauseMentionsStripe(clause: string): boolean {
  return /條紋|細條紋/.test(clause);
}

export const STRONG_LIKE = /喜歡|偏好|想要|想穿|希望|傾向|比較想|改成|換成/;

export function isStrongLike(clause: string): boolean {
  if (isStrongNegative(clause) || isSoftNegative(clause) || isAcceptanceNotRequest(clause)) {
    return false;
  }
  if (isWeakPreference(clause)) return false;
  return STRONG_LIKE.test(clause) || /選|用/.test(clause);
}

export const AMBIGUOUS_STYLE_TYPOS: { typed: string; question: string }[] = [
  { typed: '韓式', question: '你是指韓系穿搭嗎？' },
  { typed: '簡要', question: '你是指簡約風格嗎？' },
];
