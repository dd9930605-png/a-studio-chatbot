# 正式收案前 QA / robustness audit

稽核對象：`origin/main`（PR #43 合併後）。**未改 production 邏輯。**  
OpenAI 線上模型回覆無法在無金鑰環境窮舉；聊天理解以 production 的 `extractChatPreferences`、`extractExplicitChatNeeds`、`generateFreeChatFallbackReply`、`isClearlyOffTopic` 與 system prompt 文字為準。

## 計數

| 測試組 | 跑了 | Pass | Warning | Fail |
| --- | ---: | ---: | ---: | ---: |
| A feature matrix | 19 | 12 | 4 | 3 |
| B pool/resolve | 50 | 50 | 0 | 0 |
| B scoring simulation | 384 | 384 | 0 | 0 |
| B tie randomness | 1 | 1 | 0 | 0 |
| B PK tournament | 4 | 4 | 0 | 0 |
| C style terms | 29 | 19 | 10 | 0 |
| C typos | 14 | 6 | 7 | 1 |
| C weak preference | 16 | 16 | 0 | 0 |
| C negation | 10 | 6 | 0 | 4 |
| C preference revision | 4 | 2 | 0 | 2 |
| C multi-constraint | 2 | 1 | 0 | 1 |
| D unavailable catalog | 26 | 25 | 0 | 1 |
| E off-topic boundary | 20 | 12 | 0 | 8 |
| F known-info reask | 2 | 1 | 0 | 1 |
| G AN×PRO orthogonality | 9 | 8 | 0 | 1 |
| H EX evidence mismatch | 60 | 50 | 0 | 10 |
| I TS copy | 48 | 48 | 0 | 0 |
| J process + prototype artifacts | 7 | 6 | 0 | 1 |

- PASS findings：5（含流程確認）
- WARNING：21
- FAIL / MUST FIX：32

## A. 12 套特徵矩陣

| Look | ID | 顯示/穿著 | male | female | 顏色keys | 淺 | 深 | fit | bottom | 正式標 | 休閒標 | 領帶 | 工裝 | 牛仔 | 裙 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | M1 | male/neutral | Y | Y | white+black+gray | Y | Y | structured | jeans | 半正式 | — | Y | n | Y | n |
| 2 | M2 | male/neutral | Y | Y | black+gray | n | Y | oversized | wide_pants | 俐落正式 | 個性風格 | n | Y | n | n |
| 3 | M3 | male/neutral | Y | Y | white+blue+brown | Y | Y | relaxed | jeans | — | 商務休閒 | n | n | Y | n |
| 4 | M4 | male/neutral | Y | Y | black+gray | n | Y | relaxed | dress_pants | — | — | n | n | n | n |
| 5 | M5 | male/male_only | Y | n | black+blue+stripe | Y | Y | relaxed | wide_pants | 正式專業/襯衫領帶 | — | Y | n | n | n |
| 6 | M6 | male/male_only | Y | n | white+black | Y | Y | relaxed | wide_pants | — | — | n | n | n | n |
| 7 | F1 | female/neutral | Y | Y | white+blue | Y | n | relaxed | jeans | — | — | n | n | Y | n |
| 8 | F2 | female/neutral | Y | Y | brown+stripe | n | Y | relaxed | dress_pants | 俐落正式 | — | Y | n | n | n |
| 9 | F3 | female/neutral | Y | Y | white+black+blue+stripe | Y | Y | relaxed | wide_pants | 柔和專業 | — | n | n | n | n |
| 10 | F4 | female/neutral | Y | Y | black+stripe | n | Y | oversized | wide_pants | 俐落正式 | — | Y | n | n | n |
| 11 | F5 | female/female_only | n | Y | white+black | Y | Y | structured | skirt | 正式專業 | — | n | n | n | Y |
| 12 | F6 | female/female_only | n | Y | white+blue | Y | n | structured | skirt | 柔和專業 | — | n | n | n | Y |

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

## 建議重新整理的 vocabulary / feature matrix（先不要換 production）

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

### A-M2-tag-conflict · high
- 測試輸入：Look 2 M2 tags=俐落正式/個性風格/面試適用
- 實際結果：同時有正式標 俐落正式 與休閒標 個性風格
- 預期結果：同一套不應同時被 wantsFormal 加分又被硬排除
- 可能原因：styleTags 內部矛盾。wantsFormal 會因 CASUAL_STYLE_TAGS 硬排除，同時 FORMAL_STYLE_TAGS 又會給這套加分。
- 檔案／函式：public/outfits.json, src/lib/chatPreferences.ts (CASUAL_STYLE_TAGS / FORMAL_STYLE_TAGS)
- 建議修法：M2 建議拿掉「俐落正式」，改留個性／街頭；或把「個性風格」移出硬排除名單。

