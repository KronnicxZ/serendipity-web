import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT b.*,
           po.po_number, po.sf_target,
           f.name AS formula_name
    FROM batches b
    LEFT JOIN production_orders po ON po.id = b.po_id
    LEFT JOIN formulas f           ON f.id  = b.formula_id
    ORDER BY b.started_at DESC
    LIMIT 50
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { po_id, formula_id, sf_produced, owner = 'Serendipity', layers, executed_by = 'Thanh', notes } =
    await req.json();

  if (!sf_produced) return NextResponse.json({ error: 'sf_produced required' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [batch] } = await client.query(
      `INSERT INTO batches (batch_number, po_id, formula_id, sf_produced, owner, executed_by, notes)
       VALUES ('', $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [po_id ?? null, formula_id ?? null, sf_produced, owner, executed_by, notes ?? null],
    );

    if (layers?.length) {
      for (const layer of layers) {
        const waste_pct =
          layer.qty_prepared_kg && layer.qty_used_kg
            ? ((layer.qty_prepared_kg - layer.qty_used_kg) / layer.qty_prepared_kg) * 100
            : null;
        const is_anomaly = waste_pct !== null && waste_pct > 15;

        await client.query(
          `INSERT INTO batch_layers
             (batch_id, layer_id, layer_order, layer_type, chemical_id,
              qty_prepared_kg, qty_used_kg, is_anomaly, anomaly_note, executed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
          [
            batch.id, layer.layer_id ?? null, layer.layer_order, layer.layer_type,
            layer.chemical_id ?? null, layer.qty_prepared_kg ?? null, layer.qty_used_kg ?? null,
            is_anomaly, is_anomaly ? `Waste ${waste_pct?.toFixed(1)}% > 15%` : null,
          ],
        );
      }
    }

    // Mark PO as IN_PROGRESS
    if (po_id) {
      await client.query(
        `UPDATE production_orders SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW())
         WHERE id = $1 AND status = 'PENDING'`,
        [po_id],
      );
    }

    await client.query('COMMIT');
    return NextResponse.json(batch, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
