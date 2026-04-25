import { NextRequest, NextResponse } from 'next/server';
import { MesService } from '@/services/mes.service';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await MesService.sendToProduction(Number(id));
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}
