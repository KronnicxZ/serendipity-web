'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ArrowLeft, ChevronRight, Zap, Package, DollarSign,
  RefreshCw, Check, X, ScanFace, Database, Save,
} from 'lucide-react';
import Link from 'next/link';

// ── Shared ─────────────────────────────────────────────────────────────────

function DropZone({ accept, label, onFile, loading }: {
  accept: string; label: string; onFile: (f: File) => void; loading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (f: File | null) => { if (f) onFile(f); };
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    handle(e.dataTransfer.files[0] ?? null);
  }, []);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${
        drag ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-950'
      } ${loading ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => handle(e.target.files?.[0] ?? null)} />
      {loading
        ? <Loader2 size={32} className="animate-spin text-indigo-400 mx-auto mb-3" />
        : <Upload size={32} className="text-slate-500 mx-auto mb-3" />}
      <p className="text-slate-300 font-medium">{loading ? 'Procesando…' : label}</p>
      <p className="text-xs text-slate-600 mt-1">{loading ? 'Esto puede tardar unos segundos' : 'Click o arrastrá el archivo'}</p>
    </div>
  );
}

// ── Motor A — Invoice Scanner ───────────────────────────────────────────────

type ScanStep = 'UPLOAD' | 'ANALYZING' | 'REVIEW' | 'SUCCESS';

interface InvoiceItem {
  name: string;
  supplier: string | null;
  unit_cost_usd: number | null;
  quantity_kg: number | null;
  invoice_number: string | null;
  status: 'MATCH' | 'FUZZY' | 'NEW';
  chemical_id: number | null;
  current_cost: number | null;
  matched_name: string | null;
  confidence: number;
  _accepted?: boolean;
  _override_cost?: string;
  _category?: string;
}

interface InvoiceMeta { supplier: string | null; invoiceNumber: string | null; total: number; matched: number; fuzzy: number; new: number; }

const STATUS_BADGE = {
  MATCH: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FUZZY: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  NEW:   'bg-blue-500/10   text-blue-400   border-blue-500/20',
};
const STATUS_ICON = {
  MATCH: <CheckCircle2 size={12} />,
  FUZZY: <AlertTriangle size={12} />,
  NEW:   <Database size={12} />,
};
const STATUS_LABEL = { MATCH: 'Existente', FUZZY: 'Probable', NEW: 'Nuevo químico' };

