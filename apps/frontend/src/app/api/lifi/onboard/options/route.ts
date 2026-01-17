import { NextResponse } from 'next/server';
import { getSupportedOptions } from '@/lib/api-server/clients/lifiClient';

export async function GET() {
  try {
    const options = await getSupportedOptions();
    return NextResponse.json({ success: true, data: options });
  } catch (err: any) {
    console.error('Failed to get onboard options:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || 'Failed to get options' } },
      { status: 500 }
    );
  }
}
