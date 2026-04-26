import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      rf.*,
      COUNT(DISTINCT rp.id)::int AS process_count,
      COALESCE(SUM(
        CASE WHEN rp.type = 'CHEMICAL' THEN (
          SELECT COALESCE(SUM(rl.grams / 1000.0 * COALESCE(c.unit_cost, 0)), 0)
          FROM recipe_lines rl
          LEFT JOIN chemicals c ON c.id = rl.chemical_id
          WHERE rl.process_id = rp.id
        ) ELSE 0 END
      ), 0)::numeric(10,4) AS total_cost
    FROM recipe_formulas rf
    LEFT JOIN recipe_processes rp ON rp.formula_id = rf.id
    GROUP BY rf.id
    ORDER BY rf.updated_at DESC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, article, color_ref, description, notes, status = 'DRAFT', processes = [] } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [formula] } = await client.query(
      `INSERT INTO recipe_formulas (name, article, color_ref, description, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, article || null, color_ref || null, description || null, notes || null, status],
    );

    for (const proc of processes) {
      const { rows: [p] } = await client.query(
        `INSERT INTO recipe_processes
           (formula_id, process_order, name, type, machine,
            pressure_bar, speed_mpm, passes,
            temperature_c, load_kg, duration_min, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [formula.id, proc.process_order, proc.name, proc.type, proc.machine || null,
         proc.pressure_bar || null, proc.speed_mpm || null, proc.passes || null,
         proc.temperature_c || null, proc.load_kg || null, proc.duration_min || null, proc.notes || null],
      );

      for (const line of (proc.lines ?? [])) {
        if (!line.chemical_id) continue;
        await client.query(
          `INSERT INTO recipe_lines (process_id, chemical_id, grams, is_variable, notes)
           VALUES ($1,$2,$3,$4,$5)`,
          [p.id, line.chemical_id, line.grams ?? 0, line.is_variable ?? false, line.notes || null],
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json(formula, { status: 201 });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
