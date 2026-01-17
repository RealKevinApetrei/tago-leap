import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountById, upsertSaltPolicy } from '@/lib/api-server/domain/saltRepo';
import { validatePolicy } from '@/lib/api-server/domain/policyTypes';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { policy } = await request.json();

    if (!policy) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing policy' } },
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

    // Validate policy
    const errors = validatePolicy(policy);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: errors.join(', ') } },
        { status: 400 }
      );
    }

    // Upsert policy
    const savedPolicy = await upsertSaltPolicy(supabase, id, {
      maxLeverage: policy.maxLeverage,
      maxDailyNotionalUsd: policy.maxDailyNotionalUsd,
      allowedPairs: policy.allowedPairs,
      maxDrawdownPct: policy.maxDrawdownPct,
    });

    return NextResponse.json({ success: true, data: savedPolicy });
  } catch (err: any) {
    console.error('Failed to update policy:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to update policy' } },
      { status: 500 }
    );
  }
}
