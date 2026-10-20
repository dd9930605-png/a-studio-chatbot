# 正式收案前 QA / robustness audit

稽核對象：正式收案 production（card-only + 直接操弄辨識題 + feature matrix）。  
OpenAI 線上模型回覆無法在無金鑰環境窮舉；聊天理解以 production 的 `extractChatPreferences`、`extractExplicitChatNeeds`、`generateFreeChatFallbackReply`、`isClearlyOffTopic` 與 system prompt 文字為準。

## 計數

| 測試組 | 跑了 | Pass | Warning | Fail |
| --- | ---: | ---: | ---: | ---: |
| A feature matrix | 18 | 18 | 0 | 0 |
| B pool/resolve | 50 | 50 | 0 | 0 |
| B scoring simulation | 384 | 384 | 0 | 0 |
| B tie randomness | 1 | 1 | 0 | 0 |
| B PK tournament | 4 | 4 | 0 | 0 |
| C style terms | 29 | 26 | 3 | 0 |
| C typos | 14 | 12 | 2 | 0 |
| C weak preference | 16 | 16 | 0 | 0 |
| C negation | 10 | 10 | 0 | 0 |
| C preference revision | 4 | 4 | 0 | 0 |
| C multi-constraint | 2 | 2 | 0 | 0 |
| D unavailable catalog | 25 | 25 | 0 | 0 |
| E off-topic boundary | 20 | 20 | 0 | 0 |
| F known-info reask | 2 | 2 | 0 | 0 |
| G AN×PRO orthogonality | 9 | 9 | 0 | 0 |
| H EX evidence mismatch | 60 | 60 | 0 | 0 |
| I TS copy | 48 | 48 | 0 | 0 |
| J process + prototype artifacts | 7 | 7 | 0 | 0 |

- PASS findings：5（含流程確認）
- WARNING：5
- FAIL / MUST FIX：0

## A. 12 套特徵矩陣

| Look | ID | 顯示/穿著 | male | female | 顏色keys | 淺 | 深 | fit | bottom | 正式標 | 休閒標 | 領帶 | 工裝 | 牛仔 | 裙 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | M1 | male/neutral | Y | Y | white+black+darkGray | Y | Y | structured | jeans | 半正式 | — | Y | n | Y | n |
| 2 | M2 | male/neutral | Y | Y | darkGray+black | n | Y | oversized | wide_pants | — | 個性風格/街頭 | n | Y | n | n |
| 3 | M3 | male/neutral | Y | Y | brown+white+darkBlue | Y | Y | relaxed | jeans | — | 商務休閒 | n | n | Y | n |
| 4 | M4 | male/neutral | Y | Y | black+gray | n | Y | relaxed | dress_pants | — | — | n | n | n | n |
| 5 | M5 | male/male_only | Y | n | lightBlue+darkBlue+black | Y | Y | relaxed | wide_pants | 正式專業/襯衫領帶 | — | Y | n | n | n |
| 6 | M6 | male/male_only | Y | n | black+white | Y | Y | relaxed | wide_pants | — | — | n | n | n | n |
| 7 | F1 | female/neutral | Y | Y | white+lightBlue | Y | n | relaxed | jeans | — | — | n | n | Y | n |
| 8 | F2 | female/neutral | Y | Y | brown | n | Y | relaxed | dress_pants | 俐落正式 | — | Y | n | n | n |
| 9 | F3 | female/neutral | Y | Y | lightBlue+white+black | Y | Y | relaxed | wide_pants | 柔和專業 | — | n | n | n | n |
| 10 | F4 | female/neutral | Y | Y | black | n | Y | oversized | wide_pants | 俐落正式 | — | Y | n | n | n |
| 11 | F5 | female/female_only | n | Y | white+black | Y | Y | structured | skirt | 正式專業 | — | n | n | n | Y |
| 12 | F6 | female/female_only | n | Y | lightBlue+beige | Y | n | structured | skirt | 柔和專業 | — | n | n | n | Y |

### 各套 result copy（皆 pending_human_review）

