import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

interface CommitItem {
  chemical_id: number | null;   // null → create new chemical
  name: string;
  supplier: string | null;
  unit_cost_usd: number;
  quantity_kg: number | null;
  invoice_number: string | null;
  notes: string | null;
  // For new chemicals only
  category?: string;
}

export async function POST(req: NextRequest) {
  const { items }: { items: CommitItem[] } = await req.json();
  if (!items?.length) return NextResponse.json({ error: 'No items to commit' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const results = { updated: 0, created: 0, history: 0 };

    for (const item of items) {
      if (!item.unit_cost_usd || item.unit_cost_usd <= 0) continue;

      let chemId = item.chemical_id;

      // Create new chemical if needed
      if (!chemId) {
        const { rows: [newChem] } = await client.query(
          `INSERT INTO chemicals (name, category, supplier, unit_cost, unit, stock_kg, min_stock, active)
           VALUES ($1, $2, $3, $4, 'kg', 0, 0, TRUE)
           RETURNING id`,
          [item.name, item.category ?? 'Otro', item.supplier ?? null, item.unit_cost_usd],
        );
        chemId = newChem.id;
        results.created++;
      } else {
        // Update current price in catalogue
        await client.query(
          `UPDATE chemicals SET unit_cost = $1, supplier = COALESCE($2, supplier), updated_at = NOW()
           WHERE id = $3`,
          [item.unit_cost_usd, item.supplier ?? null, chemId],
        );
        results.updated++;
      }

      // Always write to price history
      await client.query(
        `INSERT INTO chemical_price_history
           (chemical_id, supplier, unit_cost, currency, source, invoice_ref, notes)
         VALUES ($1, $2, $3, 'USD', 'INVOICE_PDF_CLAUDE', $4, $5)`,
        [chemId, item.supplier ?? null, item.unit_cost_usd, item.invoice_number ?? null, item.notes ?? null],
      );
      results.history++;
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, ...results });
  } catch (e: unknown) {
    await client.query('ROLLBACK');
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
