'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, ChevronRight, Factory, Beaker,
  AlertTriangle, CheckCircle2, Loader2, DollarSign,
  ArrowRightCircle, Calculator,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────

interface ScaledLine {
  chemical_id: number; chemical_name: string; supplier: string | null;
  grams_base: number; pct_in_process: string;
  kg_needed: number; unit_cost: number; cost: number;
  stock_kg: number; shortage: boolean; is_variable: boolean;
}

interface ScaledProcess {
  id: number; process_order: number; name: string; type: string; machine: string | null;
  consumption_kg_per_sf: number; total_process_kg: number; total_cost: number;
  lines: ScaledLine[];
}

interface ShoppingItem {
  chemical_id: number; name: string; supplier: string | null; category: string;
  unit_cost: number; total_kg_needed: number; total_cost: number;
  stock_kg: number; shortage: boolean; shortage_kg: number;
}

interface ScaleResult {
  formula: { id: number; name: string; article: string | null; color_ref: string | null };
  params: { sf_target: number; waste_pct: number };
  processes: ScaledProcess[];
  shopping_list: ShoppingItem[];
  summary: { total_cost: number; cost_per_sf: number; shortage_count: number; can_produce: boolean };
}

interface Formula { id: number; name: string; article: string | null; color_ref: string | null; status: string; }

const WASTE_OPTIONS = [0, 2, 5, 8, 10, 15];

// ── Page ───────────────────────────────────────────────────────────────────

