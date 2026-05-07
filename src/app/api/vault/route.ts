import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Local mode: use sofia_knowledge DB
const pool = (!supabaseUrl || supabaseUrl === '')
    ? new Pool({ host: 'localhost', port: 5432, database: 'sofia', user: 'postgres', password: 'Abundancia2026' })
    : null

export async function GET() {
    if (!pool) {
        // Supabase mode
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
        const { data, error } = await supabase.from('vault_documents').select('*').order('created_at', { ascending: false })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json((data || []).map((doc: any) => ({ id: doc.id, name: doc.name, type: doc.type, size: doc.size, uploadedAt: doc.created_at, encrypted: true, status: doc.status })))
    }
    // Local mode
    const result = await pool.query('SELECT id, title as name, category as type, length(content) as size, created_at, updated_at FROM sofia_knowledge ORDER BY category, title')
    return NextResponse.json(result.rows.map(r => ({
        id: String(r.id),
        name: r.name,
        type: r.type,
        size: r.size,
        uploadedAt: r.created_at,
        encrypted: false,
        status: 'active',
    })))
}

export async function DELETE(request: NextRequest) {
    if (!pool) return NextResponse.json({ error: 'Supabase mode' }, { status: 501 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await pool.query('DELETE FROM sofia_knowledge WHERE id = $1', [parseInt(id)])
    return NextResponse.json({ success: true })
}
