import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ host: 'localhost', port: 5432, database: 'sofia', user: 'postgres', password: 'Abundancia2026' })
const BACKEND = process.env.SOFIA_BACKEND_URL || 'http://localhost:5001'

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const category = url.searchParams.get('category') || null
    const search = url.searchParams.get('search') || null

    try {
        // Load knowledge from DB
        let query = 'SELECT id, title, category, content, source, updated_at FROM sofia_knowledge'
        const params: any[] = []
        if (category) { query += ' WHERE category = $1'; params.push(category) }
        else if (search) {
            query += ' WHERE to_tsvector(\'english\', content || \' \' || title) @@ plainto_tsquery(\'english\', $1)'
            params.push(search)
        }
        query += ' ORDER BY category, title'
        const kResult = await pool.query(query, params)

        // Load current DB state
        const [dashRes, batchRes, payablesRes, praraRes] = await Promise.all([
            fetch(BACKEND + '/api/serendipity/dashboard').then(r => r.json()).catch(() => ({})),
            pool.query('SELECT batch_code, client_code, sqft_processed, created_at FROM production_records WHERE created_at >= NOW() - INTERVAL \'7 days\' ORDER BY created_at DESC LIMIT 20'),
            fetch(BACKEND + '/api/serendipity/payables').then(r => r.json()).catch(() => ({ data: [] })),
            fetch(BACKEND + '/api/serendipity/prara-balance').then(r => r.json()).catch(() => ({})),
        ])

        const recentBatches = batchRes.rows.map(r => ({
            batchCode: r.batch_code,
            client: r.client_code,
            sf: parseFloat(r.sqft_processed),
            date: new Date(r.created_at).toISOString().slice(0, 10),
        }))

        return NextResponse.json({
            knowledge: kResult.rows,
            liveState: {
                financial: dashRes.financial || {},
                production: dashRes.production || {},
                recentBatches,
                payables: payablesRes.data || [],
                praraBalance: praraRes,
                asOf: new Date().toISOString(),
            }
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message, knowledge: [], liveState: {} }, { status: 500 })
    }
}

// Add/update knowledge entry
export async function POST(req: NextRequest) {
    try {
        const { title, category, content, source } = await req.json()
        if (!title || !content) return NextResponse.json({ error: 'title and content required' }, { status: 400 })
        const result = await pool.query(
            'INSERT INTO sofia_knowledge (title, category, content, source) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id',
            [title, category || 'general', content, source || 'manual']
        )
        return NextResponse.json({ ok: true, id: result.rows[0]?.id })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
