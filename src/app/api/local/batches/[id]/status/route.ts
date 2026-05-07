import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
    host: 'localhost', port: 5432, database: 'sofia',
    user: 'postgres', password: 'Abundancia2026',
})

// Map status string → quality_score / defect_pct that reproduce that status via batchStatus()
const STATUS_MAP: Record<string, { quality_score: number; defect_pct: number }> = {
    green: { quality_score: 90, defect_pct: 1 },
    amber: { quality_score: 75, defect_pct: 3 },
    red:   { quality_score: 60, defect_pct: 8 },
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { status, reason } = await req.json()
        const mapped = STATUS_MAP[status]
        if (!mapped) return NextResponse.json({ error: `Status inválido: ${status}` }, { status: 400 })

        const client = await pool.connect()
        try {
            const note = reason ? ` [${status.toUpperCase()}: ${reason}]` : ` [${status.toUpperCase()}]`
            await client.query(
                `UPDATE production_records
                 SET quality_score = $1, defect_pct = $2,
                     notes = COALESCE(notes,'') || $3
                 WHERE id = $4`,
                [mapped.quality_score, mapped.defect_pct, note, id]
            )
            return NextResponse.json({ success: true, id, status })
        } finally { client.release() }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