### A-business-casual-excluded · high
- 測試輸入：M2:俐落正式/個性風格/面試適用；M3:韓系/層次穿搭/商務休閒
- 實際結果：wantsFormal 只要 styleTag includes「休閒」就硬排除。M3「商務休閒」會被當成休閒而排除。
- 預期結果：商務休閒應可服務「希望正式一點」的中間地帶，不應整套剔除
- 可能原因：CASUAL_STYLE_TAGS 用 includes，商務休閒含休閒
- 檔案／函式：src/lib/chatPreferences.ts CASUAL_STYLE_TAGS, outfitConflictsWithPreferences
- 建議修法：改成 tag 全等或獨立 business_casual，不要用 includes「休閒」

### A-family-colors-not-scored · blocker
- 測試輸入：深色系 / 淺色系 / 中性色（快速三題與需求整理都用這三個）
- 實際結果：surprise scoring 只認白/黑/藍/灰/咖/條紋，不讀 深色/淺色/中性色
- 預期結果：若正式規格是聊天色系影響 surprise，family 必須進 scoring；否則 EX 不得引用 family 當推薦理由
- 可能原因：選款 extractChatPreferences 與需求整理 extractExplicitChatNeeds / 快速三題是兩套詞表
- 檔案／函式：src/lib/chatPreferences.ts, src/lib/needSummary.ts, src/lib/quickPreferences.ts, src/lib/resultContent.ts
- 建議修法：二選一：family 納入 scoring，或 EX High 遇到與 final Look 矛盾的 family 時改用情境 fallback

### C-typo-miss-我喜歡寬寬的褲子 · high
- 測試輸入：我喜歡寬寬的褲子 (intent 口語寬)
- 實際結果：{"likes":[],"dislikes":[],"wide":false,"fit":[],"styles":[],"needs":{"formality":null,"impression":null,"color":null}}
- 預期結果：應仍抓到 口語寬
- 可能原因：keyword 過窄或口語變體沒覆蓋
- 檔案／函式：src/lib/chatPreferences.ts, src/lib/needSummary.ts
- 建議修法：補常見口語/錯字，但不要 fuzzy 到完全不同偏好

### C-neg-我不想穿寬鬆的 · high
- 測試輸入：我不想穿寬鬆的
- 實際結果：{"liked":[],"disliked":[],"formal":false,"lessFormal":false,"fitPref":["relaxed"],"fitAvoid":["oversized"],"needs":{"formality":null,"impression":null,"color":null}}
- 預期結果：avoid oversized, 不得 prefer relaxed
- 可能原因：negation scope：isDislikeClause / LIKE_MARKER / 正式一點 正則過寬
- 檔案／函式：src/lib/needSummary.ts isDislikeClause FORMALITY_PATTERNS, src/lib/chatPreferences.ts, src/lib/catalogBoundaries.ts hasDislikePolarity
- 建議修法：處理「不排斥／不是不／也不是不行／不是很喜歡」，並把「不要領帶」納入單品 constraint

### C-neg-necktie-untracked · high
- 測試輸入：不要領帶
- 實際結果：{"prefs":{"dislikedColors":[],"strongDislikedColors":[],"likedColors":[],"avoidedFitLevels":[],"preferredFitLevels":[],"softAvoidFitLevels":[],"wantsFormal":false,"wantsLessFormal":false,"dislikesSkirt":false,"dislikesJeans":false,"dislikesDressPants":false,"dislikesWidePants":false,"dislikesCargo":false,"dislikesPants":false,"prefersJeans":false,"prefersDressPants":false,"prefersWidePants":false,"prefersPants":false,"prefersSkirt":false,"matchedStyleKeywords":[],"requestedUnavailableColors":[],"requestedUnavailableBottoms":[]},"needs":{"formality":null,"impression":null,"color":null}}
- 預期結果：領帶是 12 套裡真實單品（M1/M5/F2/F4），應能避開或至少記錄
- 可能原因：沒有 necktie 特徵。評分與需求整理都不讀領帶。
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：新增 hasTie 特徵，不要領帶時排除 M1/M5/F2/F4

