import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return new NextResponse('Use /admin page to export data', {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
