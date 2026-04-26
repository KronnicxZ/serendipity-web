import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows: [formula] } = await pool.query(
    'SELECT * FROM recipe_formulas WHERE id = $1', [id],
  );
  if (!formula) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { rows: processes } = await pool.query(
    'SELECT * FROM recipe_processes WHERE formula_id = $1 ORDER BY process_order', [id],
  );

  for (const p of processes) {
    const { rows: lines } = await pool.query(
      `SELECT rl.*, c.name AS chemical_name, c.supplier, c.unit_cost, c.category
       FROM recipe_lines rl
       LEFT JOIN chemicals c ON c.id = rl.chemical_id
       WHERE rl.process_id = $1`, [p.id],
    );
    (p as Record<string, unknown>).lines = lines;
  }

  return NextResponse.json({ ...formula, processes });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, article, color_ref, description, notes, status, processes = [] } = await req.json();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [formula] } = await client.query(
      `UPDATE recipe_formulas
       SET name=$1, article=$2, color_ref=$3, description=$4, notes=$5, status=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, article || null, color_ref || null, description || null, notes || null, status ?? 'DRAFT', id],
    );
    if (!formula) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'not found' }, { status: 404 }); }

    // Full replace: delete then re-insert
    await client.query('DELETE FROM recipe_processes WHERE formula_id = $1', [id]);

    for (const proc of processes) {
      const { rows: [p] } = await client.query(
        `INSERT INTO recipe_processes
           (formula_id, process_order, name, type, machine,
            pressure_bar, speed_mpm, passes,
            temperature_c, load_kg, duration_min, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [id, proc.process_order, proc.name, proc.type, proc.machine || null,
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
    return NextResponse.json(formula);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pool.query('DELETE FROM recipe_formulas WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