### C-neg-我不是很喜歡淺色 · high
- 測試輸入：我不是很喜歡淺色
- 實際結果：{"liked":[],"disliked":[],"formal":false,"lessFormal":false,"fitPref":[],"fitAvoid":[],"needs":{"formality":null,"impression":null,"color":"light"}}
- 預期結果：不得 liked light family / 淺色系
- 可能原因：negation scope：isDislikeClause / LIKE_MARKER / 正式一點 正則過寬
- 檔案／函式：src/lib/needSummary.ts isDislikeClause FORMALITY_PATTERNS, src/lib/chatPreferences.ts, src/lib/catalogBoundaries.ts hasDislikePolarity
- 建議修法：處理「不排斥／不是不／也不是不行／不是很喜歡」，並把「不要領帶」納入單品 constraint

### C-neg-我不排斥正式一點 · high
- 測試輸入：我不排斥正式一點
- 實際結果：{"liked":[],"disliked":[],"formal":true,"lessFormal":false,"fitPref":[],"fitAvoid":[],"needs":{"formality":"formal","impression":null,"color":null}}
- 預期結果：不排斥 ≠ 希望正式
- 可能原因：negation scope：isDislikeClause / LIKE_MARKER / 正式一點 正則過寬
- 檔案／函式：src/lib/needSummary.ts isDislikeClause FORMALITY_PATTERNS, src/lib/chatPreferences.ts, src/lib/catalogBoundaries.ts hasDislikePolarity
- 建議修法：處理「不排斥／不是不／也不是不行／不是很喜歡」，並把「不要領帶」納入單品 constraint

### C-rev-我喜歡深色/淺色好像也可以 · high
- 測試輸入：我喜歡深色 → 淺色好像也可以
- 實際結果：{"needColor":"light","liked":[]}
- 預期結果：弱表述不應覆蓋強偏好
- 可能原因：弱句覆蓋或強句沒留下
- 檔案／函式：src/lib/needSummary.ts WEAK_CLAUSE
- 建議修法：弱句（好像也可以）不覆蓋先前明確深色

### C-rev-black-ok · high
- 測試輸入：我喜歡淺色 → 黑色的好像也不錯
- 實際結果：{"needColor":"light","liked":[]}
- 預期結果：最新可接受的黑色應覆蓋淺色 family，或至少 other 記錄黑色；不得只停在淺色還拿去寫 EX
- 可能原因：LIKE_MARKER 不含「也不錯」；「黑」不會更新 needSummary.color
- 檔案／函式：src/lib/needSummary.ts LIKE_MARKER, src/lib/chatPreferences.ts LIKE_MARKERS
- 建議修法：點名顏色+也不錯/好吧當選定；弱「好像也可以」仍不覆蓋

### C-multi-1 · high
- 測試輸入：我想要簡約一點但不要太正式，而且不要黑色
- 實際結果：{"prefs":{"disliked":["black"],"styles":[],"less":true},"needs":{"formality":"less_formal","impression":null,"color":null}}
- 預期結果：同時保留 簡約 + 不要太正式 + 不要黑色
- 可能原因：子句切割或只抓第一個詞
- 檔案／函式：src/lib/chatPreferences.ts extractChatPreferences, src/lib/needSummary.ts
- 建議修法：按子句解析，多 constraint 都留下

### D-light-family-stock · blocker
- 測試輸入：我現在突然喜歡淺色
- 實際結果：{"fallback":"了解～你提到「我現在突然喜歡淺色」，我記住了 😊","unavailableDetector":null,"openaiGuard":"correctFalseUnavailableCatalogClaims 不處理「沒有淺色」"}
- 預期結果：淺色有白色／米白／淺藍。fallback 不得說沒貨；OpenAI 若說沒有淺色必須被校正。
- 可能原因：family 色不在 UNAVAILABLE_COLOR_GROUPS，也不在有賣校正。無金鑰時 fallback 只「記住了」，有模型時曾出現「沒有淺色的單品」。
- 檔案／函式：src/lib/catalogBoundaries.ts correctFalseUnavailableCatalogClaims, src/lib/aiResponses.ts, src/app/api/chat/route.ts
- 建議修法：明確規定淺色＝白／米白／淺藍；回覆出現「沒有淺色」立刻改寫。本輪不改 production。

