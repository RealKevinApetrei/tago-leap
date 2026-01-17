import { NextRequest, NextResponse } from 'next/server';
import { getPositions } from '@/lib/api-server/clients/pearClient';
import { getValidAccessToken } from '@/lib/api-server/domain/authRepo';
import { getSupabaseAdmin } from '@/lib/api-server/supabase';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing wallet query parameter' } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const accessToken = await getValidAccessToken(supabase, wallet);

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    const positions = await getPositions(accessToken);
    return NextResponse.json({ success: true, data: positions });
  } catch (err: any) {
    console.error('Failed to fetch positions:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: `Failed to fetch positions: ${err?.message}` } },
      { status: 500 }
    );
  }
}
