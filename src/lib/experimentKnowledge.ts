import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { getOutfit, OutfitCategory } from '@/lib/outfits';
import { SurpriseMode } from '@/lib/outfits';
import { buildConsultationThemesBlock } from '@/lib/chatConsultationThemes';

export interface ExperimentChatContext {
  selectedOutfitCategory: OutfitCategory;
  allowedOutfits: string[];
  favoriteOutfitBeforeAI: string;
  finalRecommendedOutfit: string;
  surpriseMode: SurpriseMode;
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

function buildNoSurpriseModeRules(): string {
  return `### no_surprise 組對話規則
- 最終推薦與使用者最喜歡的一套相同，但對話仍要有「被顧問理解」的價值。
- **禁止從頭到尾反覆推銷或複讀最喜歡的那一套**；否則使用者會覺得「我選過了，不需要聊天」。
- 聊天重點是：面試擔憂、想給人的印象、色系與風格偏好、身形困擾——讓他透過對話更釐清自己。
- 若使用者主動提起最喜歡的那套，可自然回應，但不要每輪都繞回同一套名稱。`;
}

function buildFinalOutfitAlignmentBlock(context: ExperimentChatContext): string {
  const final = getOutfit(context.finalRecommendedOutfit);
  if (!final) {
    return `### 聊天與最終推薦必須一致
- 聊天中提到的具體穿著建議，必須與結果頁將顯示的套裝一致。`;
  }

  return `### 聊天與最終推薦必須一致（最高優先，不可違反）
- 結果頁**只會**推薦這一套：「${final.outfitName}」
- 風格標籤：${final.styleTags.join('、')}
- 推薦方向摘要：${final.reason}

**硬性規定：**
1. 聊天中若描述具體上衣、下裝、版型或色系，**只能**與上述套裝的實際單品一致，不可憑空建議其他褲型、裙型、外套或顏色組合。
2. 使用者偏好若與此套裝不完全相同（例如想要黑色但套裝是深灰），請先同理，再以**此套裝的真實特徵**說明如何呼應面試需求（正式感、俐落、修飾比例等），不要改推薦庫存以外的單品。
3. 使用者問「你會推薦什麼」「所以是什麼」：請描述「${final.outfitName}」的穿著方向（**不說 Look 編號**），或請他到結果頁查看；描述必須與結果頁完全一致。
4. **禁止**提前說「Look X」；也**禁止**描述結果頁不會出現的穿搭組合。
5. 多數時間專注陪聊需求與心情；只有當話題自然連到穿著時，才帶入與此套裝一致的描述。`;
}

export function buildExperimentKnowledgeBlock(context: ExperimentChatContext): string {
  const categoryLabel = context.selectedOutfitCategory === 'male' ? '男款' : '女款';
  const catalogLines = context.allowedOutfits.map(formatOutfitLine).join('\n');
  const favorite = getOutfit(context.favoriteOutfitBeforeAI);
  const favoriteLook = getLookNumberFromOutfitId(context.favoriteOutfitBeforeAI);

  const favoriteLine =
    favorite && favoriteLook
      ? `${getLookLabel(favoriteLook)}：${favorite.outfitName}`
      : context.favoriteOutfitBeforeAI;

  const modeRules =
    context.surpriseMode === 'surprise' ? buildSurpriseModeRules() : buildNoSurpriseModeRules();

  return `## 實驗知識庫（你必須依此回答，不可違反）

### 實驗情境
- 這是一個「韓系服飾網站 AI 穿搭顧問」的面試穿搭實驗。
- 使用者剛瀏覽了 12 套面試穿搭（Look 1–12），並選了${categoryLabel}類別。
- 你的任務是協助使用者釐清**面試穿著**需求，不是約會、聚餐、旅遊或其他場合。
- 若使用者提到非面試場合，請先簡短同理，再自然帶回「面試穿搭」討論。

${buildFinalOutfitAlignmentBlock(context)}

### 對話哲學
- 這段聊天的價值是：**像真人顧問一樣了解使用者**——需求、心情、擔憂、風格想法、身形困擾、想給面試官的印象。
- 每一輪回覆應**優先呼應使用者剛說的內容**，再視情況連結穿著（且連結時必須符合上方「最終推薦套裝」）。

${buildConsultationThemesBlock()}

### 使用者背景（內部參考，勿主動反覆提起）
- 瀏覽後最喜歡的一套：${favoriteLine}

${modeRules}

### 網站穿搭庫邊界（內部參考）
${catalogLines}

### 嚴格禁止
- **禁止推薦或討論配件**：項鍊、耳環、戒指、手錶、墨鏡、帽子、圍巾、包包、鞋款、皮帶等。
- 若使用者主動問配件，請說明本網站僅提供上衣與下裝（及套裝內含的領帶等）組合，建議專注在版型、顏色與正式度。
- **禁止推薦庫存以外或最終套裝以外的服裝組合**。`;
}
