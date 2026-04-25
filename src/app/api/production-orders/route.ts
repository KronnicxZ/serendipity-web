import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? 'PENDING,IN_PROGRESS';
  const statuses = status.split(',');

  const { rows } = await pool.query(
    `SELECT po.*,
            a.code AS article_code, a.name AS article_name,
            f.name AS formula_name, f.code AS formula_code
     FROM production_orders po
     LEFT JOIN articles a  ON a.id = po.article_id
     LEFT JOIN formulas f  ON f.id = po.formula_id
     WHERE po.status = ANY($1)
     ORDER BY po.created_at DESC`,
    [statuses],
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { order_id, article_id, formula_id, sf_target, owner = 'Serendipity', notes } =
    await req.json();

  if (!sf_target) return NextResponse.json({ error: 'sf_target required' }, { status: 400 });

  const { rows } = await pool.query(
    `INSERT INTO production_orders (po_number, order_id, article_id, formula_id, sf_target, owner, notes)
     VALUES ('', $1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [order_id ?? null, article_id ?? null, formula_id ?? null, sf_target, owner, notes ?? null],
  );
  return NextResponse.json(rows[0], { status: 201 });
}
