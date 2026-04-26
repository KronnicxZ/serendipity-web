import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { pool } from '@/lib/db';

// Expected CSV columns (case-insensitive):
// Formula_Name, Article, Color, Process_Order, Process_Name, Process_Type, Machine, Chemical_Name, Grams
// Process_Type defaults to CHEMICAL if omitted

interface CsvRow {
  formula_name: string;
  article?: string;
  color?: string;
  process_order: string;
  process_name: string;
  process_type?: string;
  machine?: string;
  chemical_name?: string;
  grams?: string;
}

interface ValidationError { row: number; message: string; }

interface PreviewProcess {
  order: number;
  name: string;
  type: 'CHEMICAL' | 'MECHANICAL';
  machine: string | null;
  lines: { chemical_name: string; chemical_id: number | null; grams: number; found: boolean }[];
}

interface PreviewFormula {
  name: string;
  article: string | null;
  color: string | null;
  processes: PreviewProcess[];
}

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[\s_-]+/g, '_').trim();
}

export async function POST(req: NextRequest) {
  const url    = new URL(req.url);
  const commit = url.searchParams.get('commit') === 'true';

  // Commit path: receive already-validated preview as JSON (no re-parse needed)
  if (commit) {
    const { preview }: { preview: PreviewFormula[] } = await req.json();
    if (!preview?.length) return NextResponse.json({ error: 'No preview data' }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted: { name: string; id: number }[] = [];
      for (const formula of preview) {
        const { rows: [rf] } = await client.query(
          `INSERT INTO recipe_formulas (name, article, color_ref, status)
           VALUES ($1, $2, $3, 'DRAFT') RETURNING id`,
          [formula.name, formula.article, formula.color],
        );
        for (const proc of formula.processes) {
          const { rows: [rp] } = await client.query(
            `INSERT INTO recipe_processes (formula_id, process_order, name, type, machine)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [rf.id, proc.order, proc.name, proc.type, proc.machine],
          );
          for (const line of proc.lines) {
            if (!line.chemical_id || line.grams <= 0) continue;
            await client.query(
              `INSERT INTO recipe_lines (process_id, chemical_id, grams, is_variable) VALUES ($1,$2,$3,FALSE)`,
              [rp.id, line.chemical_id, line.grams],
            );
          }
        }
        inserted.push({ name: formula.name, id: rf.id });
      }
      await client.query('COMMIT');
      return NextResponse.json({ ok: true, inserted, count: inserted.length });
    } catch (e: unknown) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    } finally { client.release(); }
  }

  // Preview path: parse CSV from FormData
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();

  // Parse CSV (papaparse handles both , and ; delimiters)
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => normalizeKey(h),
  });

  if (!parsed.data.length)
    return NextResponse.json({ error: 'CSV empty or could not be parsed' }, { status: 400 });

  // Normalize rows
  const rows: CsvRow[] = parsed.data.map(r => ({
    formula_name:  (r['formula_name'] || r['name'] || '').trim(),
    article:       (r['article'] || '').trim() || undefined,
    color:         (r['color'] || r['color_ref'] || '').trim() || undefined,
    process_order: (r['process_order'] || r['order'] || '1').trim(),
    process_name:  (r['process_name'] || r['process'] || '').trim(),
    process_type:  (r['process_type'] || r['type'] || 'CHEMICAL').trim().toUpperCase(),
    machine:       (r['machine'] || '').trim() || undefined,
    chemical_name: (r['chemical_name'] || r['chemical'] || '').trim() || undefined,
    grams:         (r['grams'] || r['qty'] || '').trim() || undefined,
  }));

  // Load chemicals catalogue for matching
  const { rows: catalogue } = await pool.query(
    `SELECT id, name FROM chemicals WHERE active = TRUE`,
  );
  const chemMap = new Map<string, number>(catalogue.map(c => [c.name.toLowerCase(), c.id]));

  // Validate and build preview grouped by formula
  const errors: ValidationError[] = [];
  const formulaMap = new Map<string, PreviewFormula>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header
    if (!row.formula_name) { errors.push({ row: rowNum, message: 'formula_name vacío' }); return; }
    if (!row.process_name)  { errors.push({ row: rowNum, message: 'process_name vacío' }); return; }

    const processOrder = parseInt(row.process_order);
    if (isNaN(processOrder)) { errors.push({ row: rowNum, message: `process_order inválido: ${row.process_order}` }); return; }

    const procType = row.process_type === 'MECHANICAL' ? 'MECHANICAL' : 'CHEMICAL';

    if (!formulaMap.has(row.formula_name)) {
      formulaMap.set(row.formula_name, {
        name: row.formula_name,
        article: row.article ?? null,
        color: row.color ?? null,
        processes: [],
      });
    }

    const formula = formulaMap.get(row.formula_name)!;
    let proc = formula.processes.find(p => p.order === processOrder);
    if (!proc) {
      proc = { order: processOrder, name: row.process_name, type: procType, machine: row.machine ?? null, lines: [] };
      formula.processes.push(proc);
    }

    // Only add line if chemical_name and grams are present
    if (row.chemical_name && row.grams) {
      const grams = parseFloat(row.grams);
      if (isNaN(grams) || grams < 0) {
        errors.push({ row: rowNum, message: `grams inválido: ${row.grams}` });
        return;
      }
      const chemId = chemMap.get(row.chemical_name.toLowerCase()) ?? null;
      if (!chemId) errors.push({ row: rowNum, message: `Químico no encontrado: "${row.chemical_name}"` });
      proc.lines.push({ chemical_name: row.chemical_name, chemical_id: chemId, grams, found: !!chemId });
    }
  });

  const preview = Array.from(formulaMap.values()).map(f => ({
    ...f,
    processes: f.processes.sort((a, b) => a.order - b.order),
  }));

  return NextResponse.json({ preview, errors, canCommit: errors.length === 0 });
}
