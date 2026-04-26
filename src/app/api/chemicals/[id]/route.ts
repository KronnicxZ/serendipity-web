import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, category, unit, unit_cost, supplier, min_stock, stock_kg, notes, active } = await req.json();

  const { rows } = await pool.query(
    `UPDATE chemicals
     SET name=$1, category=$2, unit=$3, unit_cost=$4, supplier=$5,
         min_stock=$6, stock_kg=$7, notes=$8, active=$9
     WHERE id=$10 RETURNING *`,
    [name, category, unit ?? 'kg', unit_cost ?? null, supplier ?? null,
     min_stock ?? 0, stock_kg ?? 0, notes ?? null, active ?? true, id],
  );
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pool.query('UPDATE chemicals SET active = FALSE WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