### E-no-redirect-我要去打遊戲 · high
- 測試輸入：我要去打遊戲
- 實際結果：{"off":true,"fallback":"了解～你提到「我要去打遊戲」，我記住了 😊","freeChatSkipsGate":true}
- 預期結果：真正離題可短回應，但要帶回面試穿搭，不得當成穿搭偏好記住
- 可能原因：自由聊天 API（step=freeChat）不呼叫 isClearlyOffTopic / validateChatInput；fallback 預設「我記住了」
- 檔案／函式：src/app/api/chat/route.ts handleFreeChat, src/lib/aiResponses.ts generateFreeChatFallbackReply, isClearlyOffTopic
- 建議修法：自由聊天對明顯離題走「短接 + 帶回面試穿搭」，不要寫進偏好

### E-no-redirect-今天下雨嗎 · high
- 測試輸入：今天下雨嗎
- 實際結果：{"off":true,"fallback":"了解～你提到「今天下雨嗎」，我記住了 😊","freeChatSkipsGate":true}
- 預期結果：真正離題可短回應，但要帶回面試穿搭，不得當成穿搭偏好記住
- 可能原因：自由聊天 API（step=freeChat）不呼叫 isClearlyOffTopic / validateChatInput；fallback 預設「我記住了」
- 檔案／函式：src/app/api/chat/route.ts handleFreeChat, src/lib/aiResponses.ts generateFreeChatFallbackReply, isClearlyOffTopic
- 建議修法：自由聊天對明顯離題走「短接 + 帶回面試穿搭」，不要寫進偏好

### E-no-redirect-我想分手了 · high
- 測試輸入：我想分手了
- 實際結果：{"off":false,"fallback":"了解～你提到「我想分手了」，我記住了 😊","freeChatSkipsGate":true}
- 預期結果：真正離題可短回應，但要帶回面試穿搭，不得當成穿搭偏好記住
- 可能原因：自由聊天 API（step=freeChat）不呼叫 isClearlyOffTopic / validateChatInput；fallback 預設「我記住了」
- 檔案／函式：src/app/api/chat/route.ts handleFreeChat, src/lib/aiResponses.ts generateFreeChatFallbackReply, isClearlyOffTopic
- 建議修法：自由聊天對明顯離題走「短接 + 帶回面試穿搭」，不要寫進偏好

### E-no-redirect-今天心情不好喔哈哈哈去爬山 · high
- 測試輸入：今天心情不好喔哈哈哈去爬山
- 實際結果：{"off":false,"fallback":"了解～你提到「今天心情不好喔哈哈哈去爬山」，我記住了 😊","freeChatSkipsGate":true}
- 預期結果：真正離題可短回應，但要帶回面試穿搭，不得當成穿搭偏好記住
- 可能原因：自由聊天 API（step=freeChat）不呼叫 isClearlyOffTopic / validateChatInput；fallback 預設「我記住了」
- 檔案／函式：src/app/api/chat/route.ts handleFreeChat, src/lib/aiResponses.ts generateFreeChatFallbackReply, isClearlyOffTopic
- 建議修法：自由聊天對明顯離題走「短接 + 帶回面試穿搭」，不要寫進偏好

### E-border-我明天要上班 · high
- 測試輸入：我明天要上班
- 實際結果：keyword 命中 上班/薪水/考試 → off-topic
- 預期結果：含面試／穿衣意圖時不得因單一職業詞判離題
- 可能原因：isClearlyOffTopic 只要 includes(keyword)
- 檔案／函式：src/lib/aiResponses.ts isClearlyOffTopic
- 建議修法：不要用單一字（上班、考試、薪水、電影）做硬閘

### E-border-薪水不高不知道怎麼穿 · high
- 測試輸入：薪水不高不知道怎麼穿
- 實際結果：keyword 命中 上班/薪水/考試 → off-topic
- 預期結果：含面試／穿衣意圖時不得因單一職業詞判離題
- 可能原因：isClearlyOffTopic 只要 includes(keyword)
- 檔案／函式：src/lib/aiResponses.ts isClearlyOffTopic
- 建議修法：不要用單一字（上班、考試、薪水、電影）做硬閘

### E-border-考試結束要面試 · high
- 測試輸入：考試結束要面試
- 實際結果：keyword 命中 上班/薪水/考試 → off-topic
- 預期結果：含面試／穿衣意圖時不得因單一職業詞判離題
- 可能原因：isClearlyOffTopic 只要 includes(keyword)
- 檔案／函式：src/lib/aiResponses.ts isClearlyOffTopic
- 建議修法：不要用單一字（上班、考試、薪水、電影）做硬閘

