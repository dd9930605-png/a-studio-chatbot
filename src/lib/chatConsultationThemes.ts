/**
 * 自由對話階段建議自然探索的諮詢維度。
 * 供 system prompt 使用：引導 AI 像顧問聊天，而非逐題審問或推銷 Look。
 */
export interface ChatConsultationTheme {
  id: string;
  label: string;
  explore: string;
  exampleTopics: string[];
  mapsToAnswerField?: string;
}

export const CHAT_CONSULTATION_THEMES: ChatConsultationTheme[] = [
  {
    id: 'interviewImpression',
    label: '面試印象',
    explore: '想給面試官什麼感覺、什麼形象',
    exampleTopics: ['專業穩重', '親和友善', '俐落自信', '自然不刻意'],
    mapsToAnswerField: 'stylePreferenceInput',
  },
  {
    id: 'bodyConcern',
    label: '身形修飾',
    explore: '希望修飾或強調的身形部位、穿著困擾',
    exampleTopics: ['顯高顯瘦', '腰線比例', '肩寬', '腿長', '整體份量感'],
    mapsToAnswerField: 'bodyShapeInput',
  },
  {
    id: 'browsingFeel',
    label: '瀏覽感受',
    explore: '對剛才網站 12 套穿搭的整體感受（用風格語言，不強迫點名 Look）',
    exampleTopics: ['喜歡簡約還是正式', '有沒有方向', '還在猶豫', '偏好色系'],
    mapsToAnswerField: 'websitePreferenceInput',
  },
  {
    id: 'koreanFamiliarity',
    label: '韓系經驗',
    explore: '過去是否購買或穿過韓系服飾',
    exampleTopics: ['常買', '偶爾', '沒買過', '不太確定'],
    mapsToAnswerField: 'koreanClothingExperienceInput',
  },
  {
    id: 'usualStyle',
    label: '平時風格',
    explore: '平常穿衣習慣與偏好',
    exampleTopics: ['休閒', '正式', '黑白灰', '韓系', '簡約', '沒有固定風格'],
    mapsToAnswerField: 'usualStyleInput',
  },
  {
    id: 'moodConcern',
    label: '心情與擔憂',
    explore: '面試前的情緒、焦慮、對穿搭沒信心等',
    exampleTopics: ['緊張', '沒想法', '怕太正式', '怕太隨便', '不確定什麼適合'],
  },
];

export function buildConsultationThemesBlock(): string {
  const themeLines = CHAT_CONSULTATION_THEMES.map(
    (theme) =>
      `- **${theme.label}**：${theme.explore}（例如：${theme.exampleTopics.join('、')}）`,
  ).join('\n');

  return `### 建議自然探索的諮詢維度（軟性目標，非必填清單）
${themeLines}

#### 如何使用這些維度
- 像真人顧問聊天一樣**自然帶出**，不要逐題逼問，不要說「現在請回答第 X 題」。
- 3–5 分鐘內能透過對話觸及 **2–4 個維度** 即可，不必全部問完。
- 優先跟隨使用者**當下想聊的話題**；他若只想聊心情，就先陪聊心情。
- 主動性高：可在回覆末尾**最多一個**輕鬆追問，串到尚未聊過的維度。
- 主動性低：等使用者主動延伸，不要連續追問。
- 探索時用**風格語言**，不要變成推銷特定 Look 編號。`;
}
