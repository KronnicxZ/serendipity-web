import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('owner'); // 'Serendipity' | 'PRARA'
  const query = owner
    ? 'SELECT * FROM chemicals WHERE active = TRUE AND owner = $1 ORDER BY category, name'
    : 'SELECT * FROM chemicals WHERE active = TRUE ORDER BY category, name';
  const { rows } = await pool.query(query, owner ? [owner] : []);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, category, unit = 'kg', unit_cost, supplier, min_stock = 0, owner = 'Serendipity', notes } =
    await req.json();

  if (!name || !category) {
    return NextResponse.json({ error: 'name and category required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO chemicals (name, category, unit, unit_cost, supplier, min_stock, owner, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [name, category, unit, unit_cost ?? null, supplier ?? null, min_stock, owner, notes ?? null],
  );
  return NextResponse.json(rows[0], { status: 201 });
}
