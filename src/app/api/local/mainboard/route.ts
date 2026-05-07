import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
    host: 'localhost', port: 5432,
    database: 'sofia', user: 'postgres', password: 'Abundancia2026',
})

const BACKEND = process.env.SOFIA_BACKEND_URL || 'http://localhost:5001'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : defaultFrom
    const to   = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : defaultTo

    try {
        const [
            prodRows, orderRows, crustRow, chemRow, formulaRes, payablesRow
        ] = await Promise.all([
            // SF procesados + revenue por cliente en rango
            pool.query(`
                SELECT pr.client_code,
                       ROUND(SUM(pr.sqft_processed)) AS sf,
                       ROUND(SUM(pr.sqft_processed * COALESCE(cr.rate_per_sqft, 0.22)), 2) AS usd,
                       ROUND(AVG(pr.defect_pct), 2) AS defect_avg,
                       COUNT(*) AS batches
                FROM production_records pr
                LEFT JOIN client_rates cr ON cr.client_code = pr.client_code
                WHERE pr.created_at BETWEEN $1 AND $2
                GROUP BY pr.client_code
                ORDER BY sf DESC
            `, [from, to]),

            // Órdenes de producción (pipeline interno)
            pool.query(`
                SELECT status, COUNT(*) AS cnt, COALESCE(ROUND(SUM(quantity_sf)), 0) AS sf
                FROM production_orders
                GROUP BY status
            `),

            // Inventario crust disponible (Donto)
            pool.query(`
                SELECT ROUND(SUM(balance_sqft)) AS total_sf, COUNT(*) AS lots
                FROM donto_stock WHERE balance_sqft > 0
            `),

            // Valor inventario químicos propios
            pool.query(`
                SELECT ROUND(SUM(unit_cost * stock_kg), 2) AS chem_value,
                       COUNT(*) FILTER (WHERE stock_kg < 5 AND stock_kg > 0) AS low_stock
                FROM chemicals WHERE owner = 'SERENDIPITY' AND is_active = true
            `),

            // Fórmulas del backend (con liveCost)
            fetch(`${BACKEND}/api/recipe/formulas`).then(r => r.ok ? r.json() : []).catch(() => []),

            // Payables activos
            pool.query(`
                SELECT COALESCE(SUM(amount_usd), 0) AS total_payable
                FROM payables WHERE status = 'pending'
            `).catch(() => ({ rows: [{ total_payable: 0 }] })),
        ])

        // — Clientes
        const totalSf  = prodRows.rows.reduce((s: number, r: any) => s + Number(r.sf), 0)
        const totalRev = prodRows.rows.reduce((s: number, r: any) => s + Number(r.usd), 0)
        const clients = prodRows.rows.map((r: any) => ({
            name: r.client_code,
            sf:  Number(r.sf),
            usd: Number(r.usd),
            pct: totalSf > 0 ? Math.round((Number(r.sf) / totalSf) * 1000) / 10 : 0,
        }))

        // — Producción
        const defectAvg = prodRows.rows[0]?.defect_avg ? Number(prodRows.rows[0].defect_avg) : null
        const daysPassed = Math.max(1, Math.round((Math.min(now.getTime(), to.getTime()) - from.getTime()) / 86400000))

        // — Pipeline (production_orders)
        const orderByStatus: Record<string, { cnt: number, sf: number }> = {}
        orderRows.rows.forEach((r: any) => {
            orderByStatus[r.status] = { cnt: Number(r.cnt), sf: Number(r.sf) }
        })

        // — Crust inventory
        const crustSf   = Number(crustRow.rows[0]?.total_sf || 0)
        const crustLots = Number(crustRow.rows[0]?.lots || 0)

        // — Químicos
        const chemValue     = Number(chemRow.rows[0]?.chem_value || 0)
        const lowStockCount = Number(chemRow.rows[0]?.low_stock || 0)

        // — Fórmulas
        const approvedFormulas = Array.isArray(formulaRes) ? formulaRes.filter((f: any) => f.status === 'APPROVED') : []
        const draftFormulas    = Array.isArray(formulaRes) ? formulaRes.filter((f: any) => f.status === 'DRAFT')    : []
        const avgLiveCost      = approvedFormulas.length > 0
            ? approvedFormulas.reduce((s: number, f: any) => s + (f.liveCost || 0), 0) / approvedFormulas.length
            : 0

        // — Finanzas
        const praraDebt       = 31000
        const fixedCostMonthly = 13860
        const breakEvenSf      = Math.ceil(fixedCostMonthly / 0.22)
        const netMargin        = totalRev - (totalSf * 0.06)

        return NextResponse.json({
            dateRange: { from: from.toISOString(), to: to.toISOString() },
            pipeline: {
                crustSf,
                crustLots,
                formulaSf:      orderByStatus['pending']?.sf   || 0,
                formulaOrders:  orderByStatus['pending']?.cnt  || 0,
                prodSf:         orderByStatus['IN_PROCESS']?.sf   || 0,
                prodOrders:     orderByStatus['IN_PROCESS']?.cnt  || 0,
                finishedSf:     orderByStatus['completed']?.sf   || 0,
                finishedOrders: orderByStatus['completed']?.cnt  || 0,
                deliveredSf:      totalSf,
                deliveredRevenue: totalRev,
            },
            clients,
            production: {
                sfThisMonth: totalSf,
                target:      500000,
                progressPct: Math.round((totalSf / 500000) * 1000) / 10,
                sfPerDay:    daysPassed > 0 ? Math.round(totalSf / daysPassed) : 0,
                defectPct:   defectAvg,
                batches:     prodRows.rows.reduce((s: number, r: any) => s + Number(r.batches), 0),
            },
            formulas: {
                active:        approvedFormulas.length,
                draft:         draftFormulas.length,
                avgLiveCostKg: Math.round(avgLiveCost * 100) / 100,
            },
            finance: {
                revenueTotal:       Math.round(totalRev * 100) / 100,
                netMargin:          Math.round(netMargin * 100) / 100,
                praraDebtRemaining: praraDebt,
                breakEvenSf,
                payablesTotal:      Number(payablesRow.rows[0]?.total_payable || 0),
            },
            inventory: {
                crustSf,
                crustLots,
                chemValueUsd: chemValue,
                lowStockCount,
            },
        })
    } catch (err: any) {
        console.error('[mainboard]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
