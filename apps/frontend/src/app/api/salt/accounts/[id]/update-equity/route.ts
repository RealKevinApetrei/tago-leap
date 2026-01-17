import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountById, updateSaltAccountEquity } from '@/lib/api-server/domain/saltRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { equity } = await request.json();

    if (typeof equity !== 'number' || equity < 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid equity value' } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify account exists
    const account = await getSaltAccountById(supabase, id);
    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Salt account not found' } },
        { status: 404 }
      );
    }

    // Update equity and calculate drawdown
    const result = await updateSaltAccountEquity(supabase, id, equity);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Failed to update equity:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to update equity' } },
      { status: 500 }
    );
  }
}
