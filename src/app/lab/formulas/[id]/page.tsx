'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Save, Beaker, Wrench, Plus, Trash2, Zap, Search,
  CheckCircle2, ChevronDown, ChevronUp, X, ChevronRight, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────
interface CatalogueItem {
  id: string;
  name: string;
  supplier: string;
  category: string;
  price: number;
}

interface ProcessParams {
  pressure?: number; speed?: number; passes?: number;
  temp?: number; load?: number; time?: number;
}

interface Process {
  id: string;
  order: number;
  name: string;
  type: 'CHEMICAL' | 'MECHANICAL';
  machine: string;
  params: ProcessParams;
}

interface CellData { grams: number | ''; isVariable: boolean; }
type Grid = Record<string, Record<string, CellData>>;

// ── Add Process Modal ──────────────────────────────────────────────────────
function AddProcessModal({ onAdd, onClose }: { onAdd: (p: Omit<Process, 'id' | 'order'>) => void; onClose: () => void }) {
  const [name, setName]   = useState('');
  const [type, setType]   = useState<'CHEMICAL' | 'MECHANICAL'>('CHEMICAL');
  const [machine, setMachine] = useState('Spray');
  const [params, setParams]   = useState<ProcessParams>({ pressure: 2.5, speed: 3, passes: 1 });

  const isChem = type === 'CHEMICAL';
  const inp = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500';

  function submit() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), type, machine, params });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">Nuevo proceso</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Nombre</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Ej: Teñido, Fondo, Plancha…" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Tipo</label>
            <div className="flex gap-2">
              {(['CHEMICAL', 'MECHANICAL'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setMachine(t === 'CHEMICAL' ? 'Spray' : 'Plancha'); setParams(t === 'CHEMICAL' ? { pressure: 2.5, speed: 3, passes: 1 } : { temp: 100, load: 25, time: 0 }); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${type === t ? (t === 'CHEMICAL' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-orange-500/10 border-orange-500/40 text-orange-400') : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {t === 'CHEMICAL' ? '🧪 Químico' : '🔧 Mecánico'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Máquina</label>
              <input value={machine} onChange={e => setMachine(e.target.value)} className={inp} placeholder={isChem ? 'Spray' : 'Plancha, Grabado…'} />
            </div>
            {isChem ? (
              <>
                <div><label className="block text-xs text-slate-400 mb-1">Presión (bar)</label>
                  <input type="number" step="0.1" value={params.pressure ?? ''} onChange={e => setParams({...params, pressure: +e.target.value})} className={inp} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Velocidad (m/min)</label>
                  <input type="number" step="0.5" value={params.speed ?? ''} onChange={e => setParams({...params, speed: +e.target.value})} className={inp} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Pasadas</label>
                  <input type="number" value={params.passes ?? ''} onChange={e => setParams({...params, passes: +e.target.value})} className={inp} /></div>
              </>
            ) : (
              <>
                <div><label className="block text-xs text-slate-400 mb-1">Temp (°C)</label>
                  <input type="number" value={params.temp ?? ''} onChange={e => setParams({...params, temp: +e.target.value})} className={inp} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Carga (kg)</label>
                  <input type="number" value={params.load ?? ''} onChange={e => setParams({...params, load: +e.target.value})} className={inp} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Tiempo (min)</label>
                  <input type="number" value={params.time ?? ''} onChange={e => setParams({...params, time: +e.target.value})} className={inp} /></div>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
          <button onClick={submit} disabled={!name.trim()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Editor ────────────────────────────────────────────────────────────
export default function FormulaEditor() {
  const params   = useParams();
  const router   = useRouter();
  const rawId    = params.id as string;
  const isNew    = rawId === 'nueva';
  const editId   = isNew ? null : rawId;

  // Catalogue (Capa 1)
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);

  // Formula metadata
  const [formulaMeta, setFormulaMeta] = useState({
    name: '', article: '', colorRef: '', description: '', status: 'DRAFT',
  });

  // Grid state (matching Gemini design exactly)
  const [processes, setProcesses]           = useState<Process[]>([]);
  const [grid, setGrid]                     = useState<Grid>({});
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);
  const [isAddingChem, setIsAddingChem]     = useState(false);
  const [searchTerm, setSearchTerm]         = useState('');
  const [showAddProcess, setShowAddProcess] = useState(false);

  // UI state
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(!isNew);

  // ── Load catalogue ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/chemicals').then(r => r.json()).then((data: Array<{id: number; name: string; supplier: string|null; category: string; unit_cost: string|null}>) => {
      setCatalogue(data.map(c => ({
        id:       c.id.toString(),
        name:     c.name,
        supplier: c.supplier ?? '',
        category: c.category,
        price:    c.unit_cost ? parseFloat(c.unit_cost) : 0,
      })));
    });
  }, []);

  // ── Load existing formula ──────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    fetch(`/api/recipe/formulas/${editId}`).then(r => r.json()).then(data => {
      setFormulaMeta({
        name: data.name ?? '', article: data.article ?? '',
        colorRef: data.color_ref ?? '', description: data.description ?? '',
        status: data.status ?? 'DRAFT',
      });

      const loadedProcesses: Process[] = data.processes.map((p: {
        id: number; process_order: number; name: string; type: 'CHEMICAL'|'MECHANICAL';
        machine: string|null; pressure_bar: number|null; speed_mpm: number|null; passes: number|null;
        temperature_c: number|null; load_kg: number|null; duration_min: number|null;
      }) => ({
        id:      p.id.toString(),
        order:   p.process_order,
        name:    p.name,
        type:    p.type,
        machine: p.machine ?? (p.type === 'CHEMICAL' ? 'Spray' : 'Plancha'),
        params:  p.type === 'CHEMICAL'
          ? { pressure: p.pressure_bar ?? undefined, speed: p.speed_mpm ?? undefined, passes: p.passes ?? undefined }
          : { temp: p.temperature_c ?? undefined, load: p.load_kg ?? undefined, time: p.duration_min ?? undefined },
      }));
      setProcesses(loadedProcesses);
      setExpandedProcesses(loadedProcesses.map(p => p.id));

      const newGrid: Grid = {};
      for (const p of data.processes) {
        const procId = p.id.toString();
        for (const line of (p.lines ?? [])) {
          const chemId = line.chemical_id?.toString();
          if (!chemId) continue;
          if (!newGrid[chemId]) newGrid[chemId] = {};
          newGrid[chemId][procId] = { grams: parseFloat(line.grams) || 0, isVariable: line.is_variable };
        }
      }
      setGrid(newGrid);
      setLoading(false);
    });
  }, [editId]);

  // ── Calculations ───────────────────────────────────────────────────────
  const activeChemicalIds = Object.keys(grid);

  const processTotals = useMemo(() => {
    const totals: Record<string, { grams: number; cost: number }> = {};
    processes.forEach(p => {
      if (p.type === 'MECHANICAL') { totals[p.id] = { grams: 0, cost: 0 }; return; }
      let sumGrams = 0, sumCost = 0;
      activeChemicalIds.forEach(cId => {
        const cell = grid[cId]?.[p.id];
        if (cell && cell.grams) {
          sumGrams += Number(cell.grams);
          const price = catalogue.find(c => c.id === cId)?.price ?? 0;
          sumCost += (Number(cell.grams) / 1000) * price;
        }
      });
      totals[p.id] = { grams: sumGrams, cost: sumCost };
    });
    return totals;
  }, [grid, processes, activeChemicalIds, catalogue]);

  const totalFormulaCost = Object.values(processTotals).reduce((a, c) => a + c.cost, 0);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleCellChange = useCallback((chemId: string, procId: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    setGrid(prev => ({ ...prev, [chemId]: { ...prev[chemId], [procId]: { ...prev[chemId]?.[procId], grams: numValue as number | '' } } }));
  }, []);

  const toggleVariable = useCallback((chemId: string, procId: string) => {
    setGrid(prev => ({ ...prev, [chemId]: { ...prev[chemId], [procId]: { ...prev[chemId]?.[procId], isVariable: !prev[chemId]?.[procId]?.isVariable } } }));
  }, []);

  const addChemicalToGrid = useCallback((chem: CatalogueItem) => {
    if (!grid[chem.id]) setGrid(prev => ({ ...prev, [chem.id]: {} }));
    setIsAddingChem(false);
    setSearchTerm('');
  }, [grid]);

  const removeChemical = useCallback((chemId: string) => {
    if (!confirm('¿Remover este químico de toda la fórmula?')) return;
    setGrid(prev => { const n = { ...prev }; delete n[chemId]; return n; });
  }, []);

  const toggleProcessExpanded = useCallback((pId: string) => {
    setExpandedProcesses(prev => prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]);
  }, []);

  function addProcess(p: Omit<Process, 'id' | 'order'>) {
    const id = `new-${Date.now()}`;
    setProcesses(prev => [...prev, { ...p, id, order: prev.length + 1 }]);
    setExpandedProcesses(prev => [...prev, id]);
  }

  function removeProcess(pId: string) {
    if (!confirm('¿Eliminar este proceso?')) return;
    setProcesses(prev => prev.filter(p => p.id !== pId).map((p, i) => ({ ...p, order: i + 1 })));
    setGrid(prev => {
      const n: Grid = {};
      Object.entries(prev).forEach(([cId, procs]) => {
        const { [pId]: _removed, ...rest } = procs;
        n[cId] = rest;
      });
      return n;
    });
  }

  function updateProcess(pId: string, field: string, value: unknown) {
    setProcesses(prev => prev.map(p => {
      if (p.id !== pId) return p;
      if (field.startsWith('params.')) {
        const key = field.split('.')[1];
        return { ...p, params: { ...p.params, [key]: value } };
      }
      return { ...p, [field]: value };
    }));
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function save(newStatus?: string) {
    if (!formulaMeta.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:        formulaMeta.name,
        article:     formulaMeta.article || null,
        color_ref:   formulaMeta.colorRef || null,
        description: formulaMeta.description || null,
        status:      newStatus ?? formulaMeta.status,
        processes: processes.map((proc, pi) => ({
          process_order: pi + 1,
          name:          proc.name,
          type:          proc.type,
          machine:       proc.machine || null,
          pressure_bar:  proc.params.pressure ?? null,
          speed_mpm:     proc.params.speed ?? null,
          passes:        proc.params.passes ?? null,
          temperature_c: proc.params.temp ?? null,
          load_kg:       proc.params.load ?? null,
          duration_min:  proc.params.time ?? null,
          lines: activeChemicalIds
            .map(cId => ({ chemical_id: parseInt(cId), grams: Number(grid[cId]?.[proc.id]?.grams) || 0, is_variable: grid[cId]?.[proc.id]?.isVariable ?? false }))
            .filter(l => l.grams > 0 || l.is_variable),
        })),
      };

      const url    = editId ? `/api/recipe/formulas/${editId}` : '/api/recipe/formulas';
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();

      if (newStatus) setFormulaMeta(m => ({ ...m, status: newStatus }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (isNew) router.replace(`/lab/formulas/${result.id}`);
    } finally {
      setSaving(false);
    }
  }

  const filteredCatalogue = catalogue.filter(c =>
    !activeChemicalIds.includes(c.id) &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.supplier.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Cargando fórmula…</div>
  );

  // ── Render (Gemini design, verbatim structure) ─────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/lab/formulas" className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400"><Beaker size={24} /></div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
              <Link href="/lab/formulas" className="hover:text-indigo-400 transition-colors">Fórmulas</Link>
              <ChevronRight size={11} />
              <span className="text-slate-300">{isNew ? 'Nueva' : formulaMeta.name || '…'}</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-100 leading-tight">Serendipity Lab</h1>
            <p className="text-xs text-slate-400">Editor de Fórmula</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-slate-800">
            <span className="text-xs text-slate-400 pl-3">Costo ref:</span>
            <span className="px-3 py-1 bg-slate-800 text-emerald-400 font-mono font-medium rounded-md text-sm border border-slate-700">
              ${totalFormulaCost.toFixed(4)} / kg
            </span>
          </div>
          <button onClick={() => save()} disabled={saving || !formulaMeta.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700">
            <Save size={16} /> {saved ? '¡Guardado!' : 'Borrador'}
          </button>
          <button onClick={() => save('APPROVED')} disabled={saving || !formulaMeta.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">
            <CheckCircle2 size={16} /> Aprobar
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* METADATA */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-5">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nombre de la Fórmula *</label>
              <input type="text" value={formulaMeta.name} onChange={e => setFormulaMeta({...formulaMeta, name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Ej: Nappa Donto Negra" />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Artículo</label>
              <input type="text" value={formulaMeta.article} onChange={e => setFormulaMeta({...formulaMeta, article: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Color Ref.</label>
              <input type="text" value={formulaMeta.colorRef} onChange={e => setFormulaMeta({...formulaMeta, colorRef: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Estado</label>
              <select value={formulaMeta.status} onChange={e => setFormulaMeta({...formulaMeta, status: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 font-medium focus:outline-none focus:border-indigo-500 appearance-none">
                <option value="DRAFT">Draft 📝</option>
                <option value="APPROVED">Approved ✅</option>
                <option value="ARCHIVED">Archived 📦</option>
              </select>
            </div>
          </div>
        </section>

        {/* GRID */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-max">

              {/* PROCESS HEADERS */}
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-950 border-b border-r border-slate-800 p-0 w-80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <div className="p-4 flex items-end h-full">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingredientes / Químicos</span>
                    </div>
                  </th>

                  {processes.map(proc => {
                    const isExpanded = expandedProcesses.includes(proc.id);
                    const isChem = proc.type === 'CHEMICAL';
                    return (
                      <th key={proc.id} className="border-b border-r border-slate-800 bg-slate-900 p-0 align-top min-w-[220px] w-[260px]">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="flex items-center justify-center w-5 h-5 shrink-0 rounded-full bg-slate-800 text-xs font-bold text-slate-400">{proc.order}</span>
                            <input
                              value={proc.name}
                              onChange={e => updateProcess(proc.id, 'name', e.target.value)}
                              className="bg-transparent text-slate-200 font-semibold text-sm focus:outline-none focus:text-white min-w-0 flex-1 border-b border-transparent focus:border-indigo-500 pb-0.5 transition-colors"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isChem ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                              {isChem ? 'QUÍMICO' : 'MECÁNICO'}
                            </span>
                            <button onClick={() => removeProcess(proc.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><X size={12} /></button>
                          </div>
                        </div>
                        <div className="p-3">
                          <button onClick={() => toggleProcessExpanded(proc.id)}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full mb-2">
                            {isChem ? <Beaker size={14} /> : <Wrench size={14} />}
                            <span className="truncate">{proc.machine || 'Params'}</span>
                            {isExpanded ? <ChevronUp size={14} className="ml-auto shrink-0" /> : <ChevronDown size={14} className="ml-auto shrink-0" />}
                          </button>
                          {isExpanded && (
                            <div className="space-y-2 text-xs bg-slate-950 p-2 rounded-md border border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 w-14 shrink-0">Máquina</span>
                                <input
                                  value={proc.machine}
                                  onChange={e => updateProcess(proc.id, 'machine', e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                                />
                              </div>
                              {isChem ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-14 shrink-0">Presión</span>
                                    <input type="number" step="0.1"
                                      value={proc.params.pressure ?? ''}
                                      onChange={e => updateProcess(proc.id, 'params.pressure', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 text-xs"
                                      placeholder="bar" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-14 shrink-0">Velocidad</span>
                                    <input type="number" step="0.5"
                                      value={proc.params.speed ?? ''}
                                      onChange={e => updateProcess(proc.id, 'params.speed', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 text-xs"
                                      placeholder="m/min" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-14 shrink-0">Pasadas</span>
                                    <input type="number"
                                      value={proc.params.passes ?? ''}
                                      onChange={e => updateProcess(proc.id, 'params.passes', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 text-xs"
                                      placeholder="—" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-14 shrink-0">Temp</span>
                                    <input type="number"
                                      value={proc.params.temp ?? ''}
                                      onChange={e => updateProcess(proc.id, 'params.temp', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 text-xs"
                                      placeholder="°C" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-14 shrink-0">Carga</span>
                                    <input type="number"
                                      value={proc.params.load ?? ''}
                                      onChange={e => updateProcess(proc.id, 'params.load', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 text-xs"
                                      placeholder="kg" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 w-14 shrink-0">Tiempo</span>
                                    <input type="number"
                                      value={proc.params.time ?? ''}
                                      onChange={e => updateProcess(proc.id, 'params.time', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500 text-xs"
                                      placeholder="min" />
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  <th className="border-b border-slate-800 bg-slate-900 p-0 w-16 align-middle text-center">
                    <button onClick={() => setShowAddProcess(true)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors mx-auto" title="Agregar proceso">
                      <Plus size={20} />
                    </button>
                  </th>
                </tr>
              </thead>

              {/* CHEMICAL ROWS */}
              <tbody>
                {activeChemicalIds.length === 0 && (
                  <tr>
                    <td colSpan={processes.length + 2} className="sticky left-0 text-center py-10 text-slate-600 text-sm">
                      Agregá ingredientes usando el botón de abajo.
                    </td>
                  </tr>
                )}
                {activeChemicalIds.map(chemId => {
                  const chem = catalogue.find(c => c.id === chemId);
                  const chemName = chem?.name ?? `ID ${chemId}`;
                  const chemSupplier = chem?.supplier ?? '';
                  const chemCategory = chem?.category ?? '';
                  const chemPrice = chem?.price ?? 0;

                  return (
                    <tr key={chemId} className="group hover:bg-slate-800/30 transition-colors">
                      <th className="sticky left-0 z-20 bg-slate-950 group-hover:bg-slate-900 border-b border-r border-slate-800 p-0 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] transition-colors">
                        <div className="p-3 px-4 flex justify-between items-start">
                          <div>
                            <div className="font-medium text-slate-200">{chemName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{chemSupplier} · {chemCategory}</div>
                            <div className="text-xs text-emerald-500/80 mt-1 font-mono">${chemPrice.toFixed(2)} / kg</div>
                          </div>
                          <button onClick={() => removeChemical(chemId)}
                            className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar de la fórmula">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </th>

                      {processes.map(proc => {
                        const isMech = proc.type === 'MECHANICAL';
                        const cellData = grid[chemId]?.[proc.id];
                        const grams = cellData?.grams ?? 0;
                        const isVar = cellData?.isVariable ?? false;
                        const total = processTotals[proc.id]?.grams ?? 0;
                        const percentage = (Number(grams) > 0 && total > 0) ? ((Number(grams) / total) * 100).toFixed(1) : '0.0';
                        const cellCost = ((Number(grams) / 1000) * chemPrice).toFixed(4);

                        if (isMech) return (
                          <td key={`${chemId}-${proc.id}`} className="border-b border-r border-slate-800 p-0 align-middle text-center bg-slate-950/50">
                            <span className="text-slate-600 font-mono">—</span>
                          </td>
                        );

                        return (
                          <td key={`${chemId}-${proc.id}`} className="border-b border-r border-slate-800 p-3 align-top">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1 relative">
                                <input type="number" placeholder="0"
                                  value={cellData?.grams !== undefined ? cellData.grams : ''}
                                  onChange={e => handleCellChange(chemId, proc.id, e.target.value)}
                                  className={`w-full bg-slate-950 text-slate-200 font-mono text-sm px-3 py-2 rounded border focus:outline-none focus:ring-1 transition-all ${
                                    isVar ? 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500' : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                                  }`} />
                                {Number(grams) > 0 && (
                                  <div className="flex justify-between items-center mt-1.5 px-1">
                                    <span className="text-[10px] text-slate-400 font-mono">{percentage}%</span>
                                    <span className="text-[10px] text-emerald-400 font-mono">${cellCost}</span>
                                  </div>
                                )}
                              </div>
                              <button onClick={() => toggleVariable(chemId, proc.id)}
                                className={`p-2 rounded border transition-colors ${isVar ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-slate-900 border-slate-700 text-slate-600 hover:text-slate-400'}`}
                                title="Marcar como variable por lote">
                                <Zap size={14} />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-b border-slate-800"></td>
                    </tr>
                  );
                })}
              </tbody>

              {/* TOTALS FOOTER */}
              <tfoot className="bg-slate-900 font-mono">
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-900 border-r border-slate-800 p-4 text-right shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <span className="text-sm font-semibold text-slate-300">TOTAL PROCESO</span>
                  </th>
                  {processes.map(proc => {
                    if (proc.type === 'MECHANICAL') return <td key={proc.id} className="border-r border-slate-800 p-4 text-center text-slate-600">—</td>;
                    const totals = processTotals[proc.id] ?? { grams: 0, cost: 0 };
                    return (
                      <td key={proc.id} className="border-r border-slate-800 p-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-slate-200">{totals.grams}g</span>
                          <span className="text-emerald-400 font-medium">${totals.cost.toFixed(4)}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ADD CHEMICAL */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 sticky left-0 w-full">
            {!isAddingChem ? (
              <button onClick={() => setIsAddingChem(true)}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors p-2 rounded-lg hover:bg-indigo-500/10">
                <Plus size={16} /> Añadir ingrediente a la grilla
              </button>
            ) : (
              <div className="max-w-md bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-3">
                  <Search size={16} className="text-slate-400" />
                  <input type="text" autoFocus placeholder="Buscar químico por nombre o proveedor…"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none focus:outline-none text-sm text-slate-200" />
                  <button onClick={() => setIsAddingChem(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancelar</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredCatalogue.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      {catalogue.length === 0 ? <>Sin productos. <Link href="/lab/quimicos" className="text-indigo-400 hover:underline">Cargar catálogo</Link></> : 'No se encontraron químicos.'}
                    </p>
                  ) : filteredCatalogue.map(chem => (
                    <button key={chem.id} onClick={() => addChemicalToGrid(chem)}
                      className="w-full text-left p-2 hover:bg-slate-800 rounded-lg flex justify-between items-center group transition-colors">
                      <div>
                        <div className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">{chem.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{chem.supplier} · {chem.category}</div>
                      </div>
                      <div className="text-xs text-emerald-500 font-mono">${chem.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddProcess && <AddProcessModal onAdd={addProcess} onClose={() => setShowAddProcess(false)} />}
    </div>
  );
}
