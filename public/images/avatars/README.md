# AI 顧問人物素材

## Emma（高擬人化，條件 1/2/5/6/9/10/13/14）

聊天頁使用 `emma-states/` 內的四張固定人物圖：

```
emma-states/
├── idle.webp
├── listening.webp
├── thinking.webp
└── responding.webp
```

- 四張圖須維持同一人物、服裝、背景、鏡位與光線，只改表情、眼神與小幅動作。
- 建議使用 3:4 直式構圖，人物從頭到大腿上方，並保留手機裁切空間。
- 問候畫面也使用 `idle.webp` 的人物場景；`emma.jpg` 供結果頁對話回顧的小型頭像使用，載入失敗會改用 `emma.svg`。
- 聊天人物狀態完全由前端既有事件切換，不改 AI 回覆或實驗資料。

## A.STUDIO AI（低擬人化，條件 3/4/7/8/11/12/15/16）

使用 `astudio-logo.svg` 作為頭像，不使用人物、機器人五官或 Emma 四狀態圖。

- `astudio-logo.svg` 目前是暫代的文字標誌。取得正式的 A.STUDIO 品牌 Logo 後，以同檔名覆蓋即可（建議正方形）。
- `robot.svg` 是第二次預試使用的頭像，保留供比較或回復。
