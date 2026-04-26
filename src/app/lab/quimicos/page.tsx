'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, X, Check, FlaskConical, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Chemical {
  id: number;
  name: string;
  category: string;
  supplier: string | null;
  unit: string;
  unit_cost: number | null;
  stock_kg: number;
  min_stock: number;
  notes: string | null;
  active: boolean;
}

const CATEGORIES = ['Base', 'Pigmento', 'Anilina', 'Ligante', 'Acabado', 'Penetrante', 'Solvente', 'Caseína', 'PU', 'Alcohol', 'Cera', 'Otro'];
const EMPTY: Omit<Chemical, 'id' | 'active'> = { name: '', category: 'Solvente', supplier: '', unit: 'kg', unit_cost: null, stock_kg: 0, min_stock: 0, notes: '' };

export default function QuimicosPage() {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [supplier, setSupplier]   = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Chemical | null>(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/chemicals');
    setChemicals(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const suppliers = useMemo(() => {
    const s = new Set(chemicals.map(c => c.supplier).filter(Boolean) as string[]);
    return ['Todos', ...Array.from(s).sort()];
  }, [chemicals]);

  const filtered = useMemo(() => chemicals.filter(c => {
    const matchSupplier = supplier === 'Todos' || c.supplier === supplier;
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.supplier ?? '').toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    return matchSupplier && matchSearch;
  }), [chemicals, supplier, search]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(c: Chemical) {
    setEditing(c);
    setForm({ name: c.name, category: c.category, supplier: c.supplier ?? '', unit: c.unit, unit_cost: c.unit_cost, stock_kg: c.stock_kg, min_stock: c.min_stock, notes: c.notes ?? '' });
    setShowModal(true);
  }

  async function save() {
    if (!form.name || !form.category) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/chemicals/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await fetch('/api/chemicals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Chemical) {
    if (!confirm(`¿Eliminar "${c.name}"?`)) return;
    await fetch(`/api/chemicals/${c.id}`, { method: 'DELETE' });
    await load();
  }

  const inp = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400"><FlaskConical size={22} /></div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <Link href="/lab/formulas" className="hover:text-indigo-400 transition-colors">Fórmulas</Link>
              <ChevronRight size={12} />
              <span className="text-slate-300">Catálogo de Químicos</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-100">Catálogo de Químicos</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{chemicals.length} productos</span>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, proveedor, categoría…"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {suppliers.map(s => (
              <button key={s} onClick={() => setSupplier(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  supplier === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-40">Proveedor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Categoría</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-32">USD / kg</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-28">Stock kg</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Cargando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                  {chemicals.length === 0 ? 'Sin productos todavía — agregá el primero.' : 'Sin resultados para esta búsqueda.'}
                </td></tr>
              )}
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors group ${i % 2 === 0 ? '' : 'bg-slate-900/50'}`}>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded">{c.supplier || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-slate-200">{c.name}</span>
                    {c.notes && <span className="ml-2 text-xs text-slate-500">{c.notes}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">{c.category}</td>
                  <td className="px-5 py-3.5 text-right font-mono">
                    {c.unit_cost != null
                      ? <span className="text-emerald-400">${Number(c.unit_cost).toFixed(2)}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono">
                    <span className={Number(c.stock_kg) <= Number(c.min_stock) && Number(c.min_stock) > 0 ? 'text-red-400' : 'text-slate-300'}>
                      {Number(c.stock_kg).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => remove(c)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-slate-100">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Nombre *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} placeholder="Ej: Lustral UT" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Proveedor</label>
                  <input value={form.supplier ?? ''} onChange={e => setForm({...form, supplier: e.target.value})} className={inp} placeholder="ALPA, STAHL, TFL…" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Categoría *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inp + ' appearance-none'}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Precio USD / kg</label>
                  <input type="number" step="0.01" value={form.unit_cost ?? ''} onChange={e => setForm({...form, unit_cost: e.target.value ? Number(e.target.value) : null})} className={inp} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Stock actual (kg)</label>
                  <input type="number" step="0.1" value={form.stock_kg} onChange={e => setForm({...form, stock_kg: Number(e.target.value)})} className={inp} placeholder="0.0" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Notas</label>
                  <input value={form.notes ?? ''} onChange={e => setForm({...form, notes: e.target.value})} className={inp} placeholder="Código de proveedor, observaciones…" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving || !form.name} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <Check size={16} /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
