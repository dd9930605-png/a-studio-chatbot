import { outfits, getOutfit } from '@/lib/outfits';

/** 網站 12 套穿搭實際有的色系（供 AI 與選款參考） */
export const CATALOG_COLOR_SUMMARY =
  '白色、米白、黑色、淺藍、深藍、灰色、深灰、咖啡色、深棕、棕色、條紋';

const UNAVAILABLE_COLOR_GROUPS: { label: string; terms: string[] }[] = [
  { label: '綠色', terms: ['綠色', '綠', '墨綠', '橄欖綠', '草綠'] },
  { label: '紅色', terms: ['紅色', '紅', '酒紅', '橘紅'] },
  { label: '粉色', terms: ['粉色', '粉', '粉紅', '玫瑰粉'] },
  { label: '紫色', terms: ['紫色', '紫', '薰衣草'] },
  { label: '黃色', terms: ['黃色', '黃', '杏色'] },
  { label: '橘色', terms: ['橘色', '橘', '橙色'] },
];

/** 庫存沒有、不應假裝存在的風格關鍵字 */
const UNAVAILABLE_STYLE_TERMS = [
  '賽車風',
  '賽車',
  '朋克',
  '哥特',
  '哥德',
  '嘻哈',
  '龐克',
];

const PANTS_LIKE_MARKERS = ['褲', '西褲', '牛仔褲', '寬褲', '長褲', '直筒褲', '工裝褲'];
const SKIRT_LIKE_MARKERS = ['裙', '及膝裙', '半身裙'];

const PREFERS_PANTS_MARKERS = [
  '喜歡褲',
  '偏好褲',
  '想要褲',
  '習慣褲',
  '愛穿褲',
  '想穿褲',
  '比較想穿褲',
  '下裝想穿褲',
  '不要裙',
  '不喜歡裙',
  '討厭裙',
  '不穿裙',
];

const PREFERS_SKIRT_MARKERS = ['喜歡裙', '偏好裙', '想要裙', '習慣裙', '愛穿裙', '想穿裙'];

export function outfitIsSkirt(outfitId: string): boolean {
  const outfit = getOutfit(outfitId);
  if (!outfit) return false;
  return SKIRT_LIKE_MARKERS.some((term) => outfit.outfitName.includes(term));
}

export function outfitIsPants(outfitId: string): boolean {
  return !outfitIsSkirt(outfitId);
}

export function detectUnavailableColorRequests(userMessages: string[]): string[] {
  const found = new Set<string>();
  for (const message of userMessages) {
    for (const group of UNAVAILABLE_COLOR_GROUPS) {
      if (group.terms.some((term) => message.includes(term))) {
        found.add(group.label);
      }
    }
  }
  return Array.from(found);
}

export function messageMentionsUnavailableColor(message: string): string | null {
  for (const group of UNAVAILABLE_COLOR_GROUPS) {
    if (group.terms.some((term) => message.includes(term))) {
      return group.label;
    }
  }
  return null;
}

export function detectBottomPreference(userMessages: string[]): 'pants' | 'skirt' | null {
  let pantsScore = 0;
  let skirtScore = 0;

  for (const message of userMessages) {
    const hasDislike = /不喜歡|討厭|不要|不穿|排斥/.test(message);

    if (PREFERS_PANTS_MARKERS.some((m) => message.includes(m))) {
      if (hasDislike && message.includes('裙')) {
        pantsScore += 3;
      } else if (!hasDislike) {
        pantsScore += 2;
      }
    }

    if (PREFERS_SKIRT_MARKERS.some((m) => message.includes(m)) && !hasDislike) {
      skirtScore += 2;
    }

    if (!hasDislike && PANTS_LIKE_MARKERS.some((m) => message.includes(m))) {
      if (/喜歡|偏好|想要|希望|愛|習慣/.test(message)) {
        pantsScore += 1;
      }
    }
  }

  if (pantsScore > skirtScore && pantsScore > 0) return 'pants';
  if (skirtScore > pantsScore && skirtScore > 0) return 'skirt';
  return null;
}

