// PO / Order management — local PostgreSQL
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET — list orders  ?customer=OPUS&status=NEW
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer = searchParams.get('customer');
    const status   = searchParams.get('status');

    const conditions: string[] = [];
    const params: any[] = [];
    if (customer) { conditions.push(`customer = $${params.length + 1}`); params.push(customer); }
    if (status)   { conditions.push(`status = $${params.length + 1}`); params.push(status); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT * FROM "Orders" ${where} ORDER BY created_at DESC`, params
    );
    return NextResponse.json({ orders: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create new PO
export async function POST(req: NextRequest) {
  try {
    const {
      customer, article, color, type = 'bulk',
      qty, unit = 'SF', eta, po_client, po_internal,
      delivery, swatch, notes,
      crust_supplier, crust_cost, crust_status
    } = await req.json();

    if (!customer || !article || !qty)
      return NextResponse.json({ error: 'Missing: customer, article, qty' }, { status: 400 });

    const { rows } = await pool.query(
      `INSERT INTO "Orders"
       (customer, article, color, type, qty, unit, eta, po_client, po_internal,
        delivery, swatch, notes, crust_supplier, crust_cost, crust_status,
        status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'NEW',NOW(),NOW())
       RETURNING *`,
      [customer, article, color ?? null, type, qty, unit, eta ?? null,
       po_client ?? null, po_internal ?? null, delivery ?? null,
       swatch ?? null, notes ?? null,
       crust_supplier ?? null, crust_cost ?? null, crust_status ?? null]
    );
    return NextResponse.json({ order: rows[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update order
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const fields = Object.keys(updates);
    if (!fields.length) return NextResponse.json({ error: 'No fields provided' }, { status: 400 });

    const set  = fields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
    const vals = [id, ...fields.map(f => (updates as any)[f])];

    const { rows } = await pool.query(
      `UPDATE "Orders" SET ${set}, updated_at = NOW() WHERE id = $1 RETURNING *`, vals
    );
    return NextResponse.json({ order: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