function InvoiceScanner() {
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [step, setStep]                 = useState<ScanStep>('UPLOAD');
  const [fileName, setFileName]         = useState('');
  const [items, setItems]               = useState<InvoiceItem[]>([]);
  const [meta, setMeta]                 = useState<InvoiceMeta | null>(null);
  const [commitResult, setCommitResult] = useState<{ updated: number; created: number } | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);

  function reset() { setStep('UPLOAD'); setItems([]); setMeta(null); setError(null); setCommitResult(null); setFileName(''); }

  async function handleFile(file: File) {
    setFileName(file.name);
    setStep('ANALYZING');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/lab/import/invoice', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error procesando la factura'); setStep('UPLOAD'); return; }

      const loaded: InvoiceItem[] = data.items.map((i: InvoiceItem) => ({
        ...i,
        _accepted:      i.status !== 'NEW',   // MATCH y FUZZY pre-aceptados, NEW requiere acción
        _override_cost: i.unit_cost_usd?.toString() ?? '',
      }));
      setItems(loaded);

      const firstWithInvoice = data.items.find((i: InvoiceItem) => i.invoice_number);
      const firstWithSupplier = data.items.find((i: InvoiceItem) => i.supplier);
      setMeta({
        supplier:      firstWithSupplier?.supplier ?? null,
        invoiceNumber: firstWithInvoice?.invoice_number ?? null,
        total:   data.total,
        matched: data.matched,
        fuzzy:   data.fuzzy,
        new:     data.new,
      });
      setStep('REVIEW');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
      setStep('UPLOAD');
    }
  }

  function toggle(idx: number, field: keyof InvoiceItem, value: unknown) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  async function commit() {
    setSaving(true);
    try {
      const payload = items
        .filter(i => i._accepted !== false)
        .map(i => ({
          chemical_id:    i.chemical_id,
          name:           i.name,
          supplier:       i.supplier,
          unit_cost_usd:  parseFloat(i._override_cost ?? '') || i.unit_cost_usd,
          quantity_kg:    i.quantity_kg,
          invoice_number: i.invoice_number,
          notes:          null,
          category:       i._category ?? 'Otro',
        }));
      const res  = await fetch('/api/lab/import/invoice/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: payload }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setCommitResult({ updated: data.updated, created: data.created });
      setStep('SUCCESS');
    } finally { setSaving(false); }
  }

  const accepted = items.filter(i => i._accepted !== false).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      {/* Panel header */}
      <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400"><ScanFace size={20} /></div>
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">Escáner de Facturas — Claude AI</h2>
            <p className="text-xs text-slate-500">Extrae precios, cruza con catálogo, pedís confirmación antes de guardar</p>
          </div>
        </div>
        {step !== 'UPLOAD' && (
          <button type="button" onClick={reset} aria-label="Cancelar y volver al inicio" className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        )}
      </div>

      <div className="p-6">

        {/* STEP: UPLOAD */}
        {step === 'UPLOAD' && (
          <>
            <input ref={fileRef} type="file" accept=".pdf" aria-label="Seleccionar factura PDF" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm mb-4">
                <XCircle size={16} /> {error}
              </div>
            )}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all select-none"
            >
              <div className="bg-slate-800 p-4 rounded-full inline-flex text-indigo-400 mb-4">
                <Upload size={28} />
              </div>
              <h3 className="text-base font-medium text-slate-200 mb-1">Subir factura del proveedor (PDF)</h3>
              <p className="text-sm text-slate-500">Claude extrae los productos y precios automáticamente</p>
            </div>
          </>
        )}

        {/* STEP: ANALYZING */}
        {step === 'ANALYZING' && (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
              <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
              <ScanFace className="absolute inset-0 m-auto text-indigo-400" size={26} />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-slate-200 animate-pulse">Analizando con Claude Vision…</p>
              <p className="text-sm text-slate-500 mt-1">{fileName}</p>
              <p className="text-xs text-slate-600 mt-2">Identificando químicos, proveedores y precios unitarios</p>
            </div>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === 'REVIEW' && meta && (
          <div className="space-y-5">

            {/* Metadata card */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 bg-slate-950 px-5 py-4 rounded-xl border border-slate-800 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <FileText size={15} />
                <span className="text-slate-400 font-medium truncate max-w-[200px]">{fileName}</span>
              </div>
              {meta.supplier && (
                <div><span className="text-slate-600 text-xs uppercase tracking-wider mr-1.5">Proveedor</span>
                  <span className="text-indigo-400 font-medium">{meta.supplier}</span></div>
              )}
              {meta.invoiceNumber && (
                <div><span className="text-slate-600 text-xs uppercase tracking-wider mr-1.5">Nº Factura</span>
                  <span className="font-mono text-slate-300">{meta.invoiceNumber}</span></div>
              )}
              <div className="ml-auto flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-mono">{meta.matched} exactos</span>
                <span className="text-amber-400 font-mono">{meta.fuzzy} probables</span>
                <span className="text-blue-400 font-mono">{meta.new} nuevos</span>
              </div>
            </div>

            {/* Items table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={13} /> Ítems extraídos y matching
                </span>
                <span className="text-xs text-slate-600">{accepted} de {items.length} seleccionados</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="w-8 p-3" aria-label="Seleccionar"></th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre en PDF</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Matching catálogo</th>
                    <th className="p-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-36">Precio USD/kg</th>
                    <th className="p-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-32">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-slate-900/40 transition-colors ${item._accepted === false ? 'opacity-35' : ''}`}>
                      <td className="p-3 text-center">
                        <button type="button"
                          onClick={() => toggle(idx, '_accepted', !item._accepted)}
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                            item._accepted !== false ? 'bg-indigo-600 border-indigo-500' : 'bg-transparent border-slate-600'
                          }`}>
                          {item._accepted !== false && <Check size={10} />}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500">{item.name}</td>
                      <td className="p-3">
                        {item.status === 'NEW' ? (
                          <input
                            value={item._category ?? ''}
                            onChange={e => toggle(idx, '_category', e.target.value)}
                            placeholder="Categoría del nuevo químico…"
                            className="w-full bg-slate-900 border border-amber-500/40 rounded px-2 py-1 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                          />
                        ) : (
                          <div>
                            <span className="font-medium text-slate-200">{item.matched_name}</span>
                            {item.current_cost != null && (
                              <span className="ml-2 text-xs text-slate-600 font-mono">actual ${Number(item.current_cost).toFixed(4)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-600 text-xs">$</span>
                          <input type="number" step="0.0001"
                            value={item._override_cost ?? ''}
                            onChange={e => toggle(idx, '_override_cost', e.target.value)}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono focus:outline-none focus:border-indigo-500 text-right"
                            placeholder="0.0000" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[item.status]}`}>
                          {STATUS_ICON[item.status]} {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                <XCircle size={16} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button type="button" onClick={reset}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={commit} disabled={saving || accepted === 0}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Guardando…' : `Confirmar ${accepted} producto${accepted !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === 'SUCCESS' && commitResult && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="bg-emerald-500/20 p-4 rounded-full text-emerald-400">
              <CheckCircle2 size={44} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-200">¡Precios actualizados!</h3>
              <p className="text-sm text-slate-500 mt-2">
                {commitResult.updated > 0 && <span>{commitResult.updated} precio{commitResult.updated !== 1 ? 's' : ''} actualizados. </span>}
                {commitResult.created > 0 && <span>{commitResult.created} químico{commitResult.created !== 1 ? 's' : ''} nuevos creados. </span>}
              </p>
              <p className="text-xs text-slate-600 mt-1">Registro guardado en <code className="text-slate-500">chemical_price_history</code></p>
            </div>
            <button type="button" onClick={reset}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors">
              <RefreshCw size={14} /> Cargar otra factura
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Motor B — Formula CSV Importer ─────────────────────────────────────────

interface FormulaPreviewLine { chemical_name: string; chemical_id: number | null; grams: number; found: boolean; }
interface FormulaPreviewProcess { order: number; name: string; type: string; machine: string | null; lines: FormulaPreviewLine[]; }
interface FormulaPreview { name: string; article: string | null; color: string | null; processes: FormulaPreviewProcess[]; }
interface ValidationError { row: number; message: string; }

function FormulaImporter() {
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState<FormulaPreview[] | null>(null);
  const [errors, setErrors]     = useState<ValidationError[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState<{ count: number } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true); setPreview(null); setErrors([]); setSaved(null); setApiError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/lab/import/formula', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error); return; }
      setPreview(data.preview);
      setErrors(data.errors ?? []);
    } finally { setLoading(false); }
  }

  async function commit() {
    if (!preview) return;
    setSaving(true); setApiError(null);
    try {
      const fd = new FormData();
      // Re-send the same preview as commit — but we need the original file.
      // Instead use commit=true flag via a separate call with the parsed data.
      // Actually we call the same endpoint with commit=true, but we already parsed.
      // Better: POST with commit flag. Backend will re-parse from scratch.
      // Since we can't re-use the file here, we send the preview directly.
      const res = await fetch('/api/lab/import/formula?commit=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error); return; }
      setSaved({ count: data.count });
    } finally { setSaving(false); }
  }

  const hasErrors = errors.length > 0;
  const blockers  = errors.filter(e => !e.message.includes('no encontrado')).length; // unfound chemicals are warnings

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-1">Importar Fórmulas desde CSV</h2>
        <p className="text-sm text-slate-500">Subí un CSV con las fórmulas existentes. Se hace una previsualización completa antes de guardar.</p>
      </div>

      {/* Template download hint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 font-mono space-y-1">
        <p className="text-slate-500 mb-2 font-sans text-xs font-medium uppercase tracking-wider">Formato esperado del CSV:</p>
        <p>Formula_Name, Article, Color, Process_Order, Process_Name, Process_Type, Machine, Chemical_Name, Grams</p>
        <p className="text-slate-600">Nappa Donto Negra, NAD, NEGRO, 1, Fondo, CHEMICAL, Spray, Ligante TFL, 120</p>
        <p className="text-slate-600">Nappa Donto Negra, NAD, NEGRO, 1, Fondo, CHEMICAL, Spray, Penetrante, 50</p>
        <p className="text-slate-600">Nappa Donto Negra, NAD, NEGRO, 2, Plancha, MECHANICAL, Plancha HD, ,</p>
      </div>

      <DropZone accept=".csv,.txt" label="Subí el archivo CSV con las fórmulas" onFile={handleFile} loading={loading} />

      {apiError && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          <XCircle size={18} /> {apiError}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm">
          <CheckCircle2 size={18} /> {saved.count} fórmula{saved.count !== 1 ? 's' : ''} importada{saved.count !== 1 ? 's' : ''} correctamente.
          <Link href="/lab/formulas" className="ml-auto text-indigo-400 hover:underline">Ver fórmulas →</Link>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
            <AlertTriangle size={16} /> {errors.length} advertencia{errors.length !== 1 ? 's' : ''}
          </div>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-amber-300/80 font-mono">Fila {e.row}: {e.message}</p>
          ))}
        </div>
      )}

      {preview && (
        <>
          <div className="space-y-3">
            {preview.map((f, fi) => (
              <div key={fi} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-indigo-400" />
                    <span className="font-semibold text-slate-200">{f.name}</span>
                    {f.article && <span className="text-xs text-slate-500">Artículo: {f.article}</span>}
                    {f.color   && <span className="text-xs text-slate-500">Color: {f.color}</span>}
                  </div>
                  <span className="text-xs text-slate-500">{f.processes.length} proceso{f.processes.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {f.processes.map((p, pi) => (
                    <div key={pi} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">{p.order}</span>
                        <span className="text-sm font-medium text-slate-300">{p.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.type === 'CHEMICAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{p.type}</span>
                        {p.machine && <span className="text-xs text-slate-500">{p.machine}</span>}
                      </div>
                      {p.lines.length > 0 && (
                        <div className="pl-6 space-y-1">
                          {p.lines.map((l, li) => (
                            <div key={li} className="flex items-center gap-3 text-xs">
                              {l.found
                                ? <Check size={12} className="text-emerald-400 shrink-0" />
                                : <X    size={12} className="text-red-400 shrink-0" />}
                              <span className={l.found ? 'text-slate-300' : 'text-red-400'}>{l.chemical_name}</span>
                              <span className="text-slate-600 font-mono">{l.grams}g</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => { setPreview(null); setErrors([]); setSaved(null); }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition-colors">
              <RefreshCw size={14} /> Nuevo archivo
            </button>
            <button onClick={commit} disabled={saving || hasErrors && blockers > 0}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Importando…' : `Importar ${preview.length} fórmula${preview.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [tab, setTab] = useState<'invoice' | 'formula'>('invoice');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/lab/formulas" className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
            <Link href="/lab/formulas" className="hover:text-indigo-400 transition-colors">Lab</Link>
            <ChevronRight size={11} />
            <span className="text-slate-300">Importación</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-100">Importar Datos</h1>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {([
            { id: 'invoice', label: 'Facturas de Químicos', icon: FileText },
            { id: 'formula', label: 'Fórmulas CSV',         icon: Zap },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'invoice' ? <InvoiceScanner /> : <FormulaImporter />}
      </main>
    </div>
  );
}
