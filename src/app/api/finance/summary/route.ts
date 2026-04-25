import { NextResponse } from 'next/server';
import { FinanceService } from '@/services/finance.service';

export async function GET() {
  const summary = await FinanceService.getSummary();
  return NextResponse.json(summary);
}
