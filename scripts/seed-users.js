/**
 * seed-users.js
 * Creates the 4 initial Serendipity test users in the local PostgreSQL DB.
 * Run: node scripts/seed-users.js
 *
 * Requires: npm install pg bcryptjs dotenv (already in package.json)
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DB      || 'postgres',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'Abundancia2026',
});

// ─── Users to seed ───────────────────────────────────────────────────────────
// Password convention: Serendipity2026! (cambiar tras la primera sesión)
const USERS = [
  {
    name:     'Vu',
    email:    'vu@serendipity.vn',
    password: 'Serendipity2026!',
    role:     'SUPERVISOR',   // Logistics
  },
  {
    name:     'Thuy',
    email:    'thuy@serendipity.vn',
    password: 'Serendipity2026!',
    role:     'OPERATIVO',    // Customer Service
  },
  {
    name:     'Tuyen',
    email:    'tuyen@serendipity.vn',
    password: 'Serendipity2026!',
    role:     'SUPERVISOR',   // RRHH
  },
  {
    name:     'Thanh',
    email:    'thanh@serendipity.vn',
    password: 'Serendipity2026!',
    role:     'OPERATIVO',    // Technician / Lab
  },
];

async function seedUsers() {
  const client = await pool.connect();
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    await client.query('SELECT 1'); // ping
    console.log('✅ Conexión OK\n');

    // Ensure the table exists (safety check)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "GoogleUsers" (
        id            SERIAL PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name          TEXT NOT NULL,
        role          TEXT DEFAULT 'OPERATIVO',
        created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      const { rows } = await client.query(
        `INSERT INTO "GoogleUsers" (email, password_hash, name, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               name          = EXCLUDED.name,
               role          = EXCLUDED.role
         RETURNING id, email, name, role`,
        [u.email, hash, u.name, u.role]
      );
      const created = rows[0];
      console.log(`  ✔ [${created.role.padEnd(10)}] ${created.name.padEnd(10)} → ${created.email}`);
    }

    console.log('\n🎉 Seed completado. Credenciales:');
    console.log('─────────────────────────────────────────────');
    USERS.forEach(u => {
      console.log(`  Email   : ${u.email}`);
      console.log(`  Password: ${u.password}`);
      console.log(`  Role    : ${u.role}`);
      console.log('  ─');
    });
    console.log('\n⚠️  Pedir a cada usuario que cambie su contraseña en el primer inicio de sesión.');

  } catch (err) {
    console.error('❌ Error durante el seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedUsers();
