import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'sofia',
  user: 'postgres', password: 'Abundancia2026',
})

const PRARA_REVIEW_DATE = new Date('2026-05-30')
const RATE_DEFAULT = 0.22

// Fixed monthly costs (baseline estimate per category)
const FIXED_MONTHLY: Record<string, number> = {
  INFRAESTRUCTURA: 5993,   // rent $3600 + BHXH $1659 + security $734
  NOMINA: 13860,           // base salary from employees table (overridden by DB)
  ADMIN: 1037,             // accounting
}
const VAR_PER_SF: Record<string, number> = {
  ENERGIA: 0.020,
  INSUMOS: 0.006,
  LOGISTICA: 0.002,
  ADMIN_VAR: 0.001,
}

export async function GET() {
  const client = await pool.connect()
  try {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // ── Visible month ─────────────────────────────────────────────────────────
    const curSFRes = await client.query(
      `SELECT COALESCE(ROUND(SUM(sqft_processed)),0) AS sf FROM production_records WHERE created_at >= $1`,
      [startOfMonth]
    )
    const currentSF = parseFloat(curSFRes.rows[0]?.sf) || 0

    let startOfVisible = startOfMonth
    let endOfVisible = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    let isFallback = false
    let visibleMonthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    if (currentSF === 0) {
      const fbRes = await client.query(
        `SELECT DATE_TRUNC('month', created_at) AS m FROM production_records
         WHERE created_at < $1 GROUP BY m ORDER BY m DESC LIMIT 1`,
        [startOfMonth]
      )
      if (fbRes.rows.length > 0) {
        startOfVisible = new Date(fbRes.rows[0].m)
        endOfVisible = new Date(startOfVisible.getFullYear(), startOfVisible.getMonth() + 1, 1)
        isFallback = true
        visibleMonthLabel = startOfVisible.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
    }

    // ── All queries in parallel ───────────────────────────────────────────────
    const [invoicesRes, payablesRes, payrollRes, clientBreakRes, trendRes, plHistRes] = await Promise.all([

      client.query(`SELECT invoice_code, total_sf, total_amount, currency, status, po_id, created_at
                    FROM invoices ORDER BY created_at DESC LIMIT 20`),

      client.query(`SELECT id, vendor, concept, amount_usd, due_date, status, category, cost_type, period
                    FROM payables WHERE status NOT IN ('historical')
                    ORDER BY category, amount_usd DESC`),

      client.query(`SELECT COALESCE(SUM(base_salary)/25000.0, 0) AS monthly_payroll
                    FROM employees WHERE base_salary > 0`),

      // Client revenue breakdown for visible month
      client.query(`
        SELECT pr.client_code,
          ROUND(SUM(pr.sqft_processed)) AS sf,
          ROUND(SUM(pr.sqft_processed * COALESCE(cr.rate_per_sqft, $3)), 2) AS revenue,
          ROUND(SUM(pr.sqft_processed * COALESCE(cr.rate_per_sqft, $3)) /
            NULLIF(SUM(SUM(pr.sqft_processed * COALESCE(cr.rate_per_sqft, $3))) OVER (), 0) * 100
          ::numeric, 1) AS pct
        FROM production_records pr
        LEFT JOIN client_rates cr ON cr.client_code = pr.client_code
        WHERE pr.created_at >= $1 AND pr.created_at < $2
        GROUP BY pr.client_code ORDER BY revenue DESC
      `, [startOfVisible, endOfVisible, RATE_DEFAULT]),

      // 6-month production trend
      client.query(`
        SELECT DATE_TRUNC('month', pr.created_at) AS month,
          ROUND(SUM(pr.sqft_processed)) AS sf,
          ROUND(SUM(pr.sqft_processed * COALESCE(cr.rate_per_sqft, $1)), 2) AS revenue
        FROM production_records pr
        LEFT JOIN client_rates cr ON cr.client_code = pr.client_code
        WHERE pr.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY 1 ORDER BY 1 ASC
      `, [RATE_DEFAULT]),

      // Monthly P&L: production + paid costs per month (Feb-Apr 2026)
      client.query(`
        SELECT
          DATE_TRUNC('month', pr.created_at) AS month,
          ROUND(SUM(pr.sqft_processed)) AS sf,
          ROUND(SUM(pr.sqft_processed * COALESCE(cr.rate_per_sqft, $1)), 2) AS revenue
        FROM production_records pr
        LEFT JOIN client_rates cr ON cr.client_code = pr.client_code
        WHERE pr.created_at >= '2026-01-01'
        GROUP BY 1 ORDER BY 1
      `, [RATE_DEFAULT]),
    ])

    // ── Process payables ──────────────────────────────────────────────────────
    const payables = payablesRes.rows.map((p: any) => ({
      id: p.id, vendor: p.vendor, concept: p.concept,
      amount: parseFloat(p.amount_usd) || 0,
      due_date: p.due_date, status: p.status,
      category: p.category || 'ADMIN',
      cost_type: p.cost_type || 'variable',
      period: p.period,
    }))

    const operationalPayables = payables.filter((p: any) =>
      !['DEUDA_HISTORICA'].includes(p.category) && p.status !== 'historical'
    )
    const pendingPayables = payables.filter((p: any) =>
      ['pending', 'overdue'].includes(p.status)
    )

    // ── Cost breakdown by category ────────────────────────────────────────────
    const categoryMap: Record<string, { items: any[]; total: number; cost_type: string }> = {}
    for (const p of operationalPayables) {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { items: [], total: 0, cost_type: p.cost_type }
      }
      categoryMap[p.category].items.push(p)
      categoryMap[p.category].total += p.amount
    }
    const operationalTotal = Object.values(categoryMap).reduce((s, c) => s + c.total, 0)

    const cost_breakdown = Object.entries(categoryMap).map(([cat, data]) => ({
      category: cat,
      cost_type: data.cost_type,
      total: Math.round(data.total * 100) / 100,
      pct_of_total: operationalTotal > 0
        ? Math.round(data.total / operationalTotal * 1000) / 10
        : 0,
      items: data.items,
    })).sort((a, b) => b.total - a.total)

    // ── Margin analysis ───────────────────────────────────────────────────────
    const monthlyPayroll = parseFloat(payrollRes.rows[0]?.monthly_payroll) || 13860
    // True fixed monthly = infra + payroll + admin_fixed
    const fixed_monthly = 5993 + monthlyPayroll + 1037
    const variable_per_sf = 0.020 + 0.006 + 0.002  // energy + insumos + logistica

    const break_even_sf = Math.round(fixed_monthly / (RATE_DEFAULT - variable_per_sf))

    // Margin curve: SF 50K to 300K, at 3 rate scenarios
    const sf_steps = [50000, 80000, 100000, 110000, 125000, 150000, 175000, 200000, 250000, 300000]
    const margin_curve = sf_steps.map(sf => {
      const fixed_per_sf = fixed_monthly / sf
      const total_cost_per_sf = fixed_per_sf + variable_per_sf
      return {
        sf,
        rate_020: Math.round((0.20 - total_cost_per_sf) * 10000) / 10000,
        rate_022: Math.round((0.22 - total_cost_per_sf) * 10000) / 10000,
        rate_025: Math.round((0.25 - total_cost_per_sf) * 10000) / 10000,
        cost_per_sf: Math.round(total_cost_per_sf * 10000) / 10000,
        margin_pct_022: Math.round((0.22 - total_cost_per_sf) / 0.22 * 1000) / 10,
      }
    })

    // ── Summary ───────────────────────────────────────────────────────────────
    const clientBreak = clientBreakRes.rows.map((r: any) => ({
      client: r.client_code,
      sf: parseFloat(r.sf) || 0,
      revenue: parseFloat(r.revenue) || 0,
      pct: parseFloat(r.pct) || 0,
    }))
    const revenueMonth = clientBreak.reduce((s: number, c: any) => s + c.revenue, 0)
    const sfMonth = clientBreak.reduce((s: number, c: any) => s + c.sf, 0)
    const praraRow = clientBreak.find((c: any) => c.client.toUpperCase().includes('PRARA'))
    const prara_pct = praraRow ? praraRow.pct : 0
    const effectiveRate = sfMonth > 0 ? Math.round(revenueMonth / sfMonth * 1000) / 1000 : RATE_DEFAULT

    const totalPending = pendingPayables.reduce((s: number, p: any) => s + p.amount, 0)
    const invoices = invoicesRes.rows.map((i: any) => ({
      code: i.invoice_code, sf: parseFloat(i.total_sf) || 0,
      usd: parseFloat(i.total_amount) || 0,
      currency: i.currency, status: i.status,
      po_id: i.po_id, created_at: i.created_at,
    }))
    const overdueInvoices = invoices.filter((i: any) => i.status === 'OVERDUE')
    const totalOverdue = overdueInvoices.reduce((s: number, i: any) => s + i.usd, 0)

    const daysUntilReview = Math.ceil(
      (PRARA_REVIEW_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Monthly P&L history
    const monthly_pl = plHistRes.rows.map((r: any) => {
      const sf = parseFloat(r.sf) || 0
      const revenue = parseFloat(r.revenue) || 0
      const estimated_costs = fixed_monthly + variable_per_sf * sf
      return {
        month: r.month,
        sf,
        revenue,
        estimated_costs: Math.round(estimated_costs * 100) / 100,
        estimated_net: Math.round((revenue - estimated_costs) * 100) / 100,
      }
    })

    return NextResponse.json({
      summary: {
        revenue_month: revenueMonth,
        sf_month: sfMonth,
        payables_pending: totalPending,
        payroll_month: monthlyPayroll,
        net_month: Math.round((revenueMonth - monthlyPayroll - totalPending) * 100) / 100,
        overdue_count: overdueInvoices.length,
        overdue_total: totalOverdue,
        prara_pct,
        top_client: clientBreak[0]?.client || null,
        visible_month: visibleMonthLabel,
        is_fallback: isFallback,
        effective_rate: effectiveRate,
        prara_review_days: daysUntilReview,
        prara_review_date: PRARA_REVIEW_DATE.toISOString().split('T')[0],
        fixed_monthly,
        variable_per_sf,
        break_even_sf,
      },
      cost_breakdown,
      margin_analysis: {
        break_even_sf,
        fixed_monthly,
        variable_per_sf,
        curve: margin_curve,
      },
      monthly_pl,
      client_breakdown: clientBreak,
      invoices,
      payables: pendingPayables,
      monthly_trend: trendRes.rows.map((r: any) => ({
        month: r.month,
        sf: parseFloat(r.sf) || 0,
        revenue: parseFloat(r.revenue) || 0,
      })),
      simulator_defaults: {
        sf_volume: sfMonth || 150000,
        rate_per_sf: effectiveRate,
        payroll: monthlyPayroll,
        rent: 3600,
        chemicals: 810,
        other_costs: 1037,
      },
    })
  } finally {
    client.release()
  }
}
