import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { GoogleSheetsService } from '@/services/google-sheets.service';

export async function POST() {
  // Get all batches not yet synced
  const { rows: batches } = await pool.query(`
    SELECT b.id, b.batch_number, b.sf_produced, b.owner, b.executed_by,
           b.started_at, b.status,
           po.po_number,
           f.name AS formula_name
    FROM batches b
    LEFT JOIN production_orders po ON po.id = b.po_id
    LEFT JOIN formulas f           ON f.id  = b.formula_id
    WHERE b.sheet_synced = FALSE AND b.status IN ('CLOSED', 'OPEN')
    ORDER BY b.started_at
  `);

  if (!batches.length) return NextResponse.json({ synced: 0 });

  const exportRows = [];

  for (const batch of batches) {
    const { rows: layers } = await pool.query(`
      SELECT bl.*, c.name AS chemical_name
      FROM batch_layers bl
      LEFT JOIN chemicals c ON c.id = bl.chemical_id
      WHERE bl.batch_id = $1 AND bl.layer_type = 'CHEMICAL'
      ORDER BY bl.layer_order
    `, [batch.id]);

    for (const layer of layers) {
      exportRows.push({
        batch_number:  batch.batch_number,
        po_number:     batch.po_number    ?? '—',
        formula_name:  batch.formula_name ?? '—',
        sf_produced:   batch.sf_produced,
        owner:         batch.owner,
        executed_by:   batch.executed_by,
        chemical_name: layer.chemical_name ?? '—',
        qty_prepared:  Number(layer.qty_prepared_kg ?? 0),
        qty_used:      Number(layer.qty_used_kg ?? 0),
        waste_kg:      Number(layer.waste_kg ?? 0),
        waste_pct:     Number(layer.waste_pct ?? 0),
        is_anomaly:    layer.is_anomaly,
        date:          new Date(batch.started_at).toISOString().split('T')[0],
      });
    }
  }

  if (exportRows.length) {
    await GoogleSheetsService.exportBatchToSheet(exportRows);
  }

  // Mark as synced
  const ids = batches.map(b => b.id);
  await pool.query(`UPDATE batches SET sheet_synced = TRUE WHERE id = ANY($1)`, [ids]);

  return NextResponse.json({ synced: batches.length, rows_exported: exportRows.length });
}
