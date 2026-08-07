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

/** 網站現有下裝類型（評分池僅這幾類） */
export const CATALOG_BOTTOM_SUMMARY = '牛仔褲、西褲、寬褲、及膝裙';

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

/**
 * 庫存沒有、或實驗不納入評分池的下裝類型。
 * 注意：M2 名稱雖含「工裝寬褲」，但不把「工裝褲」當可加分偏好；喜歡工裝應說明無此商品並改推現有褲型。
 */
const UNAVAILABLE_BOTTOM_GROUPS: { label: string; terms: string[] }[] = [
  { label: '工裝褲', terms: ['工裝褲', '工裝'] },
  { label: '運動褲', terms: ['運動褲', '衛褲', 'jogger', 'Jogger'] },
  { label: '皮褲', terms: ['皮褲'] },
  { label: '短褲', terms: ['短褲'] },
  { label: '卡其褲', terms: ['卡其褲', '卡其'] },
  { label: '喇叭褲', terms: ['喇叭褲'] },
  { label: '緊身褲／內搭', terms: ['緊身褲', '內搭褲', 'legging', 'Legging', 'leggings'] },
  { label: '迷你裙', terms: ['迷你裙', '短裙'] },
  { label: '長裙', terms: ['長裙', '拖地裙'] },
  { label: '百褶裙', terms: ['百褶裙'] },
];

const PANTS_LIKE_MARKERS = ['褲', '西褲', '牛仔褲', '寬褲', '長褲', '直筒褲'];
const SKIRT_LIKE_MARKERS = ['裙', '及膝裙', '半身裙'];

/** 專指某一褲型（含庫存有／無），不應當成「泛指不喜歡褲子→改推裙」 */
const SPECIFIC_PANTS_PATTERN =
  /牛仔褲|牛仔|西褲|寬褲|工裝褲|工裝|運動褲|衛褲|皮褲|短褲|卡其褲|卡其|喇叭褲|緊身褲|內搭褲|legging|leggings|直筒褲|抽繩褲/i;

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

const PREFERS_SKIRT_MARKERS = [
  '喜歡裙',
  '偏好裙',
  '想要裙',
  '習慣裙',
  '愛穿裙',
  '想穿裙',
];

/** 泛指不喜歡「褲子」；不含專指某一褲型 */
const DISLIKES_PANTS_MARKERS = [
  '不喜歡褲',
  '不喜歡穿褲',
  '不要褲',
  '不要穿褲',
  '討厭褲',
  '不穿褲',
  '不想穿褲',
  '別推褲',
];

const WANT_MARKERS = /喜歡|想要|偏好|想穿|希望|有沒有|想找|給我|推薦/;

/**
 * 「不要緊／不排斥／都可以」等是可接受，不可當成厭惡。
 * 先去掉這些片語，再偵測真正的不喜歡。
 * 注意：不可把「不要緊身」誤拆成「不要緊」。
 */
function stripAcceptancePhrases(text: string): string {
  return text
    .replace(/不要緊(?!身)/g, '　')
    .replace(/不排斥/g, '　')
    .replace(/不討厭/g, '　')
    .replace(/不介意/g, '　');
}

/** 是否具有真正的厭惡語氣（排除「不要緊」「不排斥」等） */
export function hasDislikePolarity(text: string): boolean {
  const cleaned = stripAcceptancePhrases(text);
  return /不喜歡|不太喜歡|討厭|不要|不穿|排斥|不想穿|別推|忌諱|拒絕/.test(cleaned);
}

/** 強烈厭惡（同樣排除假陽性） */
export function hasStrongDislikePolarity(text: string): boolean {
  const cleaned = stripAcceptancePhrases(text);
  return /討厭|不要|不穿|排斥|不想穿|別推|忌諱|拒絕|絕對不要|很不喜|不想要/.test(
    cleaned,
  );
}

/** 明確表示可接受／沒差 */
export function hasAcceptancePolarity(text: string): boolean {
  return /都可以|沒關係|沒差|都行|也行|無所謂|不要緊|不排斥|不介意|隨便/.test(text);
}

