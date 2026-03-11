import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Usar el cliente Admin con Service Role para saltarse RLS y gestionar Auth
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: Request) {
    try {
        const { email, password, name, role } = await request.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        // 1. Crear el usuario en auth.users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, role: role || 'OPERATIVO' }
        });

        if (authError) {
            console.error('Error Auth Admin:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        const user = authData.user;

        // 2. Crear el registro en public.users
        const { error: publicError } = await supabaseAdmin
            .from('users')
            .insert({
                id: user.id,
                email,
                name,
                role: role || 'OPERATIVO'
            });

        if (publicError) {
            console.error('Error Public User:', publicError);
            // Si falla el insert público, borramos el de auth para mantener integridad
            await supabaseAdmin.auth.admin.deleteUser(user.id);
            return NextResponse.json({ error: publicError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: authData.user });

    } catch (error: any) {
        console.error('Admin User API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        // Borrar el usuario de Auth (y por cascade o manual del public si no hay cascade)
        // Ya que public.users.id references auth.users.id, el borrado de auth es lo principal
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
