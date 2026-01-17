import { NextResponse } from 'next/server';
import { getAllNarratives } from '@/lib/api-server/domain/narratives';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getAllNarratives(),
  });
}