export default function ScalePage() {
  const [formulas, setFormulas]   = useState<Formula[]>([]);
  const [formulaId, setFormulaId] = useState('');
  const [sfTarget, setSfTarget]   = useState(1000);
  const [wastePct, setWastePct]   = useState(5);
  const [poId, setPoId]           = useState('');

  const [result, setResult]         = useState<ScaleResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted]   = useState<{ batch_number: string } | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/recipe/formulas')
      .then(r => r.json())
      .then((data: Formula[]) => setFormulas(data.filter(f => f.status === 'APPROVED')));
  }, []);

  useEffect(() => {
    if (!formulaId || sfTarget <= 0) { setResult(null); return; }
    const t = setTimeout(simulate, 400);
    return () => clearTimeout(t);
  }, [formulaId, sfTarget, wastePct]);

  async function simulate() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/lab/formulas/${formulaId}/scale?sf=${sfTarget}&waste=${wastePct}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error); setResult(null); return; }
      setResult(data);
    } finally { setLoading(false); }
  }

  async function createBatch() {
    if (!result || !poId) return;
    setCommitting(true); setCommitError(null);
    try {
      const res = await fetch(`/api/production-orders/${poId}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_formula_id: result.formula.id,
          sf_target: sfTarget,
          waste_pct: wastePct,
          processes: result.processes.map(p => ({
            process_order: p.process_order,
            name: p.name,
            type: p.type,
            lines: p.lines.map(l => ({ chemical_id: l.chemical_id, kg_needed: l.kg_needed })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCommitError(data.error); return; }
      setCommitted({ batch_number: data.batch_number });
    } finally { setCommitting(false); }
  }

  const selectedFormula = formulas.find(f => f.id.toString() === formulaId);
  const chemProcesses   = result?.processes.filter(p => p.type === 'CHEMICAL') ?? [];
  const totalChemKg     = chemProcesses.reduce((s, p) => s + p.total_process_kg, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/lab/formulas" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
            <ArrowLeft size={13} /> Lab
          </Link>
          <ChevronRight size={11} />
          <span className="text-slate-300">Motor de Escalado — Capa 3</span>
        </div>

        {/* ── HEADER CARD ─────────────────────────────────────────── */}
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400 shrink-0">
              <Calculator size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                {selectedFormula ? selectedFormula.name : 'Simulador de Producción'}
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold tracking-wider">
                  APPROVED
                </span>
              </h1>
              {selectedFormula ? (
                <p className="text-sm text-slate-400 mt-0.5">
                  {selectedFormula.article && <>Artículo: <span className="font-mono text-slate-300">{selectedFormula.article}</span></>}
                  {selectedFormula.color_ref && <> · Color: <span className="text-slate-300">{selectedFormula.color_ref}</span></>}
                </p>
              ) : (
                <p className="text-sm text-slate-500 mt-0.5">Seleccioná una fórmula aprobada para simular el lote</p>
              )}
            </div>
          </div>

          {/* Params inline */}
          <div className="flex bg-slate-950 p-2 rounded-xl border border-slate-800 gap-1 w-full md:w-auto flex-wrap">
            <div className="flex flex-col px-3 py-1 min-w-[160px]">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Fórmula</label>
              <select value={formulaId} onChange={e => { setFormulaId(e.target.value); setResult(null); setCommitted(null); }}
                title="Seleccionar fórmula aprobada"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none">
                <option value="">— Seleccionar —</option>
                {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="w-px bg-slate-800 self-stretch mx-1" />
            <div className="flex flex-col px-3 py-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Target de Producción (SF)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" step="100" value={sfTarget}
                  onChange={e => setSfTarget(Math.max(1, Number(e.target.value)))}
                  title="Target de producción en pies cuadrados"
                  placeholder="1000"
                  className="bg-slate-900 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-lg font-mono text-indigo-100 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span className="text-slate-500 font-mono text-sm">SF</span>
              </div>
            </div>
            <div className="w-px bg-slate-800 self-stretch mx-1" />
            <div className="flex flex-col px-3 py-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Margen de Merma (%)</label>
              <div className="flex items-center gap-2">
                <select value={wastePct} onChange={e => setWastePct(Number(e.target.value))}
                  title="Margen de merma en porcentaje"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-lg font-mono text-slate-200 w-20 focus:outline-none focus:border-indigo-500 appearance-none">
                  {WASTE_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <span className="text-slate-500 font-mono text-sm">%</span>
              </div>
            </div>
            <div className="w-px bg-slate-800 self-stretch mx-1" />
            <div className="flex flex-col px-3 py-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">PO ID</label>
              <input type="text" value={poId} onChange={e => setPoId(e.target.value)}
                placeholder="ej: 42"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-lg font-mono text-slate-200 w-24 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </header>

        {/* Loading / error */}
        {loading && (
          <div className="flex items-center gap-3 text-slate-500 text-sm py-2">
            <Loader2 size={16} className="animate-spin text-indigo-400" /> Calculando escala…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* ── MAIN GRID ───────────────────────────────────────────── */}
        {result && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Process breakdown */}
            <div className="lg:col-span-2 space-y-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Factory size={15} /> Mezclas a Preparar por Proceso
              </h2>

              {result.processes.map(proc => {
                if (proc.type === 'MECHANICAL') return null;
                const hasShort = proc.lines.some(l => l.shortage);

                return (
                  <div key={proc.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {/* Process header */}
                    <div className="bg-slate-800/30 border-b border-slate-800 px-5 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-full text-xs font-bold text-slate-400">
                          {proc.process_order}
                        </span>
                        <h3 className="font-semibold text-slate-200">{proc.name}</h3>
                        {proc.machine && <span className="text-xs text-slate-500">{proc.machine}</span>}
                        {hasShort && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            ⚠ Stock insuficiente
                          </span>
                        )}
                      </div>
                      <div className="flex gap-5 text-sm font-mono">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 uppercase font-sans tracking-wider">Target Proceso</span>
                          <span className="text-indigo-400 font-semibold">{proc.total_process_kg.toFixed(2)} kg</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 uppercase font-sans tracking-wider">Consumo SF</span>
                          {proc.consumption_kg_per_sf > 0
                            ? <span className="text-slate-400">{proc.consumption_kg_per_sf} kg/SF</span>
                            : <span className="text-amber-400 text-xs">no configurado</span>}
                        </div>
                      </div>
                    </div>

                    {/* Lines table */}
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-3 font-medium">Químico</th>
                          <th className="p-3 font-medium text-right">Receta Ref.</th>
                          <th className="p-3 font-medium text-right text-indigo-300">Requerido (Kg)</th>
                          <th className="p-3 font-medium text-right">Costo Lote</th>
                          <th className="p-3 font-medium text-center w-10">Inv.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {proc.lines.map((line, li) => (
                          <tr key={li} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-3">
                              <div className="font-medium text-slate-200">{line.chemical_name}
                                {line.is_variable && <span className="ml-1.5 text-[10px] text-amber-400">⚡</span>}
                              </div>
                              {line.supplier && <div className="text-[10px] text-slate-500 font-mono">{line.supplier}</div>}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-400">{line.grams_base}g</td>
                            <td className="p-3 text-right font-mono font-semibold text-indigo-400 bg-indigo-500/5">
                              {line.kg_needed.toFixed(3)} kg
                            </td>
                            <td className="p-3 text-right font-mono text-slate-400">${line.cost.toFixed(4)}</td>
                            <td className="p-3 text-center">
                              {line.shortage
                                ? <AlertTriangle size={16} className="text-amber-500 mx-auto" title={`Stock: ${line.stock_kg} kg`} />
                                : <CheckCircle2 size={16} className="text-emerald-500 mx-auto opacity-50" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* RIGHT: Summary + Shopping list */}
            <div className="space-y-5">

              {/* Summary action card */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Factory size={100} />
                </div>

                <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-5">Resumen del Lote</h2>

                <div className="space-y-4 mb-6">
                  {[
                    { label: 'Producción Total',     value: `${sfTarget.toLocaleString()}`, unit: 'SF',  color: 'text-slate-200' },
                    { label: 'Químicos a Preparar',  value: totalChemKg.toFixed(2),         unit: 'kg',  color: 'text-slate-200' },
                    { label: 'Costo Variable Real',  value: `$${result.summary.total_cost.toFixed(2)}`, unit: '', color: 'text-emerald-400 text-2xl' },
                    { label: '$ por SF',             value: `$${result.summary.cost_per_sf.toFixed(5)}`, unit: '/SF', color: 'text-emerald-300 text-sm' },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between items-end border-b border-indigo-500/10 pb-3">
                      <span className="text-slate-400 text-sm">{s.label}</span>
                      <span className={`font-mono font-bold ${s.color || 'text-slate-200 text-xl'}`}>
                        {s.value} <span className="text-slate-500 text-sm font-normal">{s.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {result.summary.shortage_count > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200">
                      {result.summary.shortage_count} químico{result.summary.shortage_count !== 1 ? 's' : ''} con stock insuficiente para esta orden.
                    </p>
                  </div>
                )}

                {committed ? (
                  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400">
                    <CheckCircle2 size={20} />
                    <div>
                      <div className="font-semibold text-sm">Lote creado</div>
                      <div className="text-xs font-mono">{committed.batch_number}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {commitError && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3 text-red-400 text-xs">
                        <AlertTriangle size={13} /> {commitError}
                      </div>
                    )}
                    {!poId && (
                      <p className="text-xs text-slate-600 mb-3 text-center">Ingresá el PO ID en el header para habilitar el lote</p>
                    )}
                    <button type="button" onClick={createBatch}
                      disabled={committing || !poId || !result.summary.can_produce}
                      aria-label="Generar orden de preparación en sistema legacy"
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20">
                      {committing
                        ? <><Loader2 size={16} className="animate-spin" /> Procesando…</>
                        : <>Crear Lote (Batch) <ArrowRightCircle size={18} /></>}
                    </button>
                    {!result.summary.can_produce && poId && (
                      <p className="text-[10px] text-amber-500 text-center mt-2">Resolvé los faltantes de stock antes de crear el lote</p>
                    )}
                  </>
                )}
              </div>

              {/* Consolidated shopping list */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Beaker size={15} /> Lista Consolidada
                </h3>
                <p className="text-xs text-slate-500 mb-4">Suma de químicos cruzando todos los procesos.</p>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {result.shopping_list.map(item => (
                    <div key={item.chemical_id}
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        item.shortage ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950 border-slate-800'
                      }`}>
                      <div>
                        <div className="font-medium text-slate-200 text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Stock: <span className={item.shortage ? 'text-amber-400' : ''}>{item.stock_kg.toFixed(1)} kg</span>
                          {item.shortage && <span className="text-amber-400"> · falta {item.shortage_kg.toFixed(3)} kg</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${item.shortage ? 'text-amber-400' : 'text-indigo-400'}`}>
                          {item.total_kg_needed.toFixed(3)} kg
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400">${item.total_cost.toFixed(4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="text-center py-24 text-slate-600">
            <DollarSign size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Seleccioná una fórmula aprobada y ajustá el SF target para simular el lote.</p>
          </div>
        )}

      </div>
    </div>
  );
}
