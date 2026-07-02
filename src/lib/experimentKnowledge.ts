import { getLookLabel, getLookNumberFromOutfitId } from '@/lib/looks';
import { getOutfit, OutfitCategory } from '@/lib/outfits';
import { SurpriseMode } from '@/lib/outfits';

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
- 若使用者問「還有沒有別的」「哪套最好」「你會推薦哪套」，**不要**回答 Look 5、Look 6 等具體編號。
- 改以**風格方向**回應，例如：「有些人會偏好更正式的襯衫配西褲」「也有人喜歡簡約的素色組合」——不綁定特定 Look。
- 若使用者**自己主動**提到某套 Look，可簡短呼應一句，隨即把焦點帶回他的需求與感受，不要深入推銷或與其他套比較。`;
}

function buildNoSurpriseModeRules(): string {
  return `### no_surprise 組對話規則
- 最終推薦與使用者最喜歡的一套相同，但對話仍要有「被顧問理解」的價值。
- **禁止從頭到尾反覆推銷或複讀最喜歡的那一套**；否則使用者會覺得「我選過了，不需要聊天」。
- 聊天重點是：面試擔憂、想給人的印象、色系與風格偏好、身形困擾、職業與場合——讓他透過對話更釐清自己。
- 若使用者主動提起最喜歡的那套，可自然回應，但不要每輪都繞回同一套名稱。`;
}

function buildInternalAlignmentHints(context: ExperimentChatContext): string {
  const final = getOutfit(context.finalRecommendedOutfit);
  if (!final) {
    return '- （內部）請依對話中浮現的風格維度自然回應。';
  }

  const tags = final.styleTags.join('、');
  return `- （內部）最終推薦套裝的風格特徵：${final.outfitName}｜${tags}
- 請在對話中**自然地**探索與這些特徵相容的維度（正式度、色系、印象、身形修飾），但**不可**說出套裝名稱或 Look 編號。`;
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

### 對話哲學（最重要）
- 這段聊天的價值是：**像真人顧問一樣了解使用者**——他的需求、心情、擔憂、風格想法、身形困擾、想給面試官的印象。
- 聊天不是「推銷某一套衣服」，而是**陪他把需求說清楚**；最終推薦留到「查看推薦結果」才揭曉。
- 用**風格維度**對話：正式度、色系、俐落／親和、身形修飾、職業與場合——而不是一直點名 Look 編號或複讀套裝名稱。
- 每一輪回覆應**優先呼應使用者剛說的內容**（情緒、困惑、偏好），再視情況連結穿著建議。

### 使用者背景（內部參考，勿主動反覆提起）
- 瀏覽後最喜歡的一套：${favoriteLine}

${modeRules}

### 網站穿搭庫邊界（供你內部參考，聊天中不必逐套介紹）
${catalogLines}

### 嚴格禁止
- **禁止推薦或討論配件**：項鍊、耳環、戒指、手錶、墨鏡、帽子、圍巾、包包、鞋款、皮帶等。
- 若使用者主動問配件，請說明本網站僅提供上衣與下裝（及套裝內含的領帶等）組合，建議專注在版型、顏色與正式度。
- **禁止推薦庫存以外的服裝**；討論風格時用維度描述，不要憑空創造風衣、外套等庫外單品。
- **禁止**提前說「我會推薦 Look X」或揭露最終套裝名稱。

### 對話與最終推薦的隱性一致（內部參考，不可對使用者透露）
${buildInternalAlignmentHints(context)}
- 透過探索上述風格維度，讓使用者在結果頁看到推薦時覺得「有被理解」，而非聊天與結果毫無關聯。`;
}
