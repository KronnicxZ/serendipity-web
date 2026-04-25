import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [formula, layers] = await Promise.all([
    pool.query('SELECT * FROM formulas WHERE id = $1', [id]),
    pool.query(
      `SELECT fl.*, c.name AS chemical_name, c.unit AS chemical_unit
       FROM formula_layers fl
       LEFT JOIN chemicals c ON c.id = fl.chemical_id
       WHERE fl.formula_id = $1
       ORDER BY fl.layer_order`,
      [id],
    ),
  ]);

  if (!formula.rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ ...formula.rows[0], layers: layers.rows });
}
