import { Condition } from '@/lib/conditions';
import { ResponseStep } from '@/lib/aiResponses';

const NOTE_BUILDERS: Record<ResponseStep, (input: string) => string> = {
  stylePreference: (input) => `已記下你想營造的「${truncate(input)}」形象，推薦時會優先考慮面試第一印象。`,
  bodyShape: (input) => `已記下你想修飾／強調的重點（${truncate(input)}），之後會留意版型與線條。`,
  websitePreference: (input) => `已參考你對網站 12 套穿搭的看法（${truncate(input)}），用來調整推薦方向。`,
  koreanExperience: (input) => `已記下你的韓系服飾經驗（${truncate(input)}），會平衡熟悉感與面試需求。`,
  usualStyle: (input) => `已記下你平時的穿搭習慣（${truncate(input)}），會嘗試與面試場合取得平衡。`,
};

function truncate(text: string, max = 24): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function generateProactiveNote(
  step: ResponseStep,
  userInput: string,
  condition: Condition,
): string {
  const body = NOTE_BUILDERS[step](userInput);
  if (condition.anthropomorphism === 'high') {
    return `💡 顧問筆記：${body}`;
  }
  return `📌 系統備註：${body}`;
}

export function isProactiveNoteMessage(message: string): boolean {
  return message.startsWith('💡 顧問筆記：') || message.startsWith('📌 系統備註：');
}
