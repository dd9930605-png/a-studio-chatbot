import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { getOutfit, OutfitCategory } from '@/lib/outfits';
import { SurpriseMode } from '@/lib/outfits';
import { Condition } from '@/lib/conditions';
import { buildConsultationThemesBlock } from '@/lib/chatConsultationThemes';
import {
  ChatPreferences,
  formatPreferencesSummary,
  hasExplicitPreferences,
  outfitConflictsWithPreferences,
} from '@/lib/chatPreferences';
import {
  buildCatalogBoundaryPromptBlock,
} from '@/lib/catalogBoundaries';

export interface ExperimentChatContext {
  selectedOutfitCategory: OutfitCategory;
  allowedOutfits: string[];
  expectedOutfitBeforeAI: string;
  finalRecommendedOutfit: string;
  surpriseMode: SurpriseMode;
  chatPreferences?: ChatPreferences;
}

function formatOutfitLine(outfitId: string): string {
  const outfit = getOutfit(outfitId);
  const lookNumber = getLookNumberFromOutfitId(outfitId);
  if (!outfit || !lookNumber) {
    return `- ${outfitId}`;
  }

  const tags = outfit.styleTags.join('、');
  return `- ${getLookLabel(lookNumber)}（${outfitId}）：${outfit.outfitName}｜標籤：${tags}`;
}

function buildSurpriseModeRules(): string {
  return `### surprise 組對話規則
- 使用者**不知道**最終推薦是否與他最喜歡的一套相同。
- **禁止主動點名任何 Look 編號**（包含最喜歡的那套與其他套）。
- 若使用者問「還有沒有別的」「哪套最好」，請說明會依剛才的對話在結果頁呈現最適合的一套，**不要**描述其他 Look 的具體內容。
- 若使用者**自己主動**提到某套 Look，可簡短呼應一句，隨即把焦點帶回他的需求與感受。`;
}

function buildSurprisePendingAlignmentBlock(context: ExperimentChatContext): string {
  const expected = getOutfit(context.expectedOutfitBeforeAI);
  return `### surprise 組聊天策略（最終推薦尚未決定，聊天結束後才選定）
- 結果頁會從候選池中挑選**不同於**使用者預期的一套：${expected?.outfitName ?? context.expectedOutfitBeforeAI}
- 聊天中**禁止**提前劇透 Look 編號或定案「就是某一套」。
- 優先了解：面試場合、想給人的印象、色系與風格偏好、身形修飾、擔憂點。
- 若使用者明確問「你會推薦什麼」，請說明會在互動結束後於結果頁呈現最適合的一套，並簡述判斷方向（正式度、俐落感），**不要**具體描述某一 Look 的完整單品組合。
- 若聊天偏好與預期套裝衝突，先同理，改聊抽象需求；**禁止**為討好而推薦庫存以外服裝或配件。`;
}

