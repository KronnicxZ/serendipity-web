import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('owner');
  const { rows } = await pool.query(`
    SELECT li.*, a.code AS article_code, a.name AS article_name
    FROM leather_inventory li
    LEFT JOIN articles a ON a.id = li.article_id
    WHERE ($1::text IS NULL OR li.owner = $1)
    ORDER BY li.received_at DESC
  `, [owner ?? null]);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { article_id, crust_type, supplier, lot_ref, qty_sf, unit_cost_sf, owner = 'Serendipity', location, notes } =
    await req.json();

  if (!crust_type || !qty_sf) {
    return NextResponse.json({ error: 'crust_type and qty_sf required' }, { status: 400 });
  }

  const { rows } = await pool.query(`
    INSERT INTO leather_inventory
      (article_id, crust_type, supplier, lot_ref, qty_sf, unit_cost_sf, owner, location, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [article_id ?? null, crust_type, supplier ?? null, lot_ref ?? null,
      qty_sf, unit_cost_sf ?? null, owner, location ?? 'Kho B+C', notes ?? null]);

  return NextResponse.json(rows[0], { status: 201 });
}