| ID | positiveA | positiveB | caution | 人工確認 |
| --- | --- | --- | --- | --- |
| M1 | 白色襯衫搭配黑色領帶，正式感清楚，整體也不至於僵硬。 | 深灰牛仔褲讓整體較自然，適合穩重中帶一點輕鬆的印象。 | 若公司文化較保守，短袖襯衫與牛仔褲可能讓正式感稍弱。 | pending_human_review |
| M2 | 深灰與黑色搭配清楚，整體有一致的深色輪廓。 | 工裝寬褲的輪廓明確，個人風格比一般正裝更明顯。 | 若公司文化較保守，破邊與工裝輪廓可能讓正式感稍弱。 | pending_human_review |
| M3 | 咖啡色外搭搭配白與深藍，色塊層次清楚。 | 外搭襯衫讓整體完成度較高，輪廓也不至於死板。 | 若公司文化較保守，寬版牛仔褲與開襟可能讓正式感稍弱。 | pending_human_review |
| M4 | 黑色上衣搭配灰色寬腿西褲，線條乾淨、配色單純。 | 素色搭配低調，整體簡潔，沒有多餘的裝飾細節。 | 若公司文化較保守，T 恤與寬腿輪廓可能讓正式感稍弱。 | pending_human_review |
| M5 | 條紋襯衫搭配深藍領帶，正式度清楚，也容易顯得穩重。 | 黑色寬褲讓下半身顏色單純，整體完成度高。 | 若寬褲過於鬆垮，襯衫領帶帶來的正式感可能稍弱。 | pending_human_review |
| M6 | 黑色上衣搭配白色寬褲，對比清楚，視覺乾淨。 | 素色組合簡潔，整體俐落，沒有複雜的花色。 | 若公司文化較保守，上衣與寬褲的輪廓可能讓正式感稍弱。 | pending_human_review |
| F1 | 白色與淺藍搭配清爽，整體視覺乾淨、顏色單純。 | 寬褲牛仔褲的線條自然，沒有過於緊身的輪廓。 | 若公司文化較保守，T 恤與牛仔褲可能讓正式感稍弱。 | pending_human_review |
| F2 | 條紋襯衫搭配領帶，專業輪廓清楚，也顯得穩重。 | 深棕寬腿西褲色調沉穩，下半身線條一致。 | 若場合非常正式，短袖襯衫的正式感可能比長袖稍弱。 | pending_human_review |
| F3 | 條紋襯衫疊穿白色內搭，層次清楚，也不至於死板。 | 黑色寬褲讓下半身顏色單純，整體線條乾淨。 | 若公司文化較保守，疊穿與寬褲輪廓可能讓正式感稍弱。 | pending_human_review |
| F4 | 細條紋襯衫搭配領帶，正式輪廓清楚，顏色也單純。 | 黑色寬褲讓整體線條一致，視覺上較為整齊。 | 若公司文化較保守，抽繩寬褲的輪廓可能讓正式感稍弱。 | pending_human_review |
| F5 | 白襯衫搭配黑色及膝裙，輪廓清楚，是辨識度高的正式組合。 | 及膝裙的線條俐落，整體給人整齊、幹練的印象。 | 若面試較重視創意表達，黑白素色可能讓個人風格較不明顯。 | pending_human_review |
| F6 | 淺藍襯衫搭配米白及膝裙，顏色乾淨，整體也顯得溫和。 | 及膝裙維持清楚的正式輪廓，線條整齊。 | 若場合非常正式，淺色組合的穩重感可能比深色稍弱。 | pending_human_review |

## 建議重新整理的 vocabulary / feature matrix

正式版已落地 `src/data/lookFeatures.ts` 作為 surprise / EX / catalog 的單一資料源。TS 文案仍 `pending_human_review`。

| 維度 | 建議取值 | 現況問題 |

目前正式選款只認：顏色 six keys、版型 three levels、下裝四類、style 10 詞、正式/少正式旗標。需求整理與 EX 另認 深色/淺色/中性、正式三檔、印象三檔。這兩套對不齊是本輪最大結構問題。

建議每套 Look 先標這些**互斥或可多選但需一致**的位：

| 維度 | 建議取值 | 現況問題 |
| --- | --- | --- |
| colorFamily | dark / light / mixed | 選款不讀 family；EX 讀 |
| colorTokens | white, beige, black, lightBlue, darkBlue, gray, darkGray, brown | 淺藍深藍合併 |
| pattern | stripe / none | 條紋被當顏色 |
| tie | yes/no | 「不要領帶」無效 |
| cargo | yes/no | 喜歡寬褲會加到 M2 |
| bottom | jeans / dress_pants / wide_pants / skirt | 尚可 |
| fit | structured / relaxed / oversized | F4 抽繩=oversized、M1 牛仔褲=structured，需人工再看圖 |
| formality | high / mid / low | M2 同時 俐落正式 + 個性風格 |
| style | 韓系, 簡約, 層次, 通勤… | 商務休閒/極簡/半正式未進 STYLE_KEYWORDS |
| unsupported | 綠紅粉紫黃橘, 古著若無對應套, 賽車風 | 缺貨應記錄但不加分 |