export function buildCatalogBoundaryPromptBlock(): string {
  return `### 網站庫存色系與下裝邊界（必須遵守）
- **網站現有 12 套面試穿搭的色系僅包含**：${CATALOG_COLOR_SUMMARY}。
- **網站沒有**：綠色、紅色、粉色、紫色、黃色、橘色等單品；**禁止**假裝有這些顏色的衣服，也**禁止**與使用者長聊「綠色/紅色…該怎麼搭」彷彿庫存中有售。
- 若使用者想要庫存沒有的顏色（例如綠色、紫色）或風格（例如賽車風、街頭龐克）：
  1. **第一句就要說明**本網站目前沒有該色單品；
  2. 邀請使用者改從**現有色系**（白、黑、藍、灰、咖啡、條紋）中討論面試需求；
  3. 可建議「若重視 X 印象，現有庫存中可考慮藍/灰/白等方向」，**不要**繼續描述不存在的綠色穿搭。
- 女款下裝包含**褲裝**與**及膝裙**（F5、F6）；男款與中性款以**褲裝**為主。
- 若使用者明確偏好**褲裝**或**不要裙裝**，聊天與最終推薦都**不可**以裙裝為主軸；須在現有褲裝搭配中討論。`;
}

export function messageMentionsUnavailableStyle(message: string): boolean {
  return UNAVAILABLE_STYLE_TERMS.some((term) => message.includes(term));
}

export function buildConversationRhythmBlock(): string {
  return `### 對話節奏與模擬情境（必須遵守）

#### 這是模擬面試穿搭情境
- 使用者是在**假想**準備面試，不是真的要去某一家公司面試。
- **禁止追問**真實公司名稱、產業、公司文化、新創或傳產、外商或本土等**現實求職細節**。
- 可以問的是**抽象面試印象**（想顯得專業、親和、俐落、有用心準備），以及色系、版型、身形修飾、緊張心情等。

#### 避免重複與空泛推銷
- 同一場對話中，**完整描述「白襯衫＋黑褲」或同一套組合最多 1 次**；之後改聊其他維度（條紋、咖啡色系、修身或寬鬆、整體乾淨感）。
- **禁止**每輪結尾都問「您有興趣嗎／您覺得呢」；追問一次即可，不要連續追問。

#### 使用者已點頭時（還行、行呀、可以、好）
- 若使用者**連續兩次**簡短表示同意或沒意見，**不要再開新的偏好問題**。
- 改為：簡短肯定＋提醒互動結束後可在結果頁看完整推薦，或輕鬆聊面試心情／緊張感即可。

#### 使用者強烈排斥某色系後
- 對方若明確說「很討厭／不要」某色，**之後禁止再提起該色系**作為建議選項。
- 專業說服最多 1 次；若仍拒絕，只談庫存內其他色系或版型。`;
}

export function buildProfessionalConsultantBlock(): string {
  return `### 專業顧問立場（不是單純討好使用者）
- 你是**有專業判斷的穿搭顧問**，不是只會說「好的、了解」的客服。
- 當使用者偏好與**面試正式需求**可能衝突時，可以**禮貌但明確**表達不同看法，例如：
  - 「我理解您不太偏好黑色，但以面試顧問的角度，深色系有時能傳達穩重；我們可以在現有搭配中找您更能接受的深灰或藍色方案。」
  - 「您希望更休閒，但這次是面試情境，我會建議在現有庫存裡優先考慮半正式、俐落的選項。」
- **專業說服的原則**：
  1. 先同理對方的偏好（1 句）；
  2. 再提出顧問觀點與面試情境理由（1–2 句）；
  3. 把選擇導回**網站現有 12 套**中的合理方向；
  4. **同一個「不喜歡」話題最多專業說服 1 次**；若使用者再次明確拒絕，**停止提及該色系**，改談庫存內其他顏色或版型。
- **禁止**：使用者已連續、明確拒絕某元素後，仍每輪硬推同一色系或裙/褲選擇。`;
}

export function getCatalogOutfitSummaryForPrompt(): string {
  return outfits
    .map((o) => `- ${o.outfitId}：${o.outfitName}`)
    .join('\n');
}