/** 訊息是否專指某褲型（而非泛指褲子） */
function mentionsSpecificPantsOnly(message: string): boolean {
  if (!SPECIFIC_PANTS_PATTERN.test(message)) return false;
  const withoutSpecific = message.replace(
    /牛仔褲|牛仔|西褲|寬褲|工裝褲|工裝|運動褲|衛褲|皮褲|短褲|卡其褲|卡其|喇叭褲|緊身褲|內搭褲|legging|leggings|直筒褲|抽繩褲/gi,
    '',
  );
  return !DISLIKES_PANTS_MARKERS.some((m) => withoutSpecific.includes(m));
}

function mentionsGeneralPantsDislike(message: string): boolean {
  if (!hasDislikePolarity(message)) return false;
  if (!/褲/.test(message)) return false;
  if (/裙/.test(message) && !DISLIKES_PANTS_MARKERS.some((m) => message.includes(m))) {
    return false;
  }
  // 「不要牛仔褲／西褲／工裝褲…」不算泛指不喜歡褲子
  if (mentionsSpecificPantsOnly(message)) return false;
  // 「褲子都可以／不要緊」是可接受，不是厭惡
  if (hasAcceptancePolarity(message) && !DISLIKES_PANTS_MARKERS.some((m) => stripAcceptancePhrases(message).includes(m))) {
    return false;
  }
  return (
    DISLIKES_PANTS_MARKERS.some((m) => stripAcceptancePhrases(message).includes(m)) ||
    (/褲/.test(message) && !SPECIFIC_PANTS_PATTERN.test(message) && hasDislikePolarity(message))
  );
}

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

function messageWantsUnavailableBottom(message: string, terms: string[]): boolean {
  const hit = terms.some((term) => message.toLowerCase().includes(term.toLowerCase()));
  if (!hit) return false;
  // 純厭惡（不要工裝）不算「想要沒有的商品」
  if (hasDislikePolarity(message) && !WANT_MARKERS.test(message)) return false;
  return WANT_MARKERS.test(message) || /有沒有/.test(message);
}

/** 使用者想要／詢問庫存沒有的下裝類型 */
export function detectUnavailableBottomRequests(userMessages: string[]): string[] {
  const found = new Set<string>();
  for (const message of userMessages) {
    for (const group of UNAVAILABLE_BOTTOM_GROUPS) {
      if (messageWantsUnavailableBottom(message, group.terms)) {
        found.add(group.label);
      }
    }
  }
  return Array.from(found);
}

export function messageMentionsUnavailableBottom(message: string): string | null {
  for (const group of UNAVAILABLE_BOTTOM_GROUPS) {
    if (messageWantsUnavailableBottom(message, group.terms)) {
      return group.label;
    }
  }
  return null;
}

/**
 * 褲／裙大方向：
 * - 不喜歡裙 → 褲；不喜歡（泛指）褲 → 裙
 * - 「不要牛仔褲／西褲／工裝褲…」不算泛指不喜歡褲，不因此改推裙
 * - 「褲子都可以／不要緊／不排斥」是可接受，不改推裙
 */