function buildPreferenceTransitionBlock(
  context: ExperimentChatContext,
  condition: Pick<Condition, 'explainability' | 'proactivity'>,
): string {
  const preferences = context.chatPreferences;
  if (!preferences || !hasExplicitPreferences(preferences)) {
    return '';
  }

  const summary = formatPreferencesSummary(preferences);
  const conflictTarget =
    context.surpriseMode === 'surprise' && !context.finalRecommendedOutfit
      ? context.expectedOutfitBeforeAI
      : context.finalRecommendedOutfit;
  const finalConflicts = outfitConflictsWithPreferences(conflictTarget, preferences);
  const responseRule =
    condition.explainability === 'high'
      ? '- 回應建議時，依可解釋性 High 規則把相關偏好連到判斷依據與建議。'
      : '- 回應時尊重這些偏好，但依可解釋性 Low 規則直接給結論，不展開完整因果鏈。';
  const progressionRule =
    condition.proactivity === 'high'
      ? '- 只追問尚未知道的重要資訊；不得重問已列出的偏好，也不得每輪都問問題。'
      : '- 不主動追加問題或推進下一個需求蒐集。';

  return `### 使用者聊天偏好（內部事實；不可自行加強或改寫）
- ${summary}
${preferences.requestedUnavailableColors.length > 0 ? `- 使用者曾想要庫存沒有的色系（${preferences.requestedUnavailableColors.join('、')}）：**不要**繼續聊該色怎麼搭；應說明無此商品，並引導至現有白/黑/藍/灰/咖啡／棕/條紋色系。` : ''}
${preferences.requestedUnavailableBottoms.length > 0 ? `- 使用者曾想要庫存沒有的下裝（${preferences.requestedUnavailableBottoms.join('、')}）：**第一句說明沒有**，引導至牛仔褲／西褲／寬褲／及膝裙；禁止把現有商品硬說成該類型。` : ''}
${preferences.prefersPants ? '- 使用者偏好**褲裝**：討論與推薦時以褲裝為主，勿以裙裝為主軸。' : ''}
${preferences.prefersJeans ? '- 使用者偏好牛仔褲：回扣此偏好，優先討論牛仔褲搭配。' : ''}
${preferences.prefersDressPants ? '- 使用者偏好西褲：回扣此偏好，優先討論西褲搭配。' : ''}
${preferences.prefersWidePants ? '- 使用者偏好寬褲：回扣此偏好，優先討論寬褲搭配。' : ''}
${preferences.prefersSkirt ? '- 使用者偏好裙裝／不太想穿褲：女裝優先討論及膝裙。' : ''}
${context.surpriseMode === 'surprise' ? '- surprise 組會在聊天結束後從 eligible pool 選款；聊天中不得提前定案。' : '- no_surprise 組的最終 Look 固定等於 Prediction；聊天中不得透露此操弄。'}
${finalConflicts ? '- 目前固定／候選方向可能與偏好衝突：同一元素最多說服一次；再次拒絕後停止推銷。' : ''}
${responseRule}
${progressionRule}`;
}

function buildNoSurpriseModeRules(): string {
  return `### no_surprise 組對話規則
- 最終推薦與使用者**使用 AI 前的預期穿搭**相同，但對話仍要有「被顧問理解」的價值。
- **禁止從頭到尾反覆推銷或複讀最喜歡的那一套**；否則使用者會覺得「我選過了，不需要聊天」。
- 聊天重點是：面試擔憂、想給人的印象、色系與風格偏好、身形困擾——讓他透過對話更釐清自己。
- 若使用者主動提起最喜歡的那套，可自然回應，但不要每輪都繞回同一套名稱。`;
}

function buildFinalOutfitAlignmentBlock(context: ExperimentChatContext): string {
  if (context.surpriseMode === 'surprise' && !context.finalRecommendedOutfit) {
    return buildSurprisePendingAlignmentBlock(context);
  }

  const anchorOutfitId =
    context.surpriseMode === 'no_surprise'
      ? context.expectedOutfitBeforeAI
      : context.finalRecommendedOutfit;
  const final = getOutfit(anchorOutfitId);
  if (!final) {
    return `### 聊天與最終推薦必須一致
- 聊天中若描述具體穿著，必須與結果頁將顯示的套裝一致。`;
  }

  return `### 聊天與最終推薦一致（內部錨點，不可對使用者透露 Look 編號）
- 結果頁**只會**推薦：「${final.outfitName}」
- 風格標籤：${final.styleTags.join('、')}
- 摘要：${final.reason}

#### 何時可以描述這套穿著（重要）
- **僅在以下情況**才完整描述上述套裝的單品與色系（一場對話最多 1～2 次）：
  1. 使用者明確問「你會推薦什麼」「所以是什麼」「只有這套嗎」等；
  2. 使用者主動要求具體穿著建議，且已聊過至少一輪需求。
- **其餘時間**：專注陪聊需求、心情、身形、面試印象，用**抽象維度**（正式度、版型修飾、俐落感）回應，**不要每輪都重複同一套完整穿著描述**。

#### 當使用者不喜歡、拒絕、或偏好與此套裝不同時
- 尊重對方已表達的偏好；具體回覆形式必須遵守可解釋性與雙面訊息 High/Low 規則。
- 若對方僅「較不喜歡」某色系，可在現有庫存範圍內討論其他方向。
- 若使用者**連續兩次**明確拒絕同一元素，停止推銷該元素，改聊版型、正式度、印象，並給出其他可討論方向。
- **禁止**為討好使用者而描述庫存以外的單品或配件。
- 若使用者堅持問「那你到底推薦什麼」：此時才清楚描述「${final.outfitName}」（與結果頁一致），但不得提前透露 Look 編號。

#### 硬性邊界
- 一旦描述具體上衣、下裝、色系，**只能**與「${final.outfitName}」一致，不可出現結果頁沒有的組合。
- **禁止**提前說 Look 編號。`;
}

