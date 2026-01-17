import { NextRequest, NextResponse } from 'next/server';
import { getSaltAccountById, createSaltStrategy } from '@/lib/api-server/domain/saltRepo';
import { getStrategyById } from '@/lib/api-server/domain/strategyTypes';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { strategyId, params: strategyParams, active } = await request.json();

    if (!strategyId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing strategyId' } },
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

    // Verify strategy exists
    const strategyDef = getStrategyById(strategyId);
    if (!strategyDef) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: `Unknown strategy: ${strategyId}` } },
        { status: 400 }
      );
    }

    // Merge provided params with defaults
    const mergedParams = {
      ...strategyDef.defaultParams,
      ...strategyParams,
    };

    // Create strategy
    const strategy = await createSaltStrategy(supabase, id, {
      strategyId,
      params: mergedParams,
      active: active ?? false,
    });

    return NextResponse.json({ success: true, data: strategy });
  } catch (err: any) {
    console.error('Failed to create strategy:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to create strategy' } },
      { status: 500 }
    );
  }
}
