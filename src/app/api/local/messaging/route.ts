import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.SOFIA_BACKEND_URL || 'http://localhost:5001'
const TEAM = [
    { id: 'tuyen-001', name: 'Ma Thanh Tuyen', email: 'info@serendipity.vn', role: 'SUPERVISOR' },
    { id: 'vu-001', name: 'Nguyen Quoc Vu', email: 'logistics@serendipity.vn', role: 'SUPERVISOR' },
    { id: 'maris-001', name: 'Maris (Thuy)', email: 'cs1@serendipity.vn', role: 'OPERATIVO' },
    { id: 'santi-001', name: 'Santiago Campanera', email: 'santi@serendipity.vn', role: 'ADMIN' },
]
const store: any[] = []
export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    if (url.searchParams.get('type') === 'contacts') return NextResponse.json({ contacts: TEAM })
    const userId = url.searchParams.get('userId'); const otherId = url.searchParams.get('otherId')
    if (userId && otherId) {
        const msgs = store.filter(m => (m.sender_id===userId&&m.receiver_id===otherId)||(m.sender_id===otherId&&m.receiver_id===userId)).sort((a,b)=>a.created_at.localeCompare(b.created_at))
        return NextResponse.json({ messages: msgs })
    }
    return NextResponse.json({ contacts: TEAM, messages: store.slice(-50) })
}
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { channel, ...params } = body
        if (channel === 'internal') {
            const msg = { id: Date.now().toString(), sender_id: params.sender_id, receiver_id: params.receiver_id, content: params.content, is_critical: params.is_critical||false, created_at: new Date().toISOString(), read_at: null, sender: TEAM.find(c=>c.id===params.sender_id), receiver: TEAM.find(c=>c.id===params.receiver_id) }
            store.push(msg)
            return NextResponse.json({ success: true, message: msg })
        }
        if (channel === 'zalo') {
            const res = await fetch(BACKEND + '/api/zalo/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })
            return NextResponse.json(await res.json())
        }
        return NextResponse.json({ error: 'Unknown channel' }, { status: 400 })
    } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
