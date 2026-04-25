import { NextRequest, NextResponse } from 'next/server';
import { MesService } from '@/services/mes.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sf_packed, packed_by = 'Warehouse' } = await req.json();

  if (!sf_packed) return NextResponse.json({ error: 'sf_packed required' }, { status: 400 });

  await MesService.completePacking(Number(id), sf_packed, packed_by);
  return NextResponse.json({ ok: true });
}
