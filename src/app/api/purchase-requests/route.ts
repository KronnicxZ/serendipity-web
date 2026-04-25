import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? 'PENDING,APPROVED';
  const statuses = status.split(',');

  const { rows } = await pool.query(`
    SELECT pr.*, po.po_number
    FROM purchase_requests pr
    LEFT JOIN production_orders po ON po.id = pr.po_id
    WHERE pr.status = ANY($1)
    ORDER BY
      CASE pr.urgency WHEN 'URGENT' THEN 0 ELSE 1 END,
      pr.requested_at DESC
  `, [statuses]);

  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const { id, status, approved_by, supplier, estimated_cost } = await req.json();

  const { rows } = await pool.query(`
    UPDATE purchase_requests
    SET status = $1,
        approved_by = COALESCE($2, approved_by),
        supplier = COALESCE($3, supplier),
        estimated_cost = COALESCE($4, estimated_cost),
        approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END,
        received_at = CASE WHEN $1 = 'RECEIVED' THEN NOW() ELSE received_at END
    WHERE id = $5
    RETURNING *
  `, [status, approved_by ?? null, supplier ?? null, estimated_cost ?? null, id]);

  return NextResponse.json(rows[0]);
}
