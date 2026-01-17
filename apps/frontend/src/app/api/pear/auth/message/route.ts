import { NextRequest, NextResponse } from 'next/server';
import { getEIP712Message } from '@/lib/api-server/clients/pearAuthClient';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing wallet query parameter' } },
      { status: 400 }
    );
  }

  try {
    const message = await getEIP712Message(wallet);
    return NextResponse.json({ success: true, data: message });
  } catch (err) {
    console.error('Failed to get EIP-712 message:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get authentication message' } },
      { status: 500 }
    );
  }
}
