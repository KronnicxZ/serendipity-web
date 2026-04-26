import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/lab/formulas/[id]/scale?sf=5000&waste=5
// Pure simulation — reads only, never writes.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sf      = parseFloat(req.nextUrl.searchParams.get('sf')    ?? '0');
  const wastePct = parseFloat(req.nextUrl.searchParams.get('waste') ?? '0');

  if (!sf || sf <= 0) return NextResponse.json({ error: 'sf must be > 0' }, { status: 400 });

  // Load formula header
  const { rows: [formula] } = await pool.query(
    `SELECT id, name, article, color_ref, status FROM recipe_formulas WHERE id = $1`, [id],
  );
  if (!formula) return NextResponse.json({ error: 'Formula not found' }, { status: 404 });
  if (formula.status !== 'APPROVED')
    return NextResponse.json({ error: 'Formula must be APPROVED to scale' }, { status: 422 });

  // Load processes + lines with chemical data
  const { rows: processes } = await pool.query(
    `SELECT rp.id, rp.process_order, rp.name, rp.type, rp.machine,
            rp.consumption_kg_per_sf
     FROM recipe_processes rp
     WHERE rp.formula_id = $1
     ORDER BY rp.process_order`, [id],
  );

  // Chemical stock map (load once)
  const { rows: allChems } = await pool.query(
    `SELECT id, name, unit_cost, stock_kg, supplier, category FROM chemicals WHERE active = TRUE`,
  );
  const chemById = new Map(allChems.map(c => [c.id as number, c]));

  // ── Scale each process ──────────────────────────────────────────────────
  const scaledProcesses = [];
  const consolidatedMap = new Map<number, {
    chemical_id: number; name: string; supplier: string | null; category: string;
    unit_cost: number; total_kg_needed: number; stock_kg: number;
  }>();

  let totalCost = 0;

  for (const proc of processes) {
    if (proc.type === 'MECHANICAL') {
      scaledProcesses.push({ ...proc, lines: [], total_kg: 0, total_cost: 0 });
      continue;
    }

    const consumptionKgPerSf = Number(proc.consumption_kg_per_sf ?? 0);
    const totalProcessKg     = sf * consumptionKgPerSf;

    const { rows: lines } = await pool.query(
      `SELECT rl.chemical_id, rl.grams, rl.is_variable
       FROM recipe_lines rl
       WHERE rl.process_id = $1 AND rl.chemical_id IS NOT NULL AND rl.grams > 0`, [proc.id],
    );

    // Sum of grams in this process (for % recalc sanity check)
    const totalGramsBase = lines.reduce((s, l) => s + Number(l.grams), 0);

    const scaledLines = lines.map(line => {
      const chem      = chemById.get(line.chemical_id);
      const proportion = totalGramsBase > 0 ? Number(line.grams) / totalGramsBase : 0;
      const rawKg     = proportion * totalProcessKg;
      const kg_needed = rawKg * (1 + wastePct / 100);    // with waste margin
      const unit_cost = chem ? Number(chem.unit_cost ?? 0) : 0;
      const cost      = kg_needed * unit_cost;
      const stock_kg  = chem ? Number(chem.stock_kg ?? 0) : 0;
      const shortage  = kg_needed > stock_kg;

      // Consolidate into shopping list
      if (chem) {
        const existing = consolidatedMap.get(line.chemical_id);
        if (existing) {
          existing.total_kg_needed += kg_needed;
        } else {
          consolidatedMap.set(line.chemical_id, {
            chemical_id:    line.chemical_id,
            name:           chem.name,
            supplier:       chem.supplier,
            category:       chem.category,
            unit_cost,
            total_kg_needed: kg_needed,
            stock_kg,
          });
        }
      }

      return {
        chemical_id:   line.chemical_id,
        chemical_name: chem?.name ?? `ID ${line.chemical_id}`,
        supplier:      chem?.supplier ?? null,
        grams_base:    Number(line.grams),
        pct_in_process: totalGramsBase > 0 ? (Number(line.grams) / totalGramsBase * 100).toFixed(1) : '0',
        kg_needed:     parseFloat(kg_needed.toFixed(4)),
        unit_cost,
        cost:          parseFloat(cost.toFixed(4)),
        stock_kg,
        shortage,
        is_variable:   line.is_variable,
      };
    });

    const procCost = scaledLines.reduce((s, l) => s + l.cost, 0);
    totalCost += procCost;

    scaledProcesses.push({
      id:               proc.id,
      process_order:    proc.process_order,
      name:             proc.name,
      type:             proc.type,
      machine:          proc.machine,
      consumption_kg_per_sf: consumptionKgPerSf,
      total_process_kg: parseFloat(totalProcessKg.toFixed(4)),
      total_cost:       parseFloat(procCost.toFixed(4)),
      lines:            scaledLines,
    });
  }

  // Build consolidated shopping list sorted by category then name
  const shoppingList = Array.from(consolidatedMap.values()).map(item => ({
    ...item,
    total_kg_needed: parseFloat(item.total_kg_needed.toFixed(4)),
    total_cost:      parseFloat((item.total_kg_needed * item.unit_cost).toFixed(4)),
    shortage:        item.total_kg_needed > item.stock_kg,
    shortage_kg:     parseFloat(Math.max(0, item.total_kg_needed - item.stock_kg).toFixed(4)),
  })).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const shortageCount = shoppingList.filter(i => i.shortage).length;

  return NextResponse.json({
    formula: { id: formula.id, name: formula.name, article: formula.article, color_ref: formula.color_ref },
    params:  { sf_target: sf, waste_pct: wastePct },
    processes: scaledProcesses,
    shopping_list: shoppingList,
    summary: {
      total_cost:     parseFloat(totalCost.toFixed(4)),
      cost_per_sf:    parseFloat((totalCost / sf).toFixed(6)),
      shortage_count: shortageCount,
      can_produce:    shortageCount === 0,
    },
  });
}
