/**
 * 問卷導向模式
 * - external：推薦結果頁結束後導向 SurveyCake（演示 / Plan B）
 * - internal：導向站內 /survey（原本完整流程）
 *
 * 此演示分支預設為 external。若要暫時切回站內問卷，設：
 *   NEXT_PUBLIC_SURVEY_MODE=internal
 * 原本 main 分支仍維持站內問卷，不受此分支影響。
 */
export type SurveyMode = 'external' | 'internal';

const DEFAULT_SURVEYCAKE_URL = 'https://www.surveycake.com/s/Qy2B7';

export function getSurveyMode(): SurveyMode {
  const raw = (process.env.NEXT_PUBLIC_SURVEY_MODE || 'external').trim().toLowerCase();
  return raw === 'internal' ? 'internal' : 'external';
}

export function isExternalSurveyMode(): boolean {
  return getSurveyMode() === 'external';
}

/** 後測 SurveyCake 網址：環境變數優先，否則用 condition.surveyUrl / 預設 */
export function resolveExternalSurveyUrl(conditionSurveyUrl?: string): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SURVEYCAKE_URL || '').trim();
  if (fromEnv) return fromEnv;
  if (conditionSurveyUrl && conditionSurveyUrl.trim()) return conditionSurveyUrl.trim();
  return DEFAULT_SURVEYCAKE_URL;
}
