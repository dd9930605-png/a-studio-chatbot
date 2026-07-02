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

export function buildExperimentKnowledgeBlock(context: ExperimentChatContext): string {
  const categoryLabel = context.selectedOutfitCategory === 'male' ? '男款' : '女款';
  const catalogLines = context.allowedOutfits.map(formatOutfitLine).join('\n');
  const favorite = getOutfit(context.favoriteOutfitBeforeAI);
  const favoriteLook = getLookNumberFromOutfitId(context.favoriteOutfitBeforeAI);
  const final = getOutfit(context.finalRecommendedOutfit);
  const finalLook = getLookNumberFromOutfitId(context.finalRecommendedOutfit);

  const favoriteLine =
    favorite && favoriteLook
      ? `${getLookLabel(favoriteLook)}：${favorite.outfitName}`
      : context.favoriteOutfitBeforeAI;

  const finalLine =
    final && finalLook
      ? `${getLookLabel(finalLook)}：${final.outfitName}｜${final.styleTags.join('、')}`
      : context.finalRecommendedOutfit;

  return `## 實驗知識庫（你必須依此回答，不可違反）

### 實驗情境
- 這是一個「韓系服飾網站 AI 穿搭顧問」的面試穿搭實驗。
- 使用者剛瀏覽了 12 套面試穿搭（Look 1–12），並選了${categoryLabel}類別。
- 你的任務是協助使用者釐清**面試穿著**需求，不是約會、聚餐、旅遊或其他場合。
- 若使用者提到非面試場合（如咖啡廳約會），請先簡短同理，再自然帶回「面試穿搭」討論。

### 本網站可討論的穿搭庫（僅限以下 12 套的上衣／下裝／套裝組合）
${catalogLines}

### 使用者選擇
- 面試前最喜歡的一套：${favoriteLine}

### 嚴格禁止（非常重要）
- **禁止推薦或討論任何配件**：項鍊、耳環、戒指、手錶、墨鏡、帽子、圍巾、包包、鞋款、皮帶等。
- 若使用者主動問配件，請說明：「本網站目前僅提供上衣與下裝（及套裝內含的領帶等）組合建議，不包含配件；我們可以專注在服裝本身的版型、顏色與正式度。」
- **禁止推薦庫存以外的服裝**（例如「風衣」「西裝外套」「牛仔褲」若不在上述 12 套名稱中，不可作為獨立推薦；僅可引用庫中已有的單品組合）。
- 領帶若出現在某套 Look 名稱中（如條紋襯衫＋領帶＋西褲），可討論該套整體，但不可額外建議單獨添購配件。

### 對話與最終推薦的一致性（內部參考，不可對使用者透露）
- 系統即將在結果頁推薦：${finalLine}
- 驚喜模式：${context.surpriseMode === 'surprise' ? '是（使用者不知道最終會推薦哪一套）' : '否（最終推薦與最喜歡的一套相同）'}
- 請在自由對話中，依使用者的身形、風格、顏色偏好，**自然引導到與上述即將推薦之套裝相容的方向**（如正式度、色系、修飾重點）。
- **禁止**在對話中提前說出「我會推薦 Look X」或最終套裝名稱；結果只在「查看推薦結果」後才揭曉。
- 若使用者的偏好與即將推薦的套裝有落差，請在面試穿搭框架內討論取捨，不要硬推庫外單品。`;
}
