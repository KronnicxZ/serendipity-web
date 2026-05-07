import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.SOFIA_BACKEND_URL || 'http://localhost:5001'
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, ...params } = body
        if (action === 'send_message') {
            const res = await fetch(BACKEND + '/api/zalo/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })
            return NextResponse.json(res.ok ? await res.json() : { error: await res.text() }, { status: res.ok ? 200 : res.status })
        }
        if (action === 'get_status') {
            const res = await fetch(BACKEND + '/api/zalo/status')
            return NextResponse.json(await res.json())
        }
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
export async function GET() {
    try { const res = await fetch(BACKEND + '/api/zalo/status'); return NextResponse.json(await res.json()) }
    catch { return NextResponse.json({ connected: false, error: 'Backend unreachable' }) }
}