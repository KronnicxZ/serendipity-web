import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/services/google-sheets.service';
import { pool } from '@/lib/db';

/**
 * GET /api/serendipity/sheets/sync
 * Pulls rows from the Orders Live Tracker Google Sheet and upserts them
 * into the local PostgreSQL "Orders" table using po_client as the unique key.
 */
export async function GET(_req: NextRequest) {
  // 1. Guard: credentials must be present
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return NextResponse.json({
      success: false,
      message: 'Google Sheets API not configured. Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to .env.local',
    }, { status: 503 });
  }

  try {
    // 2. Fetch rows from Google Sheet
    const orders = await GoogleSheetsService.getOrdersFromSheet();

    if (orders.length === 0) {
      return NextResponse.json({ success: true, message: 'Sheet is empty — nothing to sync', synced: 0 });
    }

    // 3. UPSERT into "Orders" — conflict on po_client
    let synced = 0;
    const errors: string[] = [];

    for (const o of orders) {
      if (!o.po_client || !o.customer || !o.article) {
        errors.push(`Skipped row — missing required fields: ${JSON.stringify(o)}`);
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO "Orders"
             (po_client, customer, article, color, type, qty, unit,
              status, eta, notes, crust_supplier, crust_cost,
              created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW(), NOW())
           ON CONFLICT (po_client) DO UPDATE SET
             customer       = EXCLUDED.customer,
             article        = EXCLUDED.article,
             color          = EXCLUDED.color,
             type           = EXCLUDED.type,
             qty            = EXCLUDED.qty,
             unit           = EXCLUDED.unit,
             status         = EXCLUDED.status,
             eta            = EXCLUDED.eta,
             notes          = EXCLUDED.notes,
             crust_supplier = EXCLUDED.crust_supplier,
             crust_cost     = EXCLUDED.crust_cost,
             updated_at     = NOW()`,
          [
            o.po_client, o.customer, o.article, o.color,
            o.type, o.qty, o.unit, o.status,
            o.eta, o.notes, o.crust_supplier, o.crust_cost,
          ]
        );
        synced++;
      } catch (rowErr: any) {
        errors.push(`po_client=${o.po_client}: ${rowErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${synced}/${orders.length} rows upserted`,
      synced,
      skipped: errors.length,
      errors: errors.length ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Sheets sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
