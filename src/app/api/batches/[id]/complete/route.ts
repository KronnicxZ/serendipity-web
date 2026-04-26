import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST /api/batches/[id]/complete
// Closes a batch: marks it COMPLETED, deducts stock, and writes a EXPENSE transaction.
// Body: { actual_kg_used?: { [chemical_id]: kg } }  ← optional overrides from what was actually used
//   If omitted, uses qty_prepared_kg from batch_layers as the consumed amount.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const actualKgUsed: Record<string, number> = body.actual_kg_used ?? {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load batch
    const { rows: [batch] } = await client.query(
      `SELECT b.*, po.sf_target FROM batches b
       LEFT JOIN production_orders po ON po.id = b.po_id
       WHERE b.id = $1`,
      [id],
    );
    if (!batch) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Batch not found' }, { status: 404 }); }
    if (batch.status === 'COMPLETED') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Batch already completed' }, { status: 422 }); }

    // Load batch_layers with chemical prices
    const { rows: layers } = await client.query(
      `SELECT bl.*, c.name AS chemical_name, c.unit_cost, c.stock_kg
       FROM batch_layers bl
       LEFT JOIN chemicals c ON c.id = bl.chemical_id
       WHERE bl.batch_id = $1 AND bl.chemical_id IS NOT NULL`,
      [id],
    );

    // Calculate real cost and update stock
    let totalCost = 0;

    for (const layer of layers) {
      const chemIdStr  = layer.chemical_id.toString();
      const kgConsumed = actualKgUsed[chemIdStr] !== undefined
        ? actualKgUsed[chemIdStr]
        : Number(layer.qty_prepared_kg ?? 0);

      if (kgConsumed <= 0) continue;

      // Use latest price from chemical_price_history if available, else catalogue
      const { rows: [latestPrice] } = await client.query(
        `SELECT unit_cost FROM chemical_price_history
         WHERE chemical_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [layer.chemical_id],
      );
      const unitCost = Number(latestPrice?.unit_cost ?? layer.unit_cost ?? 0);
      const lineCost = kgConsumed * unitCost;
      totalCost += lineCost;

      // Compute waste
      const prepared = Number(layer.qty_prepared_kg ?? 0);
      const waste_kg  = Math.max(0, prepared - kgConsumed);
      const waste_pct = prepared > 0 ? (waste_kg / prepared) * 100 : 0;
      const is_anomaly = waste_pct > 15;

      // Update batch_layer with actual usage
      await client.query(
        `UPDATE batch_layers
         SET qty_used_kg = $1, waste_kg = $2, waste_pct = $3,
             is_anomaly = $4, anomaly_note = $5, executed_at = COALESCE(executed_at, NOW())
         WHERE id = $6`,
        [kgConsumed, waste_kg, waste_pct, is_anomaly,
         is_anomaly ? `Merma ${waste_pct.toFixed(1)}% > 15%` : null,
         layer.id],
      );

      // Deduct from stock
      await client.query(
        `UPDATE chemicals SET stock_kg = GREATEST(0, stock_kg - $1), updated_at = NOW() WHERE id = $2`,
        [kgConsumed, layer.chemical_id],
      );
    }

    // Mark batch COMPLETED
    await client.query(
      `UPDATE batches SET status = 'COMPLETED', closed_at = NOW(), sf_produced = COALESCE(sf_produced, $1)
       WHERE id = $2`,
      [batch.sf_target ?? 0, id],
    );

    // Write EXPENSE transaction (only if there's a real cost)
    if (totalCost > 0) {
      await client.query(
        `INSERT INTO transactions (type, amount, category, description, date, created_by)
         VALUES ('EXPENSE', $1, 'Químicos de Producción', $2, NOW(), 'system')`,
        [totalCost.toFixed(4), `Batch ${batch.batch_number} — ${layers.length} químicos`],
      );

      // Update finances_state total_balance
      await client.query(
        `UPDATE finances_state SET total_balance = total_balance - $1, updated_at = NOW() WHERE id = 1`,
        [totalCost.toFixed(4)],
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({
      ok: true,
      batch_number: batch.batch_number,
      total_cost:   parseFloat(totalCost.toFixed(4)),
      layers_closed: layers.length,
    });

  } catch (e: unknown) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}
