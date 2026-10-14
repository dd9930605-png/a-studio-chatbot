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
- 這些只是聽得懂的話題範圍。使用者沒提到的維度，不要主動帶出，也不要追問。
- 使用者說到哪一項，就只回應該項，不要順手改問下一個維度（例如對方只改顏色時，不要改問面試印象、上衣或下裝）。
- 高低主動性在這裡沒有差別：回覆末尾都不要加問題。
- 用風格語言回應，不要變成推銷特定 Look 編號。`;
}
