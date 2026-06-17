import { NextRequest, NextResponse } from 'next/server';
import { ParticipantData } from '@/lib/dataRecorder';
import {
  clearAllParticipantsFromCloud,
  getAllParticipantsFromCloud,
  isCloudStorageConfigured,
  saveParticipantToCloud,
} from '@/lib/participantStore';

export const dynamic = 'force-dynamic';

function verifyAdminSecret(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return true;
  return request.headers.get('x-admin-secret') === secret;
}

export async function GET() {
  if (!isCloudStorageConfigured()) {
    return NextResponse.json(
      { configured: false, participants: [] },
      { status: 200 },
    );
  }

  const participants = await getAllParticipantsFromCloud();
  return NextResponse.json({ configured: true, participants });
}

export async function POST(request: NextRequest) {
  if (!isCloudStorageConfigured()) {
    return NextResponse.json(
      { error: '雲端儲存尚未設定。請在 Vercel 加入 Blob Storage。' },
      { status: 503 },
    );
  }

  let data: ParticipantData;
  try {
    data = (await request.json()) as ParticipantData;
  } catch {
    return NextResponse.json({ error: '無效的 JSON 資料' }, { status: 400 });
  }

  if (!data.participantId) {
    return NextResponse.json({ error: '缺少 participantId' }, { status: 400 });
  }

  await saveParticipantToCloud(data);
  return NextResponse.json({ ok: true, participantId: data.participantId });
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  if (!isCloudStorageConfigured()) {
    return NextResponse.json(
      { error: '雲端儲存尚未設定' },
      { status: 503 },
    );
  }

  await clearAllParticipantsFromCloud();
  return NextResponse.json({ ok: true });
}