### E-hard-keyword-gate · high
- 測試輸入：production free chat vs leftover guided gate
- 實際結果：正式聊天送 step=freeChat，不跑 validateChatInput。isClearlyOffTopic 仍存在，只用於舊引導步驟。清單含 天氣/遊戲/上班/考試/薪水/電影/寵物 等，以 includes 命中。
- 預期結果：不能只靠 keyword 判斷 on/off topic
- 可能原因：硬編碼閘門仍在，且與正式自由聊天路徑不一致
- 檔案／函式：src/lib/aiResponses.ts:297 isClearlyOffTopic, :363 validateChatInput; src/app/api/chat/route.ts:195 自由聊天略過此閘
- 建議修法：收案前決定：要嘛自由聊天也做意圖分流，要嘛刪掉誤導的 guided gate，並把古著等補進 on-topic

### F-G-theme-pro-question · blocker
- 測試輸入：buildConsultationThemesBlock()
- 實際結果：仍寫「主動性高：可在回覆末尾最多一個輕鬆追問」
- 預期結果：PRO 不得在一般聊天多問；已知資訊不得重問
- 可能原因：v3 已把 fallback 追問關掉，但 system prompt 諮詢維度區塊沒改，OpenAI 路徑仍會多問
- 檔案／函式：src/lib/chatConsultationThemes.ts buildConsultationThemesBlock, src/lib/experimentKnowledge.ts
- 建議修法：刪掉這兩行高低主動差異；改成使用者沒問就不要追問

### H-M2-chat-light-light · blocker
- 測試輸入：final=Look 2 M2 深灰破邊長袖襯衫＋黑色工裝寬褲; chat-light ["我喜歡淺色"]
- 實際結果：本次推薦 Look 2「深灰破邊長袖襯衫＋黑色工裝寬褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及正式程度保持適中；判斷重點是淺色且視覺乾淨的配色，以及線條清楚且不過度休閒，這兩項是本次判斷重點。亮點是深灰與黑色搭配清楚，整體有一致的深色輪廓，另外工裝寬褲的輪廓明確，個人風格比一般正裝更明顯。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-M2-chat-override-light-light · blocker
- 測試輸入：final=Look 2 M2 深灰破邊長袖襯衫＋黑色工裝寬褲; chat-override-light ["我想改成淺色"]
- 實際結果：本次推薦 Look 2「深灰破邊長袖襯衫＋黑色工裝寬褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及你選擇：偏正式；判斷重點是淺色且視覺乾淨的配色，以及正式感清楚、保持整潔，這兩項是本次判斷重點。亮點是深灰與黑色搭配清楚，整體有一致的深色輪廓，另外工裝寬褲的輪廓明確，個人風格比一般正裝更明顯。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-M4-chat-light-light · blocker
- 測試輸入：final=Look 4 M4 黑色T恤＋灰色寬腿西褲; chat-light ["我喜歡淺色"]
- 實際結果：本次推薦 Look 4「黑色T恤＋灰色寬腿西褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及正式程度保持適中；判斷重點是淺色且視覺乾淨的配色，以及線條清楚且不過度休閒，這兩項是本次判斷重點。亮點是黑色上衣搭配灰色寬腿西褲，線條乾淨、配色單純，另外素色搭配低調，整體簡潔，沒有多餘的裝飾細節，這也是這套的亮點。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-M4-chat-override-light-light · blocker
- 測試輸入：final=Look 4 M4 黑色T恤＋灰色寬腿西褲; chat-override-light ["我想改成淺色"]
- 實際結果：本次推薦 Look 4「黑色T恤＋灰色寬腿西褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及你選擇：偏正式；判斷重點是淺色且視覺乾淨的配色，以及正式感清楚、保持整潔，這兩項是本次判斷重點。亮點是黑色上衣搭配灰色寬腿西褲，線條乾淨、配色單純，另外素色搭配低調，整體簡潔，沒有多餘的裝飾細節，這也是這套的亮點。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-F1-chat-dark-dark · blocker
- 測試輸入：final=Look 7 F1 白色T恤＋淺藍寬褲牛仔褲; chat-dark
- 實際結果：本次推薦 Look 7「白色T恤＋淺藍寬褲牛仔褲」，作為面試穿搭。需求是你在對話中提到希望深色系，以及正式程度保持適中；判斷重點是深色且對比清楚的配色，以及線條清楚且不過度休閒，這兩項是本次判斷重點。亮點是白色與淺藍搭配清爽，整體視覺乾淨、顏色單純，另外寬褲牛仔褲的線條自然，沒有過於緊身的輪廓，這也是這套的亮點。
- 預期結果：不得用深色需求解釋淺色 Look（如 F1/F6）
- 可能原因：evidence 與商品色系未對齊
- 檔案／函式：src/lib/resultContent.ts
- 建議修法：矛盾 evidence 排除；fallback 用中性面試需求

