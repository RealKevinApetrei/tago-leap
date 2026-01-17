import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountById, getStrategyRunsByAccountId } from '@/lib/api-server/domain/saltRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
  const supabase = getSupabaseAdmin();

  try {
    const account = await getSaltAccountById(supabase, id);
    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Salt account not found' } },
        { status: 404 }
      );
    }

    const runs = await getStrategyRunsByAccountId(supabase, id, limit);
    return NextResponse.json({ success: true, data: runs });
  } catch (err: any) {
    console.error('Failed to get strategy runs:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get strategy runs' } },
      { status: 500 }
    );
  }
}
