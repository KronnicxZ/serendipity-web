import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import nodemailer from 'nodemailer'

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'sofia',
  user: 'postgres', password: 'Abundancia2026',
})

const mailer = nodemailer.createTransport({
  host: 'pro206.emailserver.vn', port: 465, secure: true,
  auth: { user: 'sofia@serendipity.vn', pass: 'uU99-twnvJ' },
})

const TEAM = {
  lab:       { name: 'Thuy',     email: 'cs1@serendipity.vn',        role: 'Customer Service / Lab Coordinator' },
  logistics: { name: 'Vu',       email: 'logistics@serendipity.vn',   role: 'Logistics & Stock Manager' },
  chemicals: { name: 'Tuyen',    email: 'info@serendipity.vn',        role: 'Chemical & Admin Manager' },
  finance:   { name: 'Tuyen',    email: 'info@serendipity.vn',        role: 'Finance & Admin' },
  director:  { name: 'Santiago', email: 'campanerasanti@gmail.com',   role: 'Director' },
}

function emailHtml(subject: string, bodyLines: string[], action: string, assignee: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0C0E12;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#111318;border-radius:12px;border:1px solid #1e293b;overflow:hidden;">
  <tr><td style="background:#0C0E12;padding:24px 32px;border-bottom:1px solid #1e293b;">
    <span style="color:#00C8D4;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Serendipity OS</span>
    <span style="color:#334155;font-size:13px;margin-left:12px;">· Sistema Anthropos</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:18px;">${subject}</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:13px;">Hi ${assignee} — action required from the Serendipity Operations System.</p>
    <div style="background:#0C0E12;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:24px;">
      ${bodyLines.map(l => `<p style="margin:0 0 10px;color:#cbd5e1;font-size:14px;line-height:1.6;">${l}</p>`).join('')}
    </div>
    <div style="background:#00C8D4;border-radius:6px;padding:12px 20px;display:inline-block;">
      <span style="color:#0C0E12;font-weight:700;font-size:14px;">Action Required: ${action}</span>
    </div>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #1e293b;text-align:center;">
    <p style="color:#475569;font-size:12px;margin:0 0 12px;">Reply directly on Zalo for faster response:</p>
    <a href="https://zalo.me/3600609734459917494" style="color:#00C8D4;font-size:13px;text-decoration:none;">
      📱 https://zalo.me/3600609734459917494
    </a>
    <p style="color:#334155;font-size:11px;margin:12px 0 0;">Serendipity Group Co., Ltd · Binh Duong, Vietnam · sofia@serendipity.vn</p>
  </td></tr>
</table></td></tr></table>
</body></html>`
}

// ─── Helpers ──────────────────────────────────────────────────────────
function getWeekDate(): string {
  const d = new Date()
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

// ─── Blocker detection ────────────────────────────────────────────────
async function detectBlockers(client: any) {
  const blockers: any[] = []

  // 1. Orders missing formula
  const { rows: noFormula } = await client.query(`
    SELECT qr_id, customer, quantity_sf, created_at
    FROM production_orders
    WHERE status = 'pending' AND recipe_formula_id IS NULL
    ORDER BY created_at
  `)
  if (noFormula.length > 0) {
    blockers.push({
      id: 'missing_formula',
      type: 'lab',
      severity: 'critical',
      title: 'Orders missing recipe formula',
      description: `${noFormula.length} pending order(s) cannot move to production without an assigned formula.`,
      orders: noFormula.map((o: any) => ({ qr_id: o.qr_id, customer: o.customer, sf: parseFloat(o.quantity_sf) })),
      total_sf: noFormula.reduce((s: number, o: any) => s + parseFloat(o.quantity_sf), 0),
      assignee: TEAM.lab,
      action: 'Assign a recipe formula to each order in the Lab module before releasing to production.',
      notified: false,
    })
  }

  // 2. Overdue invoices
  const { rows: overdue } = await client.query(`
    SELECT invoice_code, total_sf, total_amount, currency, created_at
    FROM invoices WHERE status = 'OVERDUE'
  `)
  if (overdue.length > 0) {
    blockers.push({
      id: 'invoice_overdue',
      type: 'finance',
      severity: 'critical',
      title: 'Overdue invoice — payment required',
      description: `${overdue.length} invoice(s) overdue. Total: USD ${overdue.reduce((s: number, i: any) => s + parseFloat(i.total_amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
      invoices: overdue.map((i: any) => ({ code: i.invoice_code, sf: parseFloat(i.total_sf), usd: parseFloat(i.total_amount) })),
      total_usd: overdue.reduce((s: number, i: any) => s + parseFloat(i.total_amount), 0),
      assignee: TEAM.finance,
      action: 'Follow up with PRARA on payment of outstanding invoice(s).',
      notified: false,
    })
  }

  // 3. Low chemical stock (< 5 kg — no min_stock_kg column, using threshold)
  const { rows: lowChems } = await client.query(`
    SELECT name, stock_kg, category, supplier
    FROM chemicals
    WHERE is_active = true AND stock_kg > 0 AND stock_kg < 5
    ORDER BY stock_kg ASC LIMIT 10
  `)
  if (lowChems.length > 0) {
    blockers.push({
      id: 'low_chemicals',
      type: 'chemicals',
      severity: 'warning',
      title: 'Chemical stock below minimum',
      description: `${lowChems.length} chemical(s) running low (< 5 kg). May block production if not replenished.`,
      chemicals: lowChems.map((c: any) => ({ name: c.name, stock_kg: parseFloat(c.stock_kg), supplier: c.supplier })),
      assignee: TEAM.chemicals,
      action: 'Place purchase order for low-stock chemicals listed above.',
      notified: false,
    })
  }

  return blockers
}

