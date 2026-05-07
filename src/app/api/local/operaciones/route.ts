import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'sofia',
  user: 'postgres', password: 'Abundancia2026',
})

export async function GET() {
  const client = await pool.connect()
  try {
    const [ordersRes, formulasRes, todayRes, weekRes] = await Promise.all([
      client.query(`
        SELECT po.id, po.qr_id, po.customer, po.quantity_sf, po.status,
               po.recipe_formula_id, rf.name as formula_name,
               po.product_type, po.color, po.finish,
               po.invoice_generated, po.packing_list_generated,
               po.created_at, po.completed_at
        FROM production_orders po
        LEFT JOIN recipe_formulas rf ON rf.id = po.recipe_formula_id
        ORDER BY po.created_at DESC
      `),
      client.query(`
        SELECT id, name, article, color_ref, description, status
        FROM recipe_formulas WHERE status = 'APPROVED' ORDER BY name
      `),
      client.query(`
        SELECT
          ROUND(COALESCE(SUM(sqft_processed), 0), 0) as sf_today,
          COUNT(*) as batches_today,
          COUNT(DISTINCT operator_name) as operators_today
        FROM production_records
        WHERE DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
      `),
      client.query(`
        SELECT
          ROUND(COALESCE(SUM(sqft_processed), 0), 0) as sf_week,
          COUNT(*) as batches_week
        FROM production_records
        WHERE created_at >= date_trunc('week', NOW())
      `),
    ])

    const orders = ordersRes.rows.map((o: any) => ({
      id: o.id,
      qr_id: o.qr_id,
      customer: o.customer,
      sf: parseFloat(o.quantity_sf) || 0,
      status: o.status,
      formula_id: o.recipe_formula_id,
      formula_name: o.formula_name,
      product_type: o.product_type,
      color: o.color,
      finish: o.finish,
      invoiced: o.invoice_generated,
      packed: o.packing_list_generated,
      created_at: o.created_at,
      completed_at: o.completed_at,
      blocker: !o.recipe_formula_id && o.status === 'pending' ? 'missing_formula' : null,
    }))

    const blocked = orders.filter(o => o.blocker === 'missing_formula')

    return NextResponse.json({
      orders,
      formulas: formulasRes.rows,
      lab: {
        blocked_count: blocked.length,
        blocked_sf: blocked.reduce((s, o) => s + o.sf, 0),
        blocked_orders: blocked,
      },
      stats: {
        sf_today: parseFloat(todayRes.rows[0]?.sf_today) || 0,
        batches_today: parseInt(todayRes.rows[0]?.batches_today) || 0,
        operators_today: parseInt(todayRes.rows[0]?.operators_today) || 0,
        sf_week: parseFloat(weekRes.rows[0]?.sf_week) || 0,
        batches_week: parseInt(weekRes.rows[0]?.batches_week) || 0,
      },
      pipeline: {
        blocked:    orders.filter(o => o.status === 'pending' && !o.formula_id).length,
        lab_ready:  orders.filter(o => o.status === 'pending' && o.formula_id).length,
        production: orders.filter(o => o.status === 'in_progress').length,
        qc:         orders.filter(o => o.status === 'qc').length,
        completed:  orders.filter(o => o.status === 'completed').length,
      },
    })
  } finally {
    client.release()
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, order_id, formula_id } = body

  if (action !== 'assign_formula') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  if (!order_id || !formula_id) {
    return NextResponse.json({ error: 'order_id and formula_id required' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    const result = await client.query(`
      UPDATE production_orders
      SET recipe_formula_id = $1, status = CASE WHEN status = 'pending' THEN 'pending' ELSE status END
      WHERE id = $2
      RETURNING id, qr_id, customer, recipe_formula_id
    `, [formula_id, order_id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: result.rows[0] })
  } finally {
    client.release()
  }
}
