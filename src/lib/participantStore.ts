import { list, put, del } from '@vercel/blob';
import { ParticipantData } from '@/lib/dataRecorder';

const PREFIX = 'participants/';

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

export async function saveParticipantToCloud(data: ParticipantData): Promise<void> {
  if (!isCloudStorageConfigured()) {
    throw new Error('雲端儲存尚未設定（缺少 BLOB_READ_WRITE_TOKEN 或 BLOB_STORE_ID）');
  }

  const token = getBlobToken();
  await put(blobPath(data.participantId), JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    ...(token ? { token } : {}),
  });
}

export async function getAllParticipantsFromCloud(): Promise<ParticipantData[]> {
  if (!isCloudStorageConfigured()) {
    return [];
  }

  const token = getBlobToken();
  const { blobs } = await list({
    prefix: PREFIX,
    ...(token ? { token } : {}),
  });
  const participants: ParticipantData[] = [];

  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = (await response.json()) as ParticipantData;
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

  const token = getBlobToken();
  const { blobs } = await list({
    prefix: PREFIX,
    ...(token ? { token } : {}),
  });
  await Promise.all(blobs.map((blob) => del(blob.url, token ? { token } : undefined)));
}
