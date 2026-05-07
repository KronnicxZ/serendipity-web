import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'sofia',
  user: 'postgres', password: 'Abundancia2026',
})

export async function GET(req: NextRequest) {
  const client = await pool.connect()
  try {
    const [nodesRes, censusRes, eventsRes, overdueRes, topRes] = await Promise.all([
      client.query(`
        SELECT node_id, company, db_code, node_type, country_flag,
               total_sf_delivered, total_revenue_usd, open_pos, trust_score,
               last_synapse, last_article
        FROM node_identity
        ORDER BY total_sf_delivered DESC NULLS LAST
      `),
      client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE vital_status = 'ACTIVE')    AS active,
          COUNT(*) FILTER (WHERE vital_status = 'DELIVERED') AS delivered,
          COUNT(*) FILTER (WHERE vital_status = 'OVERDUE')   AS overdue,
          COALESCE(SUM(sqft_produced), 0)                    AS sf_total,
          COALESCE(SUM(total_cost_to_date), 0)               AS cost_total
        FROM kingdom_census
      `),
      client.query(`
        SELECT e.citizen_id, e.event_type, e.actor, e.timestamp,
               e.station, e.data_json,
               kc.father, kc.purpose, kc.race, kc.vital_status
        FROM order_dna_events e
        LEFT JOIN kingdom_census kc ON kc.citizen_id = e.citizen_id
        ORDER BY e.timestamp DESC LIMIT 25
      `),
      client.query(`
        SELECT citizen_id, father, race, purpose,
               promised_etd, sqft_produced, total_events,
               total_cost_to_date, coherence_pct
        FROM kingdom_census WHERE vital_status = 'OVERDUE'
        ORDER BY promised_etd ASC NULLS LAST
      `),
      client.query(`
        SELECT citizen_id, father, race, purpose,
               sqft_produced, vital_status, coherence_pct,
               promised_etd, actual_etd, total_events, total_cost_to_date
        FROM kingdom_census WHERE sqft_produced > 0
        ORDER BY sqft_produced DESC LIMIT 12
      `),
    ])

    const citizensByFather = await client.query(`
      SELECT father,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE vital_status = 'ACTIVE')    AS active,
             COUNT(*) FILTER (WHERE vital_status = 'DELIVERED') AS delivered,
             COUNT(*) FILTER (WHERE vital_status = 'OVERDUE')   AS overdue,
             COALESCE(SUM(sqft_produced), 0) AS sf_produced
      FROM kingdom_census GROUP BY father
    `)

    const fatherMap: Record<string, any> = {}
    for (const r of citizensByFather.rows) {
      fatherMap[r.father?.toUpperCase() || ''] = {
        citizens_total:     parseInt(r.total)     || 0,
        citizens_active:    parseInt(r.active)    || 0,
        citizens_delivered: parseInt(r.delivered) || 0,
        citizens_overdue:   parseInt(r.overdue)   || 0,
        sf_in_census:       parseFloat(r.sf_produced) || 0,
      }
    }

    function matchFather(companyUpper: string): any {
      if (fatherMap[companyUpper]) return fatherMap[companyUpper]
      const firstWord = companyUpper.split(' ')[0]
      if (firstWord && fatherMap[firstWord]) return fatherMap[firstWord]
      for (const [fk, v] of Object.entries(fatherMap)) {
        if (fk && companyUpper.startsWith(fk)) return v
      }
      return null
    }

    const cRow = censusRes.rows[0]
    return NextResponse.json({
      nodes: nodesRes.rows.map((n: any) => {
        const companyKey = n.company?.toUpperCase() || ''
        const enriched = matchFather(companyKey) || {
          citizens_total: 0, citizens_active: 0,
          citizens_delivered: 0, citizens_overdue: 0, sf_in_census: 0,
        }
        return {
          node_id:            n.node_id,
          company:            n.company,
          db_code:            n.db_code,
          node_type:          n.node_type,
          country_flag:       n.country_flag,
          total_sf_delivered: parseFloat(n.total_sf_delivered) || 0,
          total_revenue_usd:  parseFloat(n.total_revenue_usd)  || 0,
          open_pos:           parseInt(n.open_pos)             || 0,
          trust_score:        parseInt(n.trust_score)          || 1,
          last_synapse:       n.last_synapse,
          last_article:       n.last_article,
          ...enriched,
        }
      }),
      census: {
        total:      parseInt(cRow.total)     || 0,
        active:     parseInt(cRow.active)    || 0,
        delivered:  parseInt(cRow.delivered) || 0,
        overdue:    parseInt(cRow.overdue)   || 0,
        sf_total:   parseFloat(cRow.sf_total)   || 0,
        cost_total: parseFloat(cRow.cost_total) || 0,
      },
      recent_events: eventsRes.rows.map((e: any) => ({
        citizen_id:   e.citizen_id,
        event_type:   e.event_type,
        actor:        e.actor,
        timestamp:    e.timestamp,
        station:      e.station,
        data_json:    e.data_json,
        father:       e.father,
        purpose:      e.purpose,
        race:         e.race,
        vital_status: e.vital_status,
      })),
      overdue_citizens: overdueRes.rows.map((o: any) => ({
        citizen_id:         o.citizen_id,
        father:             o.father,
        race:               o.race,
        purpose:            o.purpose,
        promised_etd:       o.promised_etd,
        sqft_produced:      parseFloat(o.sqft_produced)      || 0,
        total_events:       parseInt(o.total_events)         || 0,
        total_cost_to_date: parseFloat(o.total_cost_to_date) || 0,
        coherence_pct:      o.coherence_pct !== null ? parseFloat(o.coherence_pct) : null,
      })),
      top_citizens: topRes.rows.map((c: any) => ({
        citizen_id:         c.citizen_id,
        father:             c.father,
        race:               c.race,
        purpose:            c.purpose,
        sqft_produced:      parseFloat(c.sqft_produced)      || 0,
        vital_status:       c.vital_status,
        coherence_pct:      c.coherence_pct !== null ? parseFloat(c.coherence_pct) : null,
        promised_etd:       c.promised_etd,
        actual_etd:         c.actual_etd,
        total_events:       parseInt(c.total_events)         || 0,
        total_cost_to_date: parseFloat(c.total_cost_to_date) || 0,
      })),
    })
  } finally {
    client.release()
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  if (action === 'birth') {
    const { father, race, purpose, promised_etd, order_qty_sf } = body
    if (!father) return NextResponse.json({ error: 'father required' }, { status: 400 })
    const client = await pool.connect()
    try {
      const year = new Date().getFullYear()
      const raceCode = (race || 'S').toUpperCase()[0]
      const pattern = '^SRD-' + year + '-' + raceCode + '-'
      const { rows: lastRows } = await client.query(
        'SELECT citizen_id FROM order_citizens WHERE citizen_id ~ $1 ORDER BY citizen_id DESC LIMIT 1',
        [pattern]
      )
      let nextNum = 1
      if (lastRows.length > 0) {
        const parts = lastRows[0].citizen_id.split('-')
        nextNum = (parseInt(parts[3]) || 0) + 1
      }
      const citizen_id = 'SRD-' + year + '-' + raceCode + '-' + String(nextNum).padStart(4, '0')
      await client.query(
        'INSERT INTO order_citizens (citizen_id, father, race, purpose, promised_etd, quantity_sqft) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (citizen_id) DO NOTHING',
        [citizen_id, father, raceCode, purpose || '', promised_etd || null, order_qty_sf || 0]
      )
      await client.query(
        "INSERT INTO order_dna_events (citizen_id, event_type, actor, actor_role, timestamp, data_json, station) VALUES ($1,'BIRTH','dashboard','director',NOW(),$2::jsonb,'REINO')",
        [citizen_id, JSON.stringify({ father, race: raceCode, purpose, order_qty_sf, source: 'manual_birth' })]
      )
      return NextResponse.json({ ok: true, citizen_id })
    } finally {
      client.release()
    }
  }

  if (action === 'citizens_by_father') {
    const { father, offset = 0, limit = 60 } = body
    const client = await pool.connect()
    try {
      const { rows } = await client.query(`
        SELECT citizen_id, father, race, purpose,
               vital_status, sqft_produced, promised_etd, actual_etd,
               coherence_pct, total_events, born_at
        FROM kingdom_census
        WHERE ($1::text IS NULL OR UPPER(father) = UPPER($1))
        ORDER BY CASE vital_status WHEN 'OVERDUE' THEN 0 WHEN 'ACTIVE' THEN 1 ELSE 2 END,
                 sqft_produced DESC NULLS LAST
        LIMIT $2 OFFSET $3
      `, [father || null, limit, offset])
      return NextResponse.json({ citizens: rows })
    } finally {
      client.release()
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}