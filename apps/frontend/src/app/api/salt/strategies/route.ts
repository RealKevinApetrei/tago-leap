import { NextResponse } from 'next/server';
import { getAllStrategies } from '@/lib/api-server/domain/strategyTypes';

export async function GET() {
  const strategies = getAllStrategies();
  return NextResponse.json({ success: true, data: strategies });
}