// ─── GET: full circuit state ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const client = await pool.connect()
  try {
    const [ordersRes, circuitRes, financeRes, inventoryRes, formulasRes, blockers] = await Promise.all([
      client.query(`
        SELECT po.id, po.qr_id, po.customer, po.quantity_sf, po.status,
               po.recipe_formula_id, rf.name as formula_name,
               po.invoice_generated, po.packing_list_generated,
               po.created_at
        FROM production_orders po
        LEFT JOIN recipe_formulas rf ON rf.id = po.recipe_formula_id
        ORDER BY po.created_at DESC
      `),
      client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='pending' AND recipe_formula_id IS NULL)  AS stage_blocked,
          COUNT(*) FILTER (WHERE status='pending' AND recipe_formula_id IS NOT NULL) AS stage_lab_ready,
          COUNT(*) FILTER (WHERE status='in_progress')                             AS stage_production,
          COUNT(*) FILTER (WHERE status='qc')                                      AS stage_inspection,
          COUNT(*) FILTER (WHERE status='completed' AND packing_list_generated AND NOT invoice_generated) AS stage_packed,
          COUNT(*) FILTER (WHERE status='completed' AND invoice_generated)          AS stage_invoiced,
          ROUND(SUM(quantity_sf) FILTER (WHERE status='pending'), 0)               AS sf_pending,
          ROUND(SUM(quantity_sf) FILTER (WHERE status='completed'), 0)             AS sf_completed
        FROM production_orders
      `),
      Promise.all([
        client.query(`
          SELECT ROUND(SUM(sqft_processed),0) as sf, ROUND(SUM(sqft_processed * 0.22),2) as revenue
          FROM production_records
          WHERE created_at >= date_trunc('month', NOW())
        `),
        client.query(`SELECT ROUND(SUM(amount_usd),2) as payables FROM payables WHERE status='pending'`),
        client.query(`SELECT invoice_code, total_sf, total_amount, status FROM invoices ORDER BY created_at DESC LIMIT 5`),
      ]),
      Promise.all([
        client.query(`SELECT ROUND(SUM(balance_sqft),0) as crust_sf, COUNT(*) as lots FROM donto_stock WHERE balance_sqft > 0`),
        client.query(`SELECT COUNT(*) as total, ROUND(SUM(stock_kg * unit_cost),2) as value FROM chemicals WHERE is_active=true AND owner='SERENDIPITY'`),
      ]),
      client.query(`SELECT id, name, status FROM recipe_formulas WHERE status='APPROVED' ORDER BY name`),
      detectBlockers(client),
    ])

    const [productionRow, payablesRow, invoicesRes] = financeRes
    const [crustRow, chemRow] = inventoryRes
    const circuit = circuitRes.rows[0]

    // Energy state — graceful if table missing
    let energyState = null
    try {
      const energyRes = await client.query(
        `SELECT clarity, energy, focus, notes, week_date::text FROM director_energy_log
         WHERE week_date = $1 ORDER BY created_at DESC LIMIT 1`,
        [getWeekDate()]
      )
      energyState = energyRes.rows[0] || null
    } catch (_) { /* table not yet created */ }

    return NextResponse.json({
      energy_state: energyState,
      circuit: {
        blocked:    parseInt(circuit.stage_blocked) || 0,
        lab_ready:  parseInt(circuit.stage_lab_ready) || 0,
        production: parseInt(circuit.stage_production) || 0,
        inspection: parseInt(circuit.stage_inspection) || 0,
        packed:     parseInt(circuit.stage_packed) || 0,
        invoiced:   parseInt(circuit.stage_invoiced) || 0,
        sf_pending: parseFloat(circuit.sf_pending) || 0,
        sf_completed: parseFloat(circuit.sf_completed) || 0,
      },
      orders: ordersRes.rows.map((o: any) => ({
        id: o.id, qr_id: o.qr_id, customer: o.customer,
        sf: parseFloat(o.quantity_sf), status: o.status,
        formula_id: o.recipe_formula_id, formula_name: o.formula_name,
        invoiced: o.invoice_generated, packed: o.packing_list_generated,
        created_at: o.created_at,
        blocker: !o.recipe_formula_id && o.status === 'pending' ? 'missing_formula' : null,
      })),
      finance: {
        sf_month:  parseFloat(productionRow.rows[0]?.sf) || 0,
        revenue_month: parseFloat(productionRow.rows[0]?.revenue) || 0,
        payables: parseFloat(payablesRow.rows[0]?.payables) || 0,
        invoices: invoicesRes.rows.map((i: any) => ({
          code: i.invoice_code, sf: parseFloat(i.total_sf),
          usd: parseFloat(i.total_amount), status: i.status,
        })),
      },
      inventory: {
        crust_sf: parseFloat(crustRow.rows[0]?.crust_sf) || 0,
        crust_lots: parseInt(crustRow.rows[0]?.lots) || 0,
        chem_value: parseFloat(chemRow.rows[0]?.value) || 0,
        chem_count: parseInt(chemRow.rows[0]?.total) || 0,
      },
      formulas: formulasRes.rows,
      blockers,
    })
  } finally {
    client.release()
  }
}

// ─── POST: send blocker notification emails ───────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, blocker_ids } = body

  if (action === 'log_energy') {
    const { clarity, energy, focus, notes = '' } = body
    if (!clarity || !energy || !focus) {
      return NextResponse.json({ error: 'clarity, energy, focus required' }, { status: 400 })
    }
    const weekDate = getWeekDate()
    const low = [clarity, energy, focus].filter((v: number) => v < 6).length
    await pool.query(
      `INSERT INTO director_energy_log (week_date, clarity, energy, focus, notes, sofia_reduces_load) VALUES ($1,$2,$3,$4,$5,$6)`,
      [weekDate, clarity, energy, focus, notes, low >= 2]
    )
    return NextResponse.json({ ok: true, week_date: weekDate })
  }

  if (action !== 'notify_blockers') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const client = await pool.connect()
  let blockers: any[]
  try {
    blockers = await detectBlockers(client)
  } finally {
    client.release()
  }

  const toSend = blocker_ids
    ? blockers.filter(b => blocker_ids.includes(b.id))
    : blockers

  const sent: any[] = []
  const errors: any[] = []

  for (const blocker of toSend) {
    try {
      let bodyLines: string[] = []
      let subject = ''

      if (blocker.id === 'missing_formula') {
        subject = `[ACTION REQUIRED] ${blocker.orders.length} production order(s) blocked — formula not assigned`
        bodyLines = [
          `<strong>${blocker.orders.length} production order(s)</strong> are currently blocked and cannot proceed to the production floor because no recipe formula has been assigned.`,
          `<strong>Total SF affected: ${blocker.total_sf.toLocaleString()} SF</strong>`,
          '<strong>Affected orders:</strong>',
          ...blocker.orders.map((o: any) =>
            `&nbsp;&nbsp;• <code style="color:#00C8D4;">${o.qr_id}</code> — ${o.customer} — ${o.sf.toLocaleString()} SF`
          ),
          `Please log in to the Serendipity OS Lab module and assign one of the <strong>6 approved formulas</strong> to each order listed above.`,
        ]
      } else if (blocker.id === 'invoice_overdue') {
        subject = `[URGENT] Overdue invoice — USD ${blocker.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} pending`
        bodyLines = [
          `The following Serendipity invoice(s) are currently <strong>OVERDUE</strong> and require immediate follow-up:`,
          ...blocker.invoices.map((i: any) =>
            `&nbsp;&nbsp;• <code style="color:#E63946;">${i.code}</code> — ${i.sf.toLocaleString()} SF — <strong>USD ${i.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>`
          ),
          `Please confirm payment status and provide an ETA for settlement. Serendipity operations depend on timely receivables.`,
        ]
      } else if (blocker.id === 'low_chemicals') {
        subject = `[STOCK ALERT] ${blocker.chemicals.length} chemical(s) running low — reorder required`
        bodyLines = [
          `The following chemicals in the Serendipity lab are below minimum stock level and require immediate replenishment:`,
          ...blocker.chemicals.map((c: any) =>
            `&nbsp;&nbsp;• <strong>${c.name}</strong> — ${c.stock_kg.toFixed(2)} kg remaining (Supplier: ${c.supplier || 'N/A'})`
          ),
          `Please place purchase orders with the respective suppliers and update the system with expected delivery dates.`,
        ]
      }

      await mailer.sendMail({
        from: '"Sofia — Serendipity OS" <sofia@serendipity.vn>',
        to: blocker.assignee.email,
        cc: TEAM.director.email,
        subject,
        html: emailHtml(subject, bodyLines, blocker.action, blocker.assignee.name),
      })

      // Log to communication_logs
      const logClient = await pool.connect()
      try {
        await logClient.query(`
          INSERT INTO communication_logs (channel, direction, sender, recipient, subject, body, metadata)
          VALUES ('email', 'outbound', 'sofia@serendipity.vn', $1, $2, $3, $4)
        `, [
          blocker.assignee.email, subject,
          `Blocker notification: ${blocker.id}`,
          JSON.stringify({ blocker_id: blocker.id, sent_at: new Date().toISOString() }),
        ])
      } catch (_) {
        // communication_logs may not exist, non-fatal
      } finally {
        logClient.release()
      }

      sent.push({ blocker_id: blocker.id, to: blocker.assignee.email, subject })
    } catch (err: any) {
      errors.push({ blocker_id: blocker.id, error: err.message })
    }
  }

  return NextResponse.json({ sent, errors, total: sent.length })
}
