import { list, put, del } from '@vercel/blob';
import { ParticipantData } from '@/lib/dataRecorder';

const PREFIX = 'participants/';

function blobPath(participantId: string): string {
  return `${PREFIX}${participantId}.json`;
}

export function isCloudStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveParticipantToCloud(data: ParticipantData): Promise<void> {
  if (!isCloudStorageConfigured()) {
    throw new Error('雲端儲存尚未設定（缺少 BLOB_READ_WRITE_TOKEN）');
  }

  await put(blobPath(data.participantId), JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function getAllParticipantsFromCloud(): Promise<ParticipantData[]> {
  if (!isCloudStorageConfigured()) {
    return [];
  }

  const { blobs } = await list({ prefix: PREFIX });
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
    throw new Error('雲端儲存尚未設定（缺少 BLOB_READ_WRITE_TOKEN）');
  }

  const { blobs } = await list({ prefix: PREFIX });
  await Promise.all(blobs.map((blob) => del(blob.url)));
}