### H-F2-chat-light-light · blocker
- 測試輸入：final=Look 8 F2 條紋襯衫＋領帶＋深棕寬腿西褲; chat-light ["我喜歡淺色"]
- 實際結果：本次推薦 Look 8「條紋襯衫＋領帶＋深棕寬腿西褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及正式程度保持適中；判斷重點是淺色且視覺乾淨的配色，以及線條清楚且不過度休閒，這兩項是本次判斷重點。亮點是條紋襯衫搭配領帶，專業輪廓清楚，也顯得穩重，另外深棕寬腿西褲色調沉穩，下半身線條一致，這也是這套的亮點。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-F2-chat-override-light-light · blocker
- 測試輸入：final=Look 8 F2 條紋襯衫＋領帶＋深棕寬腿西褲; chat-override-light ["我想改成淺色"]
- 實際結果：本次推薦 Look 8「條紋襯衫＋領帶＋深棕寬腿西褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及你選擇：偏正式；判斷重點是淺色且視覺乾淨的配色，以及正式感清楚、保持整潔，這兩項是本次判斷重點。亮點是條紋襯衫搭配領帶，專業輪廓清楚，也顯得穩重，另外深棕寬腿西褲色調沉穩，下半身線條一致，這也是這套的亮點。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-F4-chat-light-light · blocker
- 測試輸入：final=Look 10 F4 細條紋襯衫＋領帶＋黑色抽繩寬褲; chat-light ["我喜歡淺色"]
- 實際結果：本次推薦 Look 10「細條紋襯衫＋領帶＋黑色抽繩寬褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及正式程度保持適中；判斷重點是淺色且視覺乾淨的配色，以及線條清楚且不過度休閒，這兩項是本次判斷重點。亮點是細條紋襯衫搭配領帶，正式輪廓清楚，顏色也單純，另外黑色寬褲讓整體線條一致，視覺上較為整齊，這也是這套的亮點。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-F4-chat-override-light-light · blocker
- 測試輸入：final=Look 10 F4 細條紋襯衫＋領帶＋黑色抽繩寬褲; chat-override-light ["我想改成淺色"]
- 實際結果：本次推薦 Look 10「細條紋襯衫＋領帶＋黑色抽繩寬褲」，作為面試穿搭。需求是你在對話中提到希望淺色系，以及你選擇：偏正式；判斷重點是淺色且視覺乾淨的配色，以及正式感清楚、保持整潔，這兩項是本次判斷重點。亮點是細條紋襯衫搭配領帶，正式輪廓清楚，顏色也單純，另外黑色寬褲讓整體線條一致，視覺上較為整齊，這也是這套的亮點。
- 預期結果：不得寫「因為你喜歡淺色所以推薦這套深色 Look」
- 可能原因：chooseNeeds 不看 final Look 色系。surprise 也不讀 淺色 family，可能隨機抽到 M2/M4。
- 檔案／函式：src/lib/resultContent.ts chooseNeeds, src/lib/chatPreferences.ts extractChatPreferences
- 建議修法：EX High 若需求與 final Look 明顯矛盾，改用情境 fallback 或改寫成「你提到淺色，但這套是深色，以下是目前候選中的結果」——先確認規格再改

### H-F6-chat-dark-dark · blocker
- 測試輸入：final=Look 12 F6 淺藍襯衫＋米白及膝裙; chat-dark
- 實際結果：本次推薦 Look 12「淺藍襯衫＋米白及膝裙」，作為面試穿搭。需求是你在對話中提到希望深色系，以及正式程度保持適中；判斷重點是深色且對比清楚的配色，以及線條清楚且不過度休閒，這兩項是本次判斷重點。亮點是淺藍襯衫搭配米白及膝裙，顏色乾淨，整體也顯得溫和，另外及膝裙維持清楚的正式輪廓，線條整齊，這也是這套的亮點。
- 預期結果：不得用深色需求解釋淺色 Look（如 F1/F6）
- 可能原因：evidence 與商品色系未對齊
- 檔案／函式：src/lib/resultContent.ts
- 建議修法：矛盾 evidence 排除；fallback 用中性面試需求

