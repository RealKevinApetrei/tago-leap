import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountById, getLatestPolicy, getStrategiesByAccountId } from '@/lib/api-server/domain/saltRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const account = await getSaltAccountById(supabase, id);
    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Salt account not found' } },
        { status: 404 }
      );
    }

    const policy = await getLatestPolicy(supabase, id);
    const strategies = await getStrategiesByAccountId(supabase, id);

    return NextResponse.json({
      success: true,
      data: { account, policy, strategies },
    });
  } catch (err: any) {
    console.error('Failed to get salt account:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get salt account' } },
      { status: 500 }
    );
  }
}
