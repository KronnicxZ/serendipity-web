import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows: [po] } = await pool.query(`
    SELECT po.*,
           a.code AS article_code, a.name AS article_name, a.crust_type,
           f.name AS formula_name, f.code AS formula_code
    FROM production_orders po
    LEFT JOIN articles a ON a.id = po.article_id
    LEFT JOIN formulas  f ON f.id = po.formula_id
    WHERE po.id = $1
  `, [id]);

  if (!po) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { rows: batches } = await pool.query(`
    SELECT b.*, COUNT(bl.id)::int AS layer_count
    FROM batches b
    LEFT JOIN batch_layers bl ON bl.batch_id = b.id
    WHERE b.po_id = $1
    GROUP BY b.id
    ORDER BY b.started_at DESC
  `, [id]);

  const { rows: purchase_requests } = await pool.query(`
    SELECT * FROM purchase_requests WHERE po_id = $1 ORDER BY requested_at DESC
  `, [id]);

  return NextResponse.json({ ...po, batches, purchase_requests });
}
