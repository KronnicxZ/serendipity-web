import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseServiceKey) 
    ? createClient(supabaseUrl, supabaseServiceKey) 
    : null;

export async function GET() {
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
        .from('vault_documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Map to normalized format
    const docs = data.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: doc.created_at,
        encrypted: true,
        status: doc.status
    }));

    return NextResponse.json(docs);
}

export async function DELETE(request: Request) {
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // Delete document (cascade should take care of embeddings if DB is setup correctly, 
    // otherwise we handle it manually here just in case)
    const { error: embedError } = await supabase
        .from('vault_embeddings')
        .delete()
        .eq('document_id', id);

    if (embedError) console.warn('Could not delete embeddings:', embedError.message);

    const { error: docError } = await supabase
        .from('vault_documents')
        .delete()
        .eq('id', id);

    if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
