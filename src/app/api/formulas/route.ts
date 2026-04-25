import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT f.*,
           a.code  AS article_code,
           a.name  AS article_name,
           COUNT(fl.id)::int AS layer_count
    FROM formulas f
    LEFT JOIN articles a  ON a.id = f.article_id
    LEFT JOIN formula_layers fl ON fl.formula_id = f.id
    WHERE f.status != 'ARCHIVED'
    GROUP BY f.id, a.code, a.name
    ORDER BY f.updated_at DESC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, description, article_id, layers } = await req.json();

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const code = 'F-' + Date.now().toString(36).toUpperCase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [formula] } = await client.query(
      `INSERT INTO formulas (code, name, description, article_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [code, name, description ?? null, article_id ?? null],
    );

    if (layers?.length) {
      for (const layer of layers) {
        await client.query(
          `INSERT INTO formula_layers
             (formula_id, layer_order, layer_type, name,
              chemical_id, qty_per_sf, pct_in_mix,
              machine, temperature_c, passes, speed, plate_ref, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            formula.id, layer.layer_order, layer.layer_type, layer.name,
            layer.chemical_id ?? null, layer.qty_per_sf ?? null, layer.pct_in_mix ?? null,
            layer.machine ?? null, layer.temperature_c ?? null, layer.passes ?? null,
            layer.speed ?? null, layer.plate_ref ?? null, layer.notes ?? null,
          ],
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json(formula, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