export function detectBottomPreference(userMessages: string[]): 'pants' | 'skirt' | null {
  let pantsScore = 0;
  let skirtScore = 0;

  for (const message of userMessages) {
    const hasDislike = hasDislikePolarity(message);

    if (hasDislike && /裙/.test(message) && !mentionsGeneralPantsDislike(message)) {
      pantsScore += 3;
    }
    if (mentionsGeneralPantsDislike(message)) {
      skirtScore += 3;
    }

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

    // 喜歡／偏好某一褲型
    if (!hasDislike && PANTS_LIKE_MARKERS.some((m) => message.includes(m))) {
      if (/喜歡|偏好|想要|希望|愛|習慣|偏向/.test(message)) {
        pantsScore += 1;
      }
    }

    // 「褲子都可以」→ 可接受褲裝，略加分（不是推裙）
    if (
      hasAcceptancePolarity(message) &&
      /褲/.test(message) &&
      !/裙/.test(message) &&
      !hasDislike
    ) {
      pantsScore += 1;
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
- **網站現有下裝類型僅包含**：${CATALOG_BOTTOM_SUMMARY}（評分與最終推薦只從此池挑選）。
- **網站沒有、不可假裝有、也不可當推薦主軸的下裝**：工裝褲、運動褲、皮褲、短褲、卡其褲、喇叭褲、緊身／內搭、迷你裙、長裙、百褶裙等。
- 若使用者喜歡或詢問上述沒有的下裝（例如工裝褲）：
  1. **第一句就要說明**本網站目前沒有該類型單品；
  2. 引導改從現有下裝（牛仔褲、西褲、寬褲、及膝裙）討論面試需求；
  3. **禁止**繼續描述不存在的工裝褲怎麼搭，也**禁止**把現有商品硬說成工裝褲來滿足對方。
- 女款下裝包含**褲裝**與**及膝裙**（F5、F6）；男款與中性款以**褲裝**為主。
- 若使用者明確偏好**褲裝**或**不要裙裝**，聊天與最終推薦都**不可**以裙裝為主軸；須在現有褲裝搭配中討論。
- 若使用者明確**不喜歡褲子／想穿裙子**，女款應優先討論及膝裙方案（F5、F6）。
- 若使用者明確**不喜歡裙子**，應改推褲裝，不要再推裙。
- 若對方說喜歡**牛仔褲／西褲／寬褲／及膝裙**其中一種，回覆與推薦應回扣該類型。
- 「不喜歡牛仔褲／西褲／寬褲」只避開該類型，**不要**因此改推裙子。`;
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
- 對方若明確說「很討厭／不要／不喜歡」某色，**之後禁止再提起該色系**作為建議選項。
- 專業說服最多 1 次；若仍拒絕，只談庫存內其他色系或版型。
- 說服時請給出**具體面試理由**（例如穩重感、對比、正式度），不要只重複「我理解您的想法」。
- 若對方已拒絕，下一輪必須改推**另一個色系或版型**，並簡短說明為什麼改推。`;
}

export function buildProfessionalConsultantBlock(): string {
  return `### 專業顧問立場（不是單純討好使用者）
- 你是**有專業判斷的穿搭顧問**，不是只會說「好的、了解」的客服。
- 當使用者偏好與**面試正式需求**可能衝突時，可以**禮貌但明確**表達不同看法，例如：
  - 「我理解您不太偏好黑色；以面試情境來看，深灰或深藍通常比純黑更柔和，也仍能維持穩重感。我們可以改看現有搭配中的深灰方案。」
  - 「您希望更休閒，但這次是面試情境，我會建議在現有庫存裡優先考慮半正式、俐落的選項。」
- **專業說服的原則**：
  1. 先**回扣對方說過的話**（例如「因為您剛才說不太喜歡黑色／比較喜歡簡約」）；
  2. 再提出顧問觀點與面試情境理由（1–2 句，需具體）；
  3. 立刻給出**替代方案**（另一色／另一套現有商品），並說明「所以我改推這個」；
  4. **同一個「不喜歡」話題最多專業說服 1 次**；若使用者再次明確拒絕，**停止提及該色系**，改談庫存內其他顏色或版型。
- 推薦或轉向時，盡量用這種句型讓對方覺得被記住：
  - 「因為您提到不喜歡黑色，所以我改從現有搭配裡看深灰／藍色方案。」
  - 「您剛才說偏好簡約俐落，因此我會往這個方向幫您收斂選項。」
  - 「因為您說不太喜歡太寬鬆，我會優先看版型較俐落、不要過度寬大的搭配。」
- **禁止**：使用者已連續、明確拒絕某元素後，仍每輪硬推同一色系或裙/褲選擇。
- **禁止**：只附和「好的不推了」卻不提供下一個可執行的替代方向。
- **禁止**：完全不提對方剛才說過的喜歡／不喜歡，直接換一個無關推薦。`;
}

export function getCatalogOutfitSummaryForPrompt(): string {
  return outfits
    .map((o) => `- ${o.outfitId}：${o.outfitName}`)
    .join('\n');
}
