// Migrated from Supabase → local PostgreSQL
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, role, created_at FROM "GoogleUsers" ORDER BY created_at DESC`
    );
    return NextResponse.json({ users: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role = 'OPERATIVO' } = await req.json();
    if (!email || !password || !name)
      return NextResponse.json({ error: 'Faltan campos: email, password, name' }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO "GoogleUsers" (email, password_hash, name, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, role, created_at`,
      [email, hash, name, role]
    );
    if (!rows.length)
      return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 });

    return NextResponse.json({ success: true, user: rows[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    if (!userId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await pool.query(`DELETE FROM "GoogleUsers" WHERE id = $1`, [userId]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
