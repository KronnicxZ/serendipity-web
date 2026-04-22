import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT * FROM "GoogleUsers" WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // Retornamos el usuario (sin el hash)
    const { password_hash, ...userWithoutHash } = user;
    return NextResponse.json({ success: true, user: userWithoutHash });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
