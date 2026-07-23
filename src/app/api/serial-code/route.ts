import { NextResponse } from 'next/server';
import {
  allocateNextSerialCode,
  isCloudStorageConfigured,
} from '@/lib/participantStore';

export const dynamic = 'force-dynamic';

/** 發放下一個短流水號（001、002、003…）供後測問卷對帳 */
export async function POST() {
  if (!isCloudStorageConfigured()) {
    return NextResponse.json(
      { error: '雲端儲存尚未設定', configured: false },
      { status: 503 },
    );
  }

  try {
    const code = await allocateNextSerialCode();
    return NextResponse.json({ ok: true, configured: true, code });
  } catch (error) {
    const message = error instanceof Error ? error.message : '發號失敗';
    console.error('POST /api/serial-code failed:', message);
    return NextResponse.json({ error: message, configured: true }, { status: 500 });
  }
}
