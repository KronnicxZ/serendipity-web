'use client';

import { useState, useEffect } from 'react';
import { Plus, Beaker, FlaskConical, Copy, Trash2, ChevronRight, DollarSign, Upload, Scale } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Formula {
  id: number;
  name: string;
  article: string | null;
  color_ref: string | null;
  description: string | null;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  process_count: number;
  total_cost: number;
  updated_at: string;
}

const STATUS_STYLE = {
  DRAFT:    'bg-slate-700 text-slate-300 border-slate-600',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ARCHIVED: 'bg-slate-800 text-slate-500 border-slate-700',
};

const STATUS_LABEL = { DRAFT: 'Borrador', APPROVED: 'Aprobada', ARCHIVED: 'Archivada' };

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading]   = useState(true);
  const router = useRouter();

  async function load() {
    setLoading(true);
    const res = await fetch('/api/recipe/formulas');
    setFormulas(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function duplicate(f: Formula) {
    const res = await fetch(`/api/recipe/formulas/${f.id}`);
    const data = await res.json();
    const { id: _id, updated_at: _u, created_at: _c, ...rest } = data;
    const payload = { ...rest, name: `${data.name} (copia)`, status: 'DRAFT' };
    const created = await fetch('/api/recipe/formulas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const newF = await created.json();
    router.push(`/lab/formulas/${newF.id}`);
  }

  async function remove(f: Formula) {
    if (!confirm(`¿Eliminar "${f.name}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/recipe/formulas/${f.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400"><Beaker size={22} /></div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Fórmulas</h1>
            <p className="text-xs text-slate-500">Serendipity Lab · Recipe Designer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/lab/quimicos" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/40 rounded-lg transition-colors">
            <FlaskConical size={15} /> Catálogo
          </Link>
          <Link href="/lab/scale" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/40 rounded-lg transition-colors">
            <Scale size={15} /> Escalar
          </Link>
          <Link href="/lab/import" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/40 rounded-lg transition-colors">
            <Upload size={15} /> Importar
          </Link>
          <Link href="/lab/formulas/nueva" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nueva fórmula
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {loading && <p className="text-center text-slate-500 py-20">Cargando…</p>}

        {!loading && formulas.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 mx-auto">
              <Beaker size={32} />
            </div>
            <p className="text-slate-400">Todavía no hay fórmulas.</p>
            <Link href="/lab/formulas/nueva" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Crear primera fórmula
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {formulas.map(f => (
            <div key={f.id} className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="font-semibold text-slate-100 text-base">{f.name}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${STATUS_STYLE[f.status]}`}>
                      {STATUS_LABEL[f.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    {f.article && <span>Artículo: <span className="text-slate-400">{f.article}</span></span>}
                    {f.color_ref && <span>Color: <span className="text-slate-400">{f.color_ref}</span></span>}
                    <span>{f.process_count} proceso{f.process_count !== 1 ? 's' : ''}</span>
                    {f.description && <span className="truncate max-w-xs">{f.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-400 font-mono text-sm">
                      <DollarSign size={13} />
                      {Number(f.total_cost).toFixed(4)}
                    </div>
                    <div className="text-[10px] text-slate-600 text-right">/ kg base</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => duplicate(f)} title="Duplicar" className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"><Copy size={15} /></button>
                    <button type="button" onClick={() => remove(f)} title="Eliminar" className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"><Trash2 size={15} /></button>
                  </div>
                  <Link href={`/lab/formulas/${f.id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700">
                    Editar <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
