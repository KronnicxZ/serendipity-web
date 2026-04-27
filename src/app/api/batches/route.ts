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
  const {
    po_id, formula_id, sf_produced, owner = 'Serendipity',
    layers, executed_by = 'Thanh', notes,
    // Extra fields for manual batch (new order)
    customer, product, quantity
  } = await req.json();

  if (!sf_produced && !quantity) return NextResponse.json({ error: 'Quantity required' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let final_po_id = po_id;

    // 1. If manual batch (no po_id), create Order and ProductionOrder
    if (!final_po_id && customer && product) {
      // Create entry in "Orders" table (Dashboard)
      const { rows: [newOrder] } = await client.query(
        `INSERT INTO "Orders" (customer, article, qty, unit, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'SF', 'IN_PROCESS', NOW(), NOW())
         RETURNING id`,
        [customer, product, sf_produced || quantity]
      );

      // Create entry in production_orders
      const { rows: [newPO] } = await client.query(
        `INSERT INTO production_orders (po_number, order_id, formula_id, sf_target, owner, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', NOW())
         RETURNING id`,
        [`BATCH-${Date.now()}`, newOrder.id, formula_id ?? null, sf_produced || quantity, owner]
      );
      final_po_id = newPO.id;

      // Log status history
      await client.query(
        `INSERT INTO "OrderStatusHistory" (order_id, status, changed_at, changed_by)
         VALUES ($1, 'IN_PROCESS', NOW(), $2)`,
        [newOrder.id, executed_by]
      );
    }

    // 2. Insert the Batch
    const { rows: [batch] } = await client.query(
      `INSERT INTO batches (batch_number, po_id, formula_id, sf_produced, owner, executed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [`B-${Date.now()}`, final_po_id ?? null, formula_id ?? null, sf_produced || quantity, owner, executed_by, notes ?? null],
    );

    // 3. Insert Layers
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

    // 4. Update existing PO/Order status if linked
    if (po_id) {
      await client.query(
        `UPDATE production_orders SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW())
         WHERE id = $1`,
        [po_id],
      );
      
      // Find linked Order to update its status in Dashboard
      const { rows: [linkedPO] } = await client.query(`SELECT order_id FROM production_orders WHERE id = $1`, [po_id]);
      if (linkedPO?.order_id) {
        await client.query(`UPDATE "Orders" SET status = 'IN_PROCESS', updated_at = NOW() WHERE id = $1`, [linkedPO.order_id]);
        await client.query(
          `INSERT INTO "OrderStatusHistory" (order_id, status, changed_at, changed_by)
           VALUES ($1, 'IN_PROCESS', NOW(), $2)
           ON CONFLICT DO NOTHING`,
          [linkedPO.order_id, executed_by]
        );
      }
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
