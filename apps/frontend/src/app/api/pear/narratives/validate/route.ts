import { NextRequest, NextResponse } from 'next/server';
import { validateModifiedSuggestion } from '@/lib/api-server/domain/narrativeService';

export async function POST(request: NextRequest) {
  try {
    const suggestion = await request.json();
    const validation = await validateModifiedSuggestion(suggestion);
    return NextResponse.json({ success: true, data: validation });
  } catch (err: any) {
    console.error('Failed to validate suggestion:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Validation failed' } },
      { status: 500 }
    );
  }
}
