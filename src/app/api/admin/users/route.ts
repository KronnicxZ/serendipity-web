import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgresql://postgres:Abundancia2026@localhost:5432/postgres'
});

export async function GET() {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC`
        );
        return NextResponse.json({ users: rows });
    } catch (err: any) {
        console.error('[Admin Users GET]', err.message);
        return NextResponse.json({ users: [] });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, role } = body;
        if (!name || !email || !role) {
            return NextResponse.json({ error: 'name, email and role are required' }, { status: 400 });
        }
        const { rows } = await pool.query(
            `INSERT INTO users (name, email, role) VALUES ($1, $2, $3)
             ON CONFLICT (email) DO UPDATE SET name=$1, role=$3, updated_at=now()
             RETURNING id, name, email, role, created_at`,
            [name, email, role]
        );
        return NextResponse.json({ user: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, role } = body;
        if (!id || !role) return NextResponse.json({ error: 'id and role required' }, { status: 400 });
        const { rows } = await pool.query(
            `UPDATE users SET role=$1, updated_at=now() WHERE id=$2 RETURNING id, name, email, role`,
            [role, id]
        );
        if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({ user: rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
