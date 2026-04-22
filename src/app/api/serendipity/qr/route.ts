// QR scan handler — local PostgreSQL
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// POST — register scan event
// Body: { order_id, lot_id?, action, station, scanned_by?, notes? }
// action: 'CREATE_BATCH' | 'MOVE_TO_STATION' | 'DELIVERED' | 'INSPECT'
export async function POST(req: NextRequest) {
  try {
    const { order_id, lot_id, action, station, scanned_by, notes } = await req.json();
    if (!order_id || !action || !station)
      return NextResponse.json({ error: 'Missing: order_id, action, station' }, { status: 400 });

    const { rows } = await pool.query(
      `INSERT INTO "QrScans" (order_id, lot_id, action, station, scanned_by, notes, scanned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [order_id, lot_id ?? null, action, station, scanned_by ?? null, notes ?? null]
    );

    const statusMap: Record<string, string> = {
      CREATE_BATCH: 'IN_PROCESS',
      MOVE_TO_STATION: 'IN_TRANSIT',
      DELIVERED: 'DELIVERED',
    };
    if (statusMap[action]) {
      await pool.query(
        `INSERT INTO "OrderStatusHistory" (order_id, status, changed_at, changed_by)
         VALUES ($1, $2, NOW(), $3)`,
        [order_id, statusMap[action], scanned_by ?? 'system']
      );
    }

    return NextResponse.json({ scan: rows[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — scan history for an order  ?order_id=xxx
export async function GET(req: NextRequest) {
  try {
    const order_id = new URL(req.url).searchParams.get('order_id');
    if (!order_id)
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT * FROM "QrScans" WHERE order_id = $1 ORDER BY scanned_at DESC`,
      [order_id]
    );
    return NextResponse.json({ scans: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