口語建議加（理解用，不一定加分）：古著、復古、vintage、oversize、商務休閒、不要太正式、也不錯、不排斥、不是不喜歡。


## FAIL / MUST FIX

（無）

## WARNING

### C-style-unknown-dopamine dressing · medium
- 測試輸入：dopamine dressing
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「dopamine dressing」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-gorpcore · medium
- 測試輸入：gorpcore
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「gorpcore」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-normcore · medium
- 測試輸入：normcore
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「normcore」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-typo-unclear-我喜歡簡要 · medium
- 測試輸入：我喜歡簡要 (intent 簡約錯字)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":null,"impression":null,"color":null},"prefsFlag":false}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

### C-typo-unclear-我喜歡韓式 · medium
- 測試輸入：我喜歡韓式 (intent 韓系近音)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":null,"impression":null,"color":null},"prefsFlag":false}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

## PASS（節錄：流程與同分隨機）

### B-tie-bias · low
- 測試輸入：4000 empty-preference surprise draws
- 實際結果：{"M3":405,"F3":435,"F2":477,"M2":450,"F4":463,"M6":425,"M5":442,"M4":448,"F1":455}
- 預期結果：分散在候選池
- 可能原因：max/min=1.18
- 檔案／函式：src/lib/chatPreferences.ts pickRandom
- 建議修法：（audit 輪不改 production）

### J-gate-3min-3msg · low
- 測試輸入：ChatPageContent
- 實際結果：3 min + 3 messages
- 預期結果：不變
- 可能原因：
- 檔案／函式：src/app/chat/ChatPageContent.tsx
- 建議修法：（audit 輪不改 production）

### J-summary-gate · low
- 測試輸入：未開 summary 不能進結果
- 實際結果：handleViewRecommendation 檢查 proSummaryOpened
- 預期結果：阻擋
- 可能原因：
- 檔案／函式：src/app/chat/ChatPageContent.tsx
- 建議修法：（audit 輪不改 production）

### J-pro-once · low
- 測試輸入：PRO High CTA
- 實際結果：triggeredOnce 後不再插入
- 預期結果：第 2 則只發生一次
- 可能原因：
- 檔案／函式：src/components/ChatInterface.tsx
- 建議修法：（audit 輪不改 production）

### J-low-lock · low
- 測試輸入：PRO Low 按鈕
- 實際結果：未解鎖 disabled
- 預期結果：第 2 則前不能開
- 可能原因：
- 檔案／函式：src/components/ChatInterface.tsx
- 建議修法：（audit 輪不改 production）


## 正式收案版已移除的 prototype / testing artifacts

| 項目 | 狀態 |
| --- | --- |
| Card / Paragraph 切換按鈕 | 已自 ChatPageContent 移除 |
| `?resultLayout=paragraph` 正式入口 | `resolveResultLayout` 固定回 card |
| `NEXT_PUBLIC_RESULT_LAYOUT_SWITCH` | 已停用；`.env.example` 不再預設打開 |
| `ResultExplanationView` Paragraph 分支 | 正式流程只留 Card Version |
| 諮詢維度「主動性高可追問」 | 已刪除 |
| `buildResultParagraph` | 僅內部 QA 對齊句長，受試者看不到 |
| QA／audit scripts | `scripts/qa-*.ts`、`docs/qa/` 不進受試者畫面 |


## J. 既有腳本與 build

- `npx tsx scripts/qa-formal-v3.ts`：PASS（既有正式 QA 仍通過；它不覆蓋本輪 negation／EX 矛盾／off-topic）
- `npx tsx scripts/qa-formal-v2-followup.ts`：PASS
- `tsc --noEmit`：PASS
- `npm run build`：PASS（lockfile SWC patch 警告與先前相同，屬良性）
- 本輪未做瀏覽器點擊；3 分鐘 gate、PRO CTA、layout 切換是讀原始碼確認
- 重跑本 audit：`npm run qa:prelaunch`

## 說明：本輪沒有改的東西

- 未改選款、需求整理、EX/TS 文案、prompt、gate
- 未定稿 `lookResultContent.ts`
- 未刪測試切換 UI