export function buildExperimentKnowledgeBlock(
  context: ExperimentChatContext,
  condition: Pick<
    Condition,
    'explainability' | 'proactivity' | 'anthropomorphism' | 'twoSidedMessage'
  >,
): string {
  const categoryLabel = context.selectedOutfitCategory === 'male' ? '男款' : '女款';
  const catalogLines = context.allowedOutfits.map(formatOutfitLine).join('\n');
  const expected = getOutfit(context.expectedOutfitBeforeAI);
  const expectedLook = getLookNumberFromOutfitId(context.expectedOutfitBeforeAI);

  const expectedLine =
    expected && expectedLook
      ? `${getLookLabel(expectedLook)}：${expected.outfitName}`
      : context.expectedOutfitBeforeAI;

  const modeRules =
    context.surpriseMode === 'surprise' ? buildSurpriseModeRules() : buildNoSurpriseModeRules();

  return `## 實驗知識庫（你必須依此回答，不可違反）

### 實驗情境
- 這是一個「韓系服飾網站 AI 穿搭顧問」的**模擬面試穿搭**實驗；使用者假想自己要去面試，**沒有真實的公司或職缺**。
- 使用者剛瀏覽了 12 套面試穿搭（Look 1–12），並選了${categoryLabel}類別。
- 你的任務是協助使用者釐清**面試穿著**需求，不是約會、聚餐、旅遊或其他場合。
- 若使用者提到非面試場合，請先簡短同理，再自然帶回「面試穿搭」討論。
- **禁止**追問公司名稱、新創或傳產、產業類型等現實求職資訊；只談穿著印象與偏好即可。

${buildFinalOutfitAlignmentBlock(context)}

### 對話哲學
- 這是任務導向的面試穿搭顧問；不是單純討好，也不是一般閒聊機器人。
- 回覆風格、理由透明度、限制資訊與追問方式，一律以實驗操弄 High/Low 規則為最高優先。
- 使用者說怕胖、緊張、沒想法時，先回應當下內容，不要第一句就丟完整套裝推薦。

${buildCatalogBoundaryPromptBlock()}

${buildConsultationThemesBlock()}

${buildPreferenceTransitionBlock(context, condition)}

### 使用者背景（內部參考，勿主動反覆提起）
- 瀏覽後預期 AI 會推薦的一套：${expectedLine}

${modeRules}

### 網站穿搭庫邊界（內部參考）
${catalogLines}

### 嚴格禁止
- **禁止推薦或討論配件**：項鍊、耳環、戒指、手錶、墨鏡、帽子、圍巾、包包、鞋款、皮帶等；也不可建議自行更換領帶顏色或加配件。
- 若使用者主動問配件，請說明本網站僅提供上衣與下裝（及套裝內含的領帶等）組合，建議專注在版型、顏色與正式度。
- **禁止推薦庫存以外或最終套裝以外的服裝組合**；**禁止**假裝有綠色、紅色、粉色、紫色、黃色、橘色等網站未販售的色系單品。
- **禁止**對庫存「有」的項目說沒有：咖啡色／深棕／棕色、及膝裙（裙子）皆有售，不可回覆「沒有棕色」「沒有裙子」。
- **禁止貶低**「其他套」「別的選擇」來抬高某一套。
- **禁止**在使用者說「這不就是我選的那套嗎」時直接回答「是的／哈哈是的」——改為說明會在結果頁綜合需求呈現完整建議，並可繼續聊其他面向。`;
}