### J-layout-switch-live · blocker
- 測試輸入：NEXT_PUBLIC_RESULT_LAYOUT_SWITCH current=(unset => enabled)
- 實際結果：unset/非 0 時，?resultLayout=paragraph 生效，結果頁顯示卡片/段落測試按鈕
- 預期結果：正式受試者不得看到學長段落版與切換器
- 可能原因：.env.example 預設 SWITCH=1；程式預設「不是 0 就開啟」
- 檔案／函式：.env.example, src/lib/resultLayout.ts, src/app/chat/ChatPageContent.tsx:485, src/components/ResultExplanationView.tsx
- 建議修法：收案前設 NEXT_PUBLIC_RESULT_LAYOUT_SWITCH=0 並改預設關閉。本輪先不刪程式。

## WARNING

### A-M2-cargo-as-wide · medium
- 測試輸入：深灰破邊長袖襯衫＋黑色工裝寬褲
- 實際結果：bottomKind=wide_pants，喜歡「寬褲」會幫工裝套加分
- 預期結果：工裝不在評分加分池；喜歡寬褲不應把破邊工裝當一般寬褲
- 可能原因：OUTFIT_BOTTOM_KIND 把 M2 歸 wide_pants，喜歡工裝才不加分
- 檔案／函式：src/lib/chatPreferences.ts OUTFIT_BOTTOM_KIND
- 建議修法：M2 另列 cargo，或喜歡寬褲時排除名稱含工裝的套裝

### A-stripe-as-color · medium
- 測試輸入：stripe looks M5,F2,F3,F4
- 實際結果：「條紋」被當成 ColorKey，喜歡條紋與喜歡顏色走同一套 +3
- 預期結果：條紋是花色／圖案，不應與黑白灰咖同層
- 可能原因：COLOR_TERMS.stripe
- 檔案／函式：src/lib/chatPreferences.ts COLOR_TERMS
- 建議修法：條紋改為 pattern flag，不要占用色系鍵

### A-blue-undifferentiated · high
- 測試輸入：淺藍 / 深藍 / 藍色 / 藍
- 實際結果：全部映射成 ColorKey blue，深淺藍無法分開加分或排除
- 預期結果：淺色偏好不應把深藍當命中，深色偏好不應把淺藍當命中
- 可能原因：COLOR_TERMS.blue 把淺藍與深藍合併
- 檔案／函式：src/lib/chatPreferences.ts COLOR_TERMS, getOutfitColorKeys
- 建議修法：拆 lightBlue / darkBlue，或改走深淺色系 family

### A-unscored-tags · medium
- 測試輸入：半正式、個性風格、面試適用、層次穿搭、商務休閒、正式專業、襯衫領帶、柔和專業
- 實際結果：這些商品標籤出現在 outfits.json，但 STYLE_KEYWORDS 不會因此加分
- 預期結果：評分詞彙對齊 12 套實際標籤，或明確宣布這些標籤不進 surprise scoring
- 可能原因：STYLE_KEYWORDS 是舊清單：簡約/簡單/乾淨/俐落/韓系/清爽/時尚/知性/親切/自然
- 檔案／函式：src/lib/chatPreferences.ts STYLE_KEYWORDS, public/outfits.json
- 建議修法：補 商務休閒、半正式、層次穿搭、極簡、通勤；古著/復古/vintage 若要理解至少當風格，不要進錯誤 Look

### C-style-unknown-古著 · medium
- 測試輸入：古著
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「古著」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-Vintage · medium
- 測試輸入：Vintage
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「Vintage」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-vintage · medium
- 測試輸入：vintage
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「vintage」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-Y2K · medium
- 測試輸入：Y2K
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「Y2K」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-old money · medium
- 測試輸入：old money
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「old money」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-quiet luxury · medium
- 測試輸入：quiet luxury
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「quiet luxury」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

