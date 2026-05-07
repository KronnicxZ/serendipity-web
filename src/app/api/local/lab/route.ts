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

function scopeFilter(username: string | null) {
  const scopes: Record<string, { tables: string[], own_only: boolean }> = {
    'Thanh': { tables: ['lab_requests','production_records','recipe_formulas','chemicals'], own_only: true },
    'Tuyen': { tables: ['lab_requests','chemicals','payables'], own_only: false },
    'Thuy':  { tables: ['lab_requests','order_citizens','po_tracking'], own_only: false },
    'Vu':    { tables: ['lab_requests','chemicals','production_records'], own_only: false },
  }
  return scopes[username || ''] || { tables: [], own_only: false }
}

function reworkEmailHtml(p: {
  requestId: number, batchCode: string, clientName: string,
  sqft: number, costUsd: number, notes: string, reportedBy: string
}): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:#1a1a2e;padding:28px 40px;">
      <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:1px;">SERENDIPITY GROUP</div>
      <div style="font-size:11px;color:#8b7355;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Binh Duong · Vietnam · LWG Gold Certified</div>
    </td>
  </tr>
  <tr>
    <td style="background:#fef9f0;padding:18px 40px 16px;border-bottom:1px solid #e8e0d0;">
      <div style="font-size:11px;color:#e67e22;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">⚠ Rework Authorization Required</div>
      <div style="font-size:21px;color:#1a1a2e;font-weight:600;">Batch ${p.batchCode} — Rework Approval Request</div>
      <div style="font-size:13px;color:#8b7355;margin-top:6px;">Ref: SER-RWK-${p.requestId} · Reported ${today}</div>
    </td>
  </tr>
  <tr><td style="padding:32px 40px 24px;">
    <p style="font-size:17px;color:#1a1a2e;margin:0 0 20px;">Dear Ravi,</p>
    <p style="font-size:15px;color:#2d2d2d;line-height:1.75;margin:0 0 24px;">
      As per our Rework Authorization Protocol (SER-OPS-RWK-001, effective 5 May 2026), we are requesting your written approval before proceeding with additional processing on the following batch.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;border-radius:8px;margin:0 0 28px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:11px;color:#8b7355;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">Rework Details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:14px;color:#5a5a7a;padding:5px 0;width:42%;">Batch Code</td>
            <td style="font-size:14px;color:#1a1a2e;font-weight:700;padding:5px 0;">${p.batchCode}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#5a5a7a;padding:5px 0;">Client</td>
            <td style="font-size:14px;color:#1a1a2e;font-weight:600;padding:5px 0;">${p.clientName}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#5a5a7a;padding:5px 0;">SF Affected</td>
            <td style="font-size:14px;color:#1a1a2e;font-weight:600;padding:5px 0;">${p.sqft.toLocaleString()} SF</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#5a5a7a;padding:5px 0;">Estimated Rework Cost</td>
            <td style="font-size:14px;color:#c0392b;font-weight:700;padding:5px 0;">USD ${p.costUsd.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#5a5a7a;padding:5px 0;">Reported By</td>
            <td style="font-size:14px;color:#1a1a2e;font-weight:600;padding:5px 0;">${p.reportedBy} — Serendipity QC</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#5a5a7a;padding:5px 0;vertical-align:top;">Description</td>
            <td style="font-size:14px;color:#1a1a2e;padding:5px 0;line-height:1.6;">${p.notes}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f39c12;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <div style="font-size:14px;color:#1a1a2e;font-weight:600;margin-bottom:6px;">Action Required — 24 h Window</div>
        <div style="font-size:14px;color:#2d2d2d;line-height:1.6;">Please reply to this email with <strong>"Approved — please proceed"</strong> to authorize the rework, or contact us directly if you need further information. No rework will commence until your written authorization is received.</div>
      </td></tr>
    </table>
    <p style="font-size:15px;color:#2d2d2d;line-height:1.75;margin:0 0 8px;">Thank you, Ravi. We will hold the batch until we hear from you.</p>
    <p style="font-size:15px;color:#2d2d2d;margin:0 0 32px;">Warm regards,</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e0d0;padding-top:20px;">
      <tr>
        <td>
          <div style="font-size:16px;font-weight:600;color:#1a1a2e;">Sofia</div>
          <div style="font-size:13px;color:#5a5a7a;margin-top:2px;">Quality Control System · Serendipity Group Co., Ltd.</div>
          <div style="font-size:13px;color:#5a5a7a;margin-top:2px;">on behalf of Santiago Campanera, Director</div>
          <div style="font-size:13px;color:#8b7355;margin-top:6px;">sofia@serendipity.vn &nbsp;·&nbsp; santi@serendipity.vn</div>
        </td>
        <td align="right" valign="bottom">
          <img src="https://qr.zalo.me/3600609734459917494" width="60" height="60"
               alt="Zalo" style="border-radius:8px;display:block;margin-bottom:4px;"
               onerror="this.style.display='none'">
          <div style="font-size:10px;color:#8b7355;text-transform:uppercase;letter-spacing:1px;">Zalo Direct</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr>
    <td style="background:#1a1a2e;padding:14px 40px;text-align:center;">
      <div style="font-size:11px;color:#5a5a7a;letter-spacing:2px;">SERENDIPITY GROUP CO., LTD. · BINH DUONG, VIETNAM · LWG GOLD CERTIFIED</div>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('user') || 'Thanh'
  const client = await pool.connect()
  try {
    const [activePOs, chemicals, formulas, requests, scores] = await Promise.all([
      client.query(`
        SELECT
          pr.batch_code, pr.client_code,
          COALESCE(cc.name, pr.client_code) AS client_name,
          ROUND(pr.sqft_processed::numeric, 1) AS sqft,
          pr.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS fecha,
          lr.id AS request_id, lr.status AS request_status, lr.points_earned
        FROM production_records pr
        LEFT JOIN customer_codes cc ON cc.code = pr.client_code
        LEFT JOIN lab_requests lr ON lr.batch_code = pr.batch_code
        WHERE pr.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY pr.created_at DESC
        LIMIT 20
      `),
      client.query(`
        SELECT id, name, category, unit_cost, stock_kg, unit,
               0 AS minimum_stock_kg
        FROM chemicals
        WHERE is_active = true
        ORDER BY category, name
      `),
      client.query(`
        SELECT
          rf.id, rf.name, rf.article, rf.total_cost_reference,
          COALESCE(
            json_agg(json_build_object(
              'chemical_id', rl.chemical_id,
              'chemical_name', c.name,
              'grams', rl.grams,
              'unit_cost', c.unit_cost,
              'category', c.category
            ) ORDER BY c.category, c.name) FILTER (WHERE rl.id IS NOT NULL),
            '[]'
          ) AS chemicals
        FROM recipe_formulas rf
        LEFT JOIN recipe_lines rl ON rl.process_id = rf.id
        LEFT JOIN chemicals c ON c.id = rl.chemical_id
        WHERE rf.status = 'APPROVED'
        GROUP BY rf.id, rf.name, rf.article, rf.total_cost_reference
        ORDER BY rf.name
      `),
      client.query(`
        SELECT
          lr.*,
          lrd.light_formula, lrd.light_chemicals, lrd.light_material,
          lrd.chemicals_ready_at, lrd.material_ready_at, lrd.all_ready_at,
          lrd.rework_required, lrd.rework_customer_approval, lrd.rework_cost_usd
        FROM lab_requests lr
        LEFT JOIN lab_readiness lrd ON lrd.request_id = lr.id
        ORDER BY lr.created_at DESC
        LIMIT 15
      `),
      client.query(`
        SELECT username, role, total_points, total_requests, level_name
        FROM user_lab_scores
        ORDER BY total_points DESC
      `),
    ])

    return NextResponse.json({
      active_pos: activePOs.rows,
      chemicals: chemicals.rows,
      formulas: formulas.rows,
      requests: requests.rows,
      scores: scores.rows,
      user_scope: scopeFilter(username),
    })
  } finally {
    client.release()
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  const client = await pool.connect()

  // ── Submit new lab request ─────────────────────────────────────────────────
  if (action === 'submit_request') {
    const { batch_code, client_code, formula_id, formula_snapshot, chemicals, sqft, requested_by } = body
    if (!batch_code || !requested_by || !Array.isArray(chemicals)) {
      return NextResponse.json({ error: 'batch_code, requested_by, chemicals required' }, { status: 400 })
    }
    try {
      await client.query('BEGIN')
      let totalCost = 0
      for (const c of chemicals) {
        totalCost += (parseFloat(c.qty_kg) || 0) * (parseFloat(c.unit_cost) || 0)
      }
      const sqftN = parseFloat(sqft) || 0
      const costPerSf = sqftN > 0 ? totalCost / sqftN : 0
      const pts = 20 + chemicals.length * 5 + (formula_id ? 15 : 0)

      const res = await client.query(`
        INSERT INTO lab_requests
          (po_ref, batch_code, client_code, formula_id, formula_snapshot, chemicals_json,
           total_chem_cost, sqft_target, estimated_cost_per_sf, status, requested_by, points_earned)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SUBMITTED',$10,$11)
        RETURNING id
      `, [batch_code, batch_code, client_code, formula_id || null,
          formula_snapshot ? JSON.stringify(formula_snapshot) : null,
          JSON.stringify(chemicals), totalCost, sqftN, costPerSf, requested_by, pts])

      const requestId = res.rows[0].id

      await client.query(`
        INSERT INTO lab_readiness (request_id, light_formula, chemicals_owner, material_owner)
        VALUES ($1, $2, 'Tuyen', 'Thuy')
      `, [requestId, !!formula_id])

      await client.query(`
        UPDATE user_lab_scores
        SET total_points = total_points + $1,
            total_requests = total_requests + 1,
            last_active = NOW(),
            level_name = CASE
              WHEN total_points + $1 >= 500 THEN 'Maestro Alquimista'
              WHEN total_points + $1 >= 200 THEN 'Químico Senior'
              WHEN total_points + $1 >= 80  THEN 'Técnico de Lab'
              ELSE 'Aprendiz'
            END
        WHERE username = $2
      `, [pts, requested_by])

      await client.query('COMMIT')
      return NextResponse.json({ ok: true, request_id: requestId, points_earned: pts, total_cost: totalCost })
    } catch (err: any) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: err.message }, { status: 500 })
    } finally {
      client.release()
    }
  }

  // ── Mark a readiness light ─────────────────────────────────────────────────
  if (action === 'mark_ready') {
    const { request_id, light, marked_by } = body
    if (!request_id || !light) return NextResponse.json({ error: 'request_id and light required' }, { status: 400 })
    try {
      const col = light === 'chemicals' ? 'light_chemicals' : light === 'material' ? 'light_material' : 'light_formula'
      const ts  = light === 'chemicals' ? 'chemicals_ready_at' : light === 'material' ? 'material_ready_at' : 'formula_ready_at'

      await client.query(`
        UPDATE lab_readiness SET ${col} = TRUE, ${ts} = NOW() WHERE request_id = $1
      `, [request_id])

      const check = await client.query(
        'SELECT light_formula, light_chemicals, light_material FROM lab_readiness WHERE request_id = $1',
        [request_id]
      )
      const r = check.rows[0]
      if (r?.light_formula && r?.light_chemicals && r?.light_material) {
        await client.query(`UPDATE lab_readiness SET all_ready_at = NOW() WHERE request_id = $1`, [request_id])
        await client.query(`UPDATE lab_requests SET status = 'ALL_READY', updated_at = NOW() WHERE id = $1`, [request_id])
      }

      if (marked_by) {
        await client.query(`
          UPDATE user_lab_scores SET total_points = total_points + 10, last_active = NOW() WHERE username = $1
        `, [marked_by])
      }

      return NextResponse.json({ ok: true, all_ready: r?.light_formula && r?.light_chemicals && r?.light_material })
    } finally {
      client.release()
    }
  }

  // ── Flag rework + auto-notify PRARA ───────────────────────────────────────
  if (action === 'flag_rework') {
    const { request_id, cost_usd, notes, flagged_by } = body
    if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 })
    try {
      // 1. Update DB
      await client.query(`
        UPDATE lab_readiness
        SET rework_required = TRUE, rework_customer_approval = 'PENDING', rework_cost_usd = $1
        WHERE request_id = $2
      `, [cost_usd || 0, request_id])
      await client.query(`
        UPDATE lab_requests SET status = 'REWORK_PENDING', notes = $1, updated_at = NOW() WHERE id = $2
      `, [notes || 'Rework required', request_id])

      // 2. Fetch batch details for the email
      const detail = await client.query(`
        SELECT lr.batch_code, lr.client_code, lr.sqft_target,
               COALESCE(cc.name, lr.client_code) AS client_name
        FROM lab_requests lr
        LEFT JOIN customer_codes cc ON cc.code = lr.client_code
        WHERE lr.id = $1
      `, [request_id])
      const row = detail.rows[0] || {}

      // 3. Send auto-email to PRARA
      const emailParams = {
        requestId: request_id as number,
        batchCode: (row.batch_code as string) || `REQ-${request_id}`,
        clientName: (row.client_name as string) || row.client_code || 'N/A',
        sqft: parseFloat(row.sqft_target) || 0,
        costUsd: parseFloat(cost_usd) || 0,
        notes: (notes as string) || 'Rework required — details to be confirmed.',
        reportedBy: (flagged_by as string) || 'QC Team',
      }

      await mailer.sendMail({
        from: '"Sofia — Serendipity Group" <sofia@serendipity.vn>',
        to: 'ravi@praraleathers.in',
        cc: [
          'logistics@serendipity.vn',
          'cs1@serendipity.vn',
          'thuy@serendipity.vn',
          'santi@serendipity.vn',
          'campanerasanti@gmail.com',
        ].join(', '),
        subject: `[Rework Auth Required] Batch ${emailParams.batchCode} — Est. USD ${emailParams.costUsd.toFixed(2)}`,
        html: reworkEmailHtml(emailParams),
        text: `Rework Authorization Request — Ref SER-RWK-${request_id}\n\nBatch: ${emailParams.batchCode}\nClient: ${emailParams.clientName}\nSF Affected: ${emailParams.sqft}\nEstimated Cost: USD ${emailParams.costUsd.toFixed(2)}\nDescription: ${emailParams.notes}\nReported by: ${emailParams.reportedBy}\n\nPlease reply "Approved — please proceed" to authorize. No rework will commence without your written authorization.\n\nSofia — Serendipity Group`,
      })

      return NextResponse.json({
        ok: true,
        email_sent: true,
        notify_ref: `SER-RWK-${request_id}`,
      })
    } finally {
      client.release()
    }
  }

  // ── Approve rework (after Ravi confirms) ──────────────────────────────────
  if (action === 'approve_rework') {
    const { request_id, approved_by } = body
    if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 })
    try {
      await client.query(`
        UPDATE lab_readiness
        SET rework_customer_approval = 'APPROVED', rework_approved_at = NOW()
        WHERE request_id = $1
      `, [request_id])
      await client.query(`
        UPDATE lab_requests SET status = 'REWORK_APPROVED', updated_at = NOW() WHERE id = $1
      `, [request_id])
      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
