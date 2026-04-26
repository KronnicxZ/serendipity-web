import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST /api/production-orders/[id]/batch
// Creates a batch + batch_layers in the legacy tables from a recipe_formula scale result.
// Body: { recipe_formula_id, sf_target, waste_pct, executed_by, notes, processes: [...] }
//   processes[].lines[]: { chemical_id, kg_needed }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: poId } = await params;
  const {
    recipe_formula_id,
    sf_target,
    waste_pct = 0,
    executed_by = 'Thanh',
    notes,
    processes = [],
  }: {
    recipe_formula_id: number;
    sf_target: number;
    waste_pct?: number;
    executed_by?: string;
    notes?: string;
    processes: Array<{
      process_order: number;
      name: string;
      type: string;
      lines: Array<{ chemical_id: number; kg_needed: number }>;
    }>;
  } = await req.json();

  if (!sf_target || sf_target <= 0)
    return NextResponse.json({ error: 'sf_target required' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify PO exists and is not already completed
    const { rows: [po] } = await client.query(
      `SELECT id, status, recipe_formula_id FROM production_orders WHERE id = $1`, [poId],
    );
    if (!po) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'PO not found' }, { status: 404 }); }
    if (po.status === 'COMPLETED')
      { await client.query('ROLLBACK'); return NextResponse.json({ error: 'PO already completed' }, { status: 422 }); }

    // Link PO to recipe formula if not already set
    if (recipe_formula_id && !po.recipe_formula_id) {
      await client.query(
        `UPDATE production_orders SET recipe_formula_id = $1 WHERE id = $2`,
        [recipe_formula_id, poId],
      );
    }

    // Generate batch number: LAB-YYYYMMDD-NNNN
    const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { rows: [{ count }] } = await client.query(
      `SELECT COUNT(*)::int FROM batches WHERE batch_number LIKE $1`, [`LAB-${dateStr}-%`],
    );
    const batchNumber = `LAB-${dateStr}-${String((count as number) + 1).padStart(4, '0')}`;

    // Create batch record
    const { rows: [batch] } = await client.query(
      `INSERT INTO batches
         (batch_number, po_id, formula_id, sf_produced, owner, status, executed_by, notes)
       VALUES ($1, $2, NULL, $3, 'Serendipity', 'OPEN', $4, $5)
       RETURNING *`,
      [batchNumber, poId, sf_target, executed_by, notes ?? null],
    );

    // Insert batch_layers — one row per chemical line across all processes
    let layerOrder = 1;
    for (const proc of processes) {
      if (proc.type === 'MECHANICAL') continue;
      for (const line of proc.lines) {
        if (!line.chemical_id || !line.kg_needed) continue;
        await client.query(
          `INSERT INTO batch_layers
             (batch_id, layer_order, layer_type, chemical_id, qty_prepared_kg)
           VALUES ($1, $2, 'CHEMICAL', $3, $4)`,
          [batch.id, layerOrder++, line.chemical_id, line.kg_needed],
        );
      }
    }

    // Move PO to IN_PROGRESS
    await client.query(
      `UPDATE production_orders
       SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW())
       WHERE id = $1 AND status = 'PENDING'`,
      [poId],
    );

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, batch_number: batchNumber, batch_id: batch.id, layers: layerOrder - 1 }, { status: 201 });
  } catch (e: unknown) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}
