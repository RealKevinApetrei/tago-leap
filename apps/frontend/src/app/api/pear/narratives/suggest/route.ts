import { NextRequest, NextResponse } from 'next/server';
import { suggestNarrative } from '@/lib/api-server/domain/narrativeService';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Prompt is required' } },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Prompt must be less than 1000 characters' } },
        { status: 400 }
      );
    }

    const suggestion = await suggestNarrative(prompt);
    return NextResponse.json({ success: true, data: suggestion });
  } catch (err: any) {
    console.error('Failed to generate narrative suggestion:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: `Failed to generate suggestion: ${err?.message || 'Unknown error'}` } },
      { status: 500 }
    );
  }
}
