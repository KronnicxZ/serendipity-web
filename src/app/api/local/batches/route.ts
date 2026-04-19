import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.SOFIA_BACKEND_URL || 'http://localhost:5001'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const limit = parseInt(searchParams.get('limit') || '50')

    try {
        const res = await fetch(
            `${BACKEND}/api/serendipity/production-records?month=${month}&limit=${limit}`,
            { cache: 'no-store' }
        )

        if (!res.ok) {
            return NextResponse.json({ orders: [], summary: {} }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (err: any) {
        console.error('Batches route error:', err)
        return NextResponse.json({ orders: [], summary: {}, error: err.message }, { status: 500 })
    }
}
