import { Pool } from 'pg';

// Shared PostgreSQL pool — local backend
// env vars: PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD
export const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DB      || 'postgres',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'Abundancia2026',
  max: 10,
  idleTimeoutMillis: 30000,
});