### C-style-unknown-clean fit · medium
- 測試輸入：clean fit
- 實際結果：{"off":false,"relevant":false,"prefs":{"likes":[],"styles":[]},"fallback":"了解～你提到「clean fit」，我記住了 😊"}
- 預期結果：至少當穿搭風格；意思不確定時應追問 clarification，而不是當離題或假裝定義
- 可能原因：SHORT_STYLE_TERMS 沒有這個詞。正式自由聊天不走 validateChatInput，所以 API 不會擋；但也沒有 clarification。
- 檔案／函式：src/lib/aiResponses.ts SHORT_STYLE_TERMS, generateFreeChatFallbackReply
- 建議修法：未知風格名：回「這比較像穿搭風格，你是指版型、顏色還是正式度？」不要編造定義

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

### C-typo-unclear-我喜歡深色系 · medium
- 測試輸入：我喜歡深色系 (intent 深色)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":null,"impression":null,"color":"dark"},"prefsFlag":false}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

### C-typo-unclear-我喜歡淺色系 · medium
- 測試輸入：我喜歡淺色系 (intent 淺色)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":null,"impression":null,"color":"light"},"prefsFlag":false}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

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

### C-typo-unclear-我喜歡jeans · medium
- 測試輸入：我喜歡jeans (intent 英文牛仔褲)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":null,"impression":null,"color":null},"prefsFlag":false}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

### C-typo-unclear-不要太正式ㄅ · medium
- 測試輸入：不要太正式ㄅ (intent 注音口語)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":"less_formal","impression":null,"color":null},"prefsFlag":true}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

### C-typo-unclear-我喜歡合身ㄧ點 · medium
- 測試輸入：我喜歡合身ㄧ點 (intent 合身錯字)
- 實際結果：{"likes":[],"styles":[],"needs":{"formality":null,"impression":null,"color":null},"prefsFlag":true}
- 預期結果：意思不一定唯一時應 clarification，不要亂配
- 可能原因：沒有對應詞就整句當一般文字記住
- 檔案／函式：src/lib/chatPreferences.ts
- 建議修法：近音（韓式/簡要）不要自動映射；可問是不是韓系/簡約

## PASS（節錄：流程與同分隨機）

### B-tie-bias · low
- 測試輸入：4000 empty-preference surprise draws
- 實際結果：{"M5":449,"M3":415,"F4":433,"F1":440,"M4":476,"M2":442,"F3":454,"F2":455,"M6":436}
- 預期結果：分散在候選池
- 可能原因：max/min=1.15
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


## 正式版上線前必須移除的 prototype / testing artifacts

這一輪**先不刪**，只列位置與移除方式。

| 項目 | 檔案 | 移除方式 |
| --- | --- | --- |
| `NEXT_PUBLIC_RESULT_LAYOUT_SWITCH` 預設開啟 | `.env.example` L21–22；Vercel env | 收案前設 `=0`。建議程式改成預設關閉（目前「不是 0 就開」） |
| `?resultLayout=paragraph` | `src/lib/resultLayout.ts` `resolveResultLayout` | SWITCH=0 後失效；正式刪除可連函式一併拿掉 |
| 結果頁「卡片／段落」測試按鈕 | `src/app/chat/ChatPageContent.tsx`约 L485–498，`data-testid="result-layout-switch"` | 刪該區塊；`switchResultLayout` 一併刪 |
| 段落／學長版結果頁 | `src/components/ResultExplanationView.tsx` `layout === 'paragraph'`；`RecommendationCard` `resultLayout` | 正式只留 card 分支 |
| 預設 paragraph env | `src/lib/resultLayout.ts` `defaultResultLayout`、`NEXT_PUBLIC_RESULT_LAYOUT` | 刪 paragraph 取值 |
| 受試者紀錄中的 resultLayoutVersion | `src/lib/dataRecorder.ts`、`exportParticipants.ts`、`admin/page.tsx` | 正式可保留欄位但不要再寫入測試值 |
| 諮詢維度「主動性高可追問」測試殘留 | `src/lib/chatConsultationThemes.ts` L70–71 | 這不是 UI，但是會污染 PRO；刪那兩行 |
| 舊引導步驟 off-topic 硬閘 | `src/lib/aiResponses.ts` `validateChatInput`（freeChat 已不走） | 確認無入口後刪，避免之後誤接 |
| `buildNextMissingInfoQuestion` | `src/lib/aiResponses.ts` | 目前 shouldAsk=false；可刪死碼以免再打開 |
| QA／audit scripts | `scripts/qa-*.ts`、`docs/qa/` | 不要進受試者 bundle（本來就不會） |


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
