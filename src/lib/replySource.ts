/**
 * AI 回覆來源。只用於資料紀錄與後台檢查，不影響受試者看到的內容。
 * - gpt：GPT 依 Prompt、知識庫與對話紀錄生成，未經程式改寫
 * - api_error／missing_api_key／parse_error：GPT 沒有產出可用回覆，改用程式備援回覆
 * - color_shortcut：使用者詢問現有色系，程式直接回完整清單
 * - catalog_correction：庫存檢查判定回覆誤稱沒有現有商品，整則換成固定更正句
 * - program_fixed：其他由程式產生的固定訊息（例如高主動性的需求整理提示）
 * - unknown：加入此欄位前的舊資料，無法回推
 */
export type ReplySource =
  | 'gpt'
  | 'api_error'
  | 'missing_api_key'
  | 'parse_error'
  | 'color_shortcut'
  | 'catalog_correction'
  | 'program_fixed'
  | 'unknown';

export const REPLY_SOURCES: ReplySource[] = [
  'gpt',
  'api_error',
  'missing_api_key',
  'parse_error',
  'color_shortcut',
  'catalog_correction',
  'program_fixed',
  'unknown',
];

export const REPLY_SOURCE_LABELS: Record<ReplySource, string> = {
  gpt: 'GPT 正常生成',
  api_error: '備援：API 呼叫失敗',
  missing_api_key: '備援：API Key 缺失',
  parse_error: '備援：模型回覆解析失敗',
  color_shortcut: '色系捷徑',
  catalog_correction: '庫存更正',
  program_fixed: '程式固定訊息',
  unknown: '未記錄（舊資料）',
};

/** GPT 沒有產出可用回覆時的三種備援來源。 */
export const BACKUP_REPLY_SOURCES: ReplySource[] = ['api_error', 'missing_api_key', 'parse_error'];

interface SourcedMessage {
  sender: 'user' | 'bot' | 'system';
  kind?: string;
  replySource?: ReplySource;
}

export function resolveReplySource(message: SourcedMessage): ReplySource {
  if (message.replySource) return message.replySource;
  if (message.kind === 'proSummaryCta') return 'program_fixed';
  return 'unknown';
}

export interface ReplySourceSummary {
  total: number;
  /** api_error + missing_api_key + parse_error */
  backup: number;
  counts: Record<ReplySource, number>;
  /** 依對話順序排列，與 extractBotMessages 的順序一致。 */
  sequence: ReplySource[];
}

export function summarizeReplySources(chatLog: SourcedMessage[]): ReplySourceSummary {
  const counts = Object.fromEntries(REPLY_SOURCES.map((source) => [source, 0])) as Record<
    ReplySource,
    number
  >;
  const sequence = chatLog.filter((message) => message.sender === 'bot').map(resolveReplySource);
  for (const source of sequence) counts[source] += 1;
  return {
    total: sequence.length,
    backup: BACKUP_REPLY_SOURCES.reduce((sum, source) => sum + counts[source], 0),
    counts,
    sequence,
  };
}
