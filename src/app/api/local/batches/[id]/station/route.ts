import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
    host: 'localhost', port: 5432, database: 'sofia',
    user: 'postgres', password: 'Abundancia2026',
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const { stationId } = await req.json()
        if (!stationId) return NextResponse.json({ error: 'stationId requerido' }, { status: 400 })

        const client = await pool.connect()
        try {
            // Append station movement to notes since production_records has no station column
            const note = ` [STATION:${stationId}]`
            await client.query(
                `UPDATE production_records
                 SET notes = COALESCE(notes,'') || $1
                 WHERE id = $2`,
                [note, id]
            )
            return NextResponse.json({ success: true, id, stationId })
        } finally { client.release() }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
