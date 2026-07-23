import { del, get, list, put } from '@vercel/blob';
import { ParticipantData } from '@/lib/dataRecorder';

const PREFIX = 'participants/';
const COUNTER_PATH = 'meta/serial-counter.json';
const BLOB_ACCESS = 'private' as const;

function blobPath(participantId: string): string {
  return `${PREFIX}${participantId}.json`;
}

/** Vercel 上可能用 BLOB_READ_WRITE_TOKEN 或 BLOB_STORE_ID + OIDC */
export function isCloudStorageConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.BLOB_STORE_ID) return true;

  return Object.keys(process.env).some(
    (key) => key.endsWith('_READ_WRITE_TOKEN') && Boolean(process.env[key]),
  );
}

function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_READ_WRITE_TOKEN') && value) {
      return value;
    }
  }

  return undefined;
}

function getBlobCommandOptions() {
  const token = getBlobToken();
  return token ? { token } : {};
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

/** 僅將 1–4 位純數字視為流水號（略過舊版 6 位雜湊碼） */
export function parseSerialCode(code: string | null | undefined): number | null {
  if (!code) return null;
  if (!/^\d{1,4}$/.test(code)) return null;
  const n = parseInt(code, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatSerialCode(n: number): string {
  return String(n).padStart(3, '0');
}

async function readSerialCounter(): Promise<number> {
  try {
    const result = await get(COUNTER_PATH, {
      access: BLOB_ACCESS,
      useCache: false,
      ...getBlobCommandOptions(),
    });
    if (!result?.stream) return 0;
    const text = await streamToText(result.stream);
    const parsed = JSON.parse(text) as { next?: number };
    return typeof parsed.next === 'number' && parsed.next >= 0 ? parsed.next : 0;
  } catch {
    return 0;
  }
}

async function writeSerialCounter(next: number): Promise<void> {
  await put(COUNTER_PATH, JSON.stringify({ next }), {
    access: BLOB_ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    ...getBlobCommandOptions(),
  });
}

/**
 * 發放下一個短流水號：001、002、003…
 * - 已有資料：接續最大編號 + 1（例如 001–005 都在 → 下一號 006）
 * - 資料全清空：從頭發 001
 */
export async function allocateNextSerialCode(): Promise<string> {
  if (!isCloudStorageConfigured()) {
    throw new Error('雲端儲存尚未設定');
  }

  const participants = await getAllParticipantsFromCloud();

  // 沒有任何受試者資料 → 編號歸零重來
  if (participants.length === 0) {
    await writeSerialCounter(1);
    return formatSerialCode(1);
  }

  let maxUsed = 0;
  for (const participant of participants) {
    const n = parseSerialCode(participant.completionCode);
    if (n && n > maxUsed) maxUsed = n;
  }

  const counter = await readSerialCounter();
  const next = Math.max(maxUsed, counter) + 1;
  await writeSerialCounter(next);
  return formatSerialCode(next);
}

export async function saveParticipantToCloud(data: ParticipantData): Promise<void> {
  if (!isCloudStorageConfigured()) {
    throw new Error('雲端儲存尚未設定（缺少 BLOB_READ_WRITE_TOKEN 或 BLOB_STORE_ID）');
  }

  await put(blobPath(data.participantId), JSON.stringify(data), {
    access: BLOB_ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    ...getBlobCommandOptions(),
  });
}

export async function getAllParticipantsFromCloud(): Promise<ParticipantData[]> {
  if (!isCloudStorageConfigured()) {
    return [];
  }

  const { blobs } = await list({
    prefix: PREFIX,
    ...getBlobCommandOptions(),
  });
  const participants: ParticipantData[] = [];

  for (const blob of blobs) {
    try {
      const result = await get(blob.pathname, {
        access: BLOB_ACCESS,
        useCache: false,
        ...getBlobCommandOptions(),
      });
      if (!result?.stream) continue;

      const text = await streamToText(result.stream);
      const data = JSON.parse(text) as ParticipantData;
      if (data.participantId) {
        participants.push(data);
      }
    } catch {
      // Skip corrupted entries
    }
  }

  return participants.sort((a, b) =>
    (b.sessionStartTime || '').localeCompare(a.sessionStartTime || ''),
  );
}

export async function clearAllParticipantsFromCloud(): Promise<void> {
  if (!isCloudStorageConfigured()) {
    throw new Error('雲端儲存尚未設定');
  }

  const { blobs } = await list({
    prefix: PREFIX,
    ...getBlobCommandOptions(),
  });
  await Promise.all(
    blobs.map((blob) => del(blob.url, getBlobCommandOptions())),
  );

  try {
    await writeSerialCounter(0);
  } catch {
    // counter reset best-effort
  }
}
