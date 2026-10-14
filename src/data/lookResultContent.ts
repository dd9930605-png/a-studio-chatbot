/**
 * 每套 Look 的結果頁固定文案。
 * positiveA／positiveB／caution 與中性外觀描述（色系、版型、整體風格）
 * 皆預先寫死，不由模型生成。
 *
 * 狀態：待人工確認。目前依 public/outfits.json 的既有描述改寫，
 * 並把注意事項維持在「輕微、情境式」。
 */

export interface LookResultCopy {
  outfitId: string;
  /** 待人工確認 */
  reviewStatus: 'pending_human_review';
  /** 色系（中性描述，無因果） */
  colorAttribute: string;
  /** 版型（中性描述，無因果） */
  fitAttribute: string;
  /** 整體風格（中性描述，無因果） */
  styleAttribute: string;
  positiveA: string;
  positiveB: string;
  caution: string;
}

export const LOOK_RESULT_CONTENT: Record<string, LookResultCopy> = {
  M1: {
    outfitId: 'M1',
    reviewStatus: 'pending_human_review',
    colorAttribute: '白色、黑色與深灰',
    fitAttribute: '短袖襯衫、領帶與牛仔褲',
    styleAttribute: '半正式、線條簡約',
    positiveA: '白色襯衫搭配黑色領帶，正式感清楚，整體也不至於僵硬。',
    positiveB: '深灰牛仔褲讓整體較自然，適合穩重中帶一點輕鬆的印象。',
    caution: '若公司文化較保守，短袖襯衫與牛仔褲可能讓正式感稍弱。',
  },
  M2: {
    outfitId: 'M2',
    reviewStatus: 'pending_human_review',
    colorAttribute: '深灰與黑色',
    fitAttribute: '長袖襯衫與工裝寬褲',
    styleAttribute: '個性、輪廓鬆弛',
    positiveA: '深灰與黑色搭配清楚，整體有一致的深色輪廓。',
    positiveB: '工裝寬褲的輪廓明確，個人風格比一般正裝更明顯。',
    caution: '若公司文化較保守，破邊與工裝輪廓可能讓正式感稍弱。',
  },
  M3: {
    outfitId: 'M3',
    reviewStatus: 'pending_human_review',
    colorAttribute: '咖啡、白色與深藍',
    fitAttribute: '外搭襯衫與寬版牛仔褲',
    styleAttribute: '層次、商務休閒',
    positiveA: '咖啡色外搭搭配白與深藍，色塊層次清楚。',
    positiveB: '外搭襯衫讓整體完成度較高，輪廓也不至於死板。',
    caution: '若公司文化較保守，寬版牛仔褲與開襟可能讓正式感稍弱。',
  },
  M4: {
    outfitId: 'M4',
    reviewStatus: 'pending_human_review',
    colorAttribute: '黑色與灰色',
    fitAttribute: '素色上衣與寬腿西褲',
    styleAttribute: '簡約、線條俐落',
    positiveA: '黑色上衣搭配灰色寬腿西褲，線條乾淨、配色單純。',
    positiveB: '素色搭配低調，整體簡潔，沒有多餘的裝飾細節。',
    caution: '若公司文化較保守，T 恤與寬腿輪廓可能讓正式感稍弱。',
  },
  M5: {
    outfitId: 'M5',
    reviewStatus: 'pending_human_review',
    colorAttribute: '淺藍條紋、深藍與黑色',
    fitAttribute: '襯衫、領帶與黑色寬褲',
    styleAttribute: '正式、專業感清楚',
    positiveA: '條紋襯衫搭配深藍領帶，正式度清楚，也容易顯得穩重。',
    positiveB: '黑色寬褲讓下半身顏色單純，整體完成度高。',
    caution: '若寬褲過於鬆垮，襯衫領帶帶來的正式感可能稍弱。',
  },
  M6: {
    outfitId: 'M6',
    reviewStatus: 'pending_human_review',
    colorAttribute: '黑色與白色',
    fitAttribute: '素色上衣與白色寬褲',
    styleAttribute: '極簡、黑白對比',
    positiveA: '黑色上衣搭配白色寬褲，對比清楚，視覺乾淨。',
    positiveB: '素色組合簡潔，整體俐落，沒有複雜的花色。',
    caution: '若公司文化較保守，上衣與寬褲的輪廓可能讓正式感稍弱。',
  },
  F1: {
    outfitId: 'F1',
    reviewStatus: 'pending_human_review',
    colorAttribute: '白色與淺藍',
    fitAttribute: '短袖上衣與寬褲牛仔褲',
    styleAttribute: '乾淨、線條自然',
    positiveA: '白色與淺藍搭配清爽，整體視覺乾淨、顏色單純。',
    positiveB: '寬褲牛仔褲的線條自然，沒有過於緊身的輪廓。',
    caution: '若公司文化較保守，T 恤與牛仔褲可能讓正式感稍弱。',
  },
  F2: {
    outfitId: 'F2',
    reviewStatus: 'pending_human_review',
    colorAttribute: '條紋與深棕',
    fitAttribute: '襯衫、領帶與寬腿西褲',
    styleAttribute: '俐落、色調沉穩',
    positiveA: '條紋襯衫搭配領帶，專業輪廓清楚，也顯得穩重。',
    positiveB: '深棕寬腿西褲色調沉穩，下半身線條一致。',
    caution: '若場合非常正式，短袖襯衫的正式感可能比長袖稍弱。',
  },
  F3: {
    outfitId: 'F3',
    reviewStatus: 'pending_human_review',
    colorAttribute: '藍白條紋、白色與黑色',
    fitAttribute: '襯衫疊穿與黑色寬褲',
    styleAttribute: '有層次、柔和專業',
    positiveA: '條紋襯衫疊穿白色內搭，層次清楚，也不至於死板。',
    positiveB: '黑色寬褲讓下半身顏色單純，整體線條乾淨。',
    caution: '若公司文化較保守，疊穿與寬褲輪廓可能讓正式感稍弱。',
  },
  F4: {
    outfitId: 'F4',
    reviewStatus: 'pending_human_review',
    colorAttribute: '細條紋與黑色',
    fitAttribute: '襯衫、領帶與抽繩寬褲',
    styleAttribute: '通勤、線條俐落',
    positiveA: '細條紋襯衫搭配領帶，正式輪廓清楚，顏色也單純。',
    positiveB: '黑色寬褲讓整體線條一致，視覺上較為整齊。',
    caution: '若公司文化較保守，抽繩寬褲的輪廓可能讓正式感稍弱。',
  },
  F5: {
    outfitId: 'F5',
    reviewStatus: 'pending_human_review',
    colorAttribute: '白色與黑色',
    fitAttribute: '襯衫與黑色及膝裙',
    styleAttribute: '正式、輪廓俐落',
    positiveA: '白襯衫搭配黑色及膝裙，輪廓清楚，是辨識度高的正式組合。',
    positiveB: '及膝裙的線條俐落，整體給人整齊、幹練的印象。',
    caution: '若面試較重視創意表達，黑白素色可能讓個人風格較不明顯。',
  },
  F6: {
    outfitId: 'F6',
    reviewStatus: 'pending_human_review',
    colorAttribute: '淺藍與米白',
    fitAttribute: '襯衫與米白及膝裙',
    styleAttribute: '柔和、輪廓清楚',
    positiveA: '淺藍襯衫搭配米白及膝裙，顏色乾淨，整體也顯得溫和。',
    positiveB: '及膝裙維持清楚的正式輪廓，線條整齊。',
    caution: '若場合非常正式，淺色組合的穩重感可能比深色稍弱。',
  },
};

export function getLookResultCopy(outfitId: string): LookResultCopy | undefined {
  return LOOK_RESULT_CONTENT[outfitId];
}
