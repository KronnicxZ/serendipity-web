import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'sofia',
  user: 'postgres', password: 'Abundancia2026',
})

export async function GET() {
  const client = await pool.connect()
  try {
    const [batchesRes, chemRes, formulasRes, statsRes, recentGenomeRes] = await Promise.all([
      // Batches de los últimos 14 días con su estado en genome
      client.query(`
        SELECT
          pr.batch_code,
          pr.client_code,
          ROUND(pr.sqft_processed::numeric, 1) AS sqft,
          pr.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS fecha,
          pg.id AS genome_id,
          pg.formula_json,
          ROUND(pg.chem_cost_usd::numeric, 4) AS chem_cost,
          ROUND(pg.labor_cost_usd::numeric, 4) AS labor_cost,
          ROUND(pg.total_cost_usd::numeric, 4) AS total_cost,
          ROUND(pg.cost_per_sqft::numeric, 4) AS cost_per_sqft,
          ROUND(pg.yield_pct::numeric, 1) AS yield_pct,
          (SELECT COUNT(*) FROM batch_chemical_usage bcu WHERE bcu.batch_code = pr.batch_code) AS chem_logs
        FROM production_records pr
        LEFT JOIN production_genome pg ON pg.lot_id = pr.batch_code
        WHERE pr.created_at >= NOW() - INTERVAL '14 days'
        ORDER BY pr.created_at DESC
        LIMIT 30
      `),
      // Químicos activos con unit_cost para el formulario
      client.query(`
        SELECT id, name, category, unit_cost, stock_kg, unit
        FROM chemicals
        WHERE is_active = true
        ORDER BY category, name
      `),
      // Fórmulas con sus líneas de químicos
      client.query(`
        SELECT
          rf.id,
          rf.name,
          rf.article,
          rf.total_cost_reference,
          COALESCE(
            json_agg(
              json_build_object(
                'chemical_id', rl.chemical_id,
                'chemical_name', c.name,
                'grams', rl.grams,
                'unit_cost', c.unit_cost
              ) ORDER BY c.name
            ) FILTER (WHERE rl.id IS NOT NULL),
            '[]'
          ) AS chemicals
        FROM recipe_formulas rf
        LEFT JOIN recipe_lines rl ON rl.process_id = rf.id
        LEFT JOIN chemicals c ON c.id = rl.chemical_id
        WHERE rf.status = 'APPROVED'
        GROUP BY rf.id, rf.name, rf.article, rf.total_cost_reference
        ORDER BY rf.name
      `),
      // Estadísticas globales del genome
      client.query(`
        SELECT
          COUNT(*) AS total_entries,
          ROUND(AVG(cost_per_sqft)::numeric, 4) AS avg_cost_per_sf,
          ROUND(AVG(yield_pct)::numeric, 1) AS avg_yield,
          ROUND(SUM(total_cost_usd)::numeric, 2) AS total_cost_all
        FROM production_genome
        WHERE started_at >= '2026-02-01'
      `),
      // Últimas 10 entradas del genome con detalle
      client.query(`
        SELECT
          pg.lot_id,
          pg.citizen_id,
          ROUND(pg.sqft_output::numeric, 0) AS sf_out,
          ROUND(pg.yield_pct::numeric, 1) AS yield_pct,
          ROUND(pg.cost_per_sqft::numeric, 4) AS cost_per_sqft,
          ROUND(pg.chem_cost_usd::numeric, 4) AS chem_cost,
          pg.formula_json->>'name' AS formula,
          pg.notes,
          pg.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS fecha
        FROM production_genome pg
        WHERE pg.started_at >= '2026-02-01'
        ORDER BY pg.started_at DESC
        LIMIT 10
      `)
    ])

    return NextResponse.json({
      batches: batchesRes.rows,
      chemicals: chemRes.rows,
      formulas: formulasRes.rows,
      stats: statsRes.rows[0] || {},
      recent_genome: recentGenomeRes.rows,
    })
  } finally {
    client.release()
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'log_chemicals') {
    const { batch_code, formula_id, chemicals } = body
    // chemicals: [{ chemical_id, qty_kg }]
    if (!batch_code || !Array.isArray(chemicals) || chemicals.length === 0) {
      return NextResponse.json({ error: 'batch_code and chemicals required' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Obtener el formula si se especificó
      let formulaCost = 0.0455
      let formulaJson = null
      if (formula_id) {
        const fRes = await client.query(
          'SELECT id, name, total_cost_reference FROM recipe_formulas WHERE id = $1',
          [formula_id]
        )
        if (fRes.rows[0]) {
          formulaCost = parseFloat(fRes.rows[0].total_cost_reference) || 0.0455
          formulaJson = { id: fRes.rows[0].id, name: fRes.rows[0].name, cost_per_sqft: formulaCost, source: 'manual_log' }
        }
      }

      // Obtener sqft del batch para cálculo
      const prRes = await client.query(
        'SELECT sqft_processed FROM production_records WHERE batch_code = $1 LIMIT 1',
        [batch_code]
      )
      const sqft = parseFloat(prRes.rows[0]?.sqft_processed || 0)

      // Limpiar logs anteriores del mismo batch (re-log)
      await client.query(
        'DELETE FROM batch_chemical_usage WHERE batch_code = $1',
        [batch_code]
      )

      // Calcular costo total de químicos
      let totalChemCost = 0

      for (const chem of chemicals) {
        const { chemical_id, qty_kg } = chem
        if (!chemical_id || !qty_kg || qty_kg <= 0) continue

        // Obtener precio del químico
        const chemRes = await client.query(
          'SELECT unit_cost, name FROM chemicals WHERE id = $1',
          [chemical_id]
        )
        const unitCost = parseFloat(chemRes.rows[0]?.unit_cost || 0)
        const chemCostTotal = qty_kg * unitCost
        totalChemCost += chemCostTotal

        await client.query(`
          INSERT INTO batch_chemical_usage
            (batch_code, chemical_id, recipe_formula_id, process_name, qty_used_kg, unit_cost_usd)
          VALUES ($1, $2, $3, 'manual_log', $4, $5)
        `, [batch_code, chemical_id, formula_id || null, qty_kg, unitCost])
      }

      // Actualizar genome con costos reales
      const laborCost = sqft * 0.170
      const overheadCost = sqft * 0.072
      await client.query(`
        UPDATE production_genome
        SET
          chem_cost_usd = $1,
          labor_cost_usd = $2,
          overhead_usd = $3,
          formula_json = COALESCE($4::jsonb, formula_json),
          notes = CONCAT(notes, ' | REAL_CHEM:', TO_CHAR(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD'))
        WHERE lot_id = $5
      `, [totalChemCost, laborCost, overheadCost, formulaJson ? JSON.stringify(formulaJson) : null, batch_code])

      // Si no existe genome entry, crearla
      const genomCheck = await client.query(
        'SELECT id FROM production_genome WHERE lot_id = $1', [batch_code]
      )
      if (genomCheck.rows.length === 0 && sqft > 0) {
        // Buscar ciudadano del mismo cliente
        const prFull = await client.query(
          'SELECT client_code, sqft_processed FROM production_records WHERE batch_code = $1 LIMIT 1',
          [batch_code]
        )
        const clientCode = prFull.rows[0]?.client_code
        if (clientCode) {
          const citizenRes = await client.query(
            'SELECT citizen_id FROM order_citizens WHERE father = $1 ORDER BY born_at DESC LIMIT 1',
            [clientCode]
          )
          const citizenId = citizenRes.rows[0]?.citizen_id
          if (citizenId) {
            await client.query(`
              INSERT INTO production_genome
                (citizen_id, lot_id, formula_json, sqft_input, sqft_output, labor_hours, chem_cost_usd, labor_cost_usd, overhead_usd, notes)
              VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, 'MANUAL_LOG: chemical usage recorded')
            `, [citizenId, batch_code, formulaJson ? JSON.stringify(formulaJson) : null,
               sqft, Math.round(sqft / 50), totalChemCost, laborCost, overheadCost])
          }
        }
      }

      await client.query('COMMIT')

      // Leer genome actualizado
      const updated = await client.query(
        `SELECT ROUND(chem_cost_usd::numeric,4) AS chem_cost,
                ROUND(total_cost_usd::numeric,4) AS total_cost,
                ROUND(cost_per_sqft::numeric,4) AS cost_per_sqft
         FROM production_genome WHERE lot_id = $1`,
        [batch_code]
      )

      return NextResponse.json({
        ok: true,
        batch_code,
        chem_entries: chemicals.length,
        total_chem_cost: totalChemCost,
        genome: updated.rows[0] || null,
      })
    } catch (err: any) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: err.message }, { status: 500 })
    } finally {
      client.release()
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
