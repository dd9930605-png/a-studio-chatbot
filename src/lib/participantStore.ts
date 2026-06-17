import { del, get, list, put } from '@vercel/blob';
import { ParticipantData } from '@/lib/dataRecorder';

const PREFIX = 'participants/';
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
}
