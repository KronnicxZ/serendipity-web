'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Beaker, Layers, Save, RefreshCw, ChevronRight, ChevronLeft,
  Plus, AlertTriangle, CheckCircle, Package, ClipboardList,
  Warehouse, ShoppingCart, Play, BoxSelect, Maximize, User
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
interface Chemical { id: number; name: string; category: string; unit: string; stock_kg: number; }
interface Formula  { id: number; code: string; name: string; layer_count: number; }
interface FormulaLayer {
  id?: number; layer_order: number; layer_type: 'CHEMICAL' | 'MECHANICAL';
  name: string; chemical_id?: number; chemical_name?: string;
  qty_per_sf?: number; pct_in_mix?: number;
  machine?: string; temperature_c?: number; passes?: number;
}
interface ProductionOrder {
  id: number; po_number: string; sf_target: number; sf_produced: number; sf_packed: number;
  status: string; article_name: string; article_code: string; formula_name: string;
  owner: string; assigned_to: string; inventory_ok: boolean | null;
}
interface PurchaseRequest {
  id: number; type: string; item_name: string; qty_needed: number; unit: string;
  qty_in_stock: number; status: string; urgency: string; po_number: string;
}
interface BatchLayer {
  layer_order: number; layer_type: string; name: string;
  chemical_id?: number; layer_id?: number;
  qty_prepared_kg: string; qty_used_kg: string;
}
interface Shortage { name: string; type: string; needed: number; available: number; unit: string; }

type Screen =
  | 'home' | 'orders' | 'order-detail'
  | 'formula-list' | 'formula-builder'
  | 'batch' | 'inventory-check' | 'packing'
  | 'purchase-requests';

// ── Helpers ────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  PENDING:     'border-l-4 border-slate-500 bg-slate-800/40 text-slate-300',
  IN_PROGRESS: 'border-l-4 border-yellow-500 bg-yellow-500/10 text-yellow-500',
  PACKING:     'border-l-4 border-blue-500 bg-blue-500/10 text-blue-400',
  COMPLETED:   'border-l-4 border-emerald-500 bg-emerald-500/10 text-emerald-400',
  CANCELLED:   'border-l-4 border-red-500 bg-red-500/10 text-red-400',
};

const STATUS_CHIP: Record<string, string> = {
  PENDING:     'bg-slate-700 text-slate-200',
  IN_PROGRESS: 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/30',
  PACKING:     'bg-blue-600/20 text-blue-400 border border-blue-400/30',
  COMPLETED:   'bg-emerald-600/20 text-emerald-400 border border-emerald-400/30',
  CANCELLED:   'bg-red-600/20 text-red-400 border border-red-400/30',
};

export default function ThanhMobile() {
  const [screen, setScreen]         = useState<Screen>('home');
  const [chemicals, setChemicals]   = useState<Chemical[]>([]);
  const [formulas, setFormulas]     = useState<Formula[]>([]);
  const [allOrders, setAllOrders]   = useState<ProductionOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
  const [purchaseReqs, setPurchaseReqs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [owner, setOwner]           = useState<'Serendipity' | 'PRARA'>('Serendipity');

  // Selected PO context
  const [selectedPO, setSelectedPO]           = useState<ProductionOrder | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<{ id: number; layers: FormulaLayer[] } | null>(null);

  // Inventory check result
  const [checkResult, setCheckResult] = useState<{ ok: boolean; shortages: Shortage[] } | null>(null);

  // Formula builder
  const [newFormulaName, setNewFormulaName] = useState('');
  const [newFormulaDesc, setNewFormulaDesc] = useState('');
  const [builderLayers, setBuilderLayers]   = useState<FormulaLayer[]>([]);

  // Batch
  const [sfProduced, setSfProduced]   = useState('');
  const [batchLayers, setBatchLayers] = useState<BatchLayer[]>([]);

  // Packing
  const [sfPacked, setSfPacked]     = useState('');
  const [packedBy, setPackedBy]     = useState('Warehouse');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, fRes, aoRes, allRes, prRes] = await Promise.all([
        fetch(`/api/chemicals?owner=${owner}`),
        fetch('/api/formulas'),
        fetch('/api/production-orders?status=PENDING,IN_PROGRESS,PACKING'),
        fetch('/api/production-orders?status=PENDING,IN_PROGRESS,PACKING,COMPLETED'),
        fetch('/api/purchase-requests?status=PENDING,APPROVED'),
      ]);
      setChemicals(await cRes.json());
      setFormulas(await fRes.json());
      setActiveOrders(await aoRes.json());
      setAllOrders(await allRes.json());
      setPurchaseReqs(await prRes.json());
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  async function loadFormulaLayers(formulaId: number) {
    const res  = await fetch(`/api/formulas/${formulaId}`);
    const data = await res.json();
    setSelectedFormula(data);
    setBatchLayers(
      data.layers
        .filter((l: FormulaLayer) => l.layer_type === 'CHEMICAL')
        .map((l: FormulaLayer) => ({
          layer_order: l.layer_order, layer_type: l.layer_type,
          name: l.name, chemical_id: l.chemical_id, layer_id: l.id,
          qty_prepared_kg: '', qty_used_kg: '',
        })),
    );
  }

  // ── Send to production ────────────────────────────────────
  async function sendToProduction(poId: number) {
    setLoading(true);
    try {
      const res    = await fetch(`/api/production-orders/${poId}/send-to-production`, { method: 'POST' });
      const result = await res.json();
      setCheckResult({ ok: result.ok, shortages: result.shortages ?? [] });
      setScreen('inventory-check');
      if (result.ok) load();
    } finally {
      setLoading(false);
    }
  }

  // ── Submit batch ──────────────────────────────────────────
  async function submitBatch() {
    if (!sfProduced) return;
    setLoading(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id:       selectedPO?.id ?? null,
          formula_id:  selectedFormula?.id ?? null,
          sf_produced: parseFloat(sfProduced),
          owner,
          layers: batchLayers.map(l => ({
            ...l,
            qty_prepared_kg: parseFloat(l.qty_prepared_kg) || null,
            qty_used_kg:     parseFloat(l.qty_used_kg) || null,
          })),
        }),
      });
      if (res.ok) {
        const batch = await res.json();
        // Auto-close batch + move PO to PACKING
        await fetch(`/api/batches`, { method: 'POST' }); // sync sheets in background
        fetch('/api/sheets/sync', { method: 'POST' }).catch(() => {});
        setSaved(true);
        setTimeout(() => { setSaved(false); setScreen('home'); load(); }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Complete packing ──────────────────────────────────────
  async function completePacking() {
    if (!sfPacked || !selectedPO) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/production-orders/${selectedPO.id}/complete-packing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sf_packed: parseFloat(sfPacked), packed_by: packedBy }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setSaved(false); setScreen('orders'); load(); }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Save formula ──────────────────────────────────────────
  async function saveFormula() {
    if (!newFormulaName || !builderLayers.length) return;
    setLoading(true);
    try {
      const res = await fetch('/api/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFormulaName, description: newFormulaDesc, layers: builderLayers }),
      });
      if (res.ok) {
        setSaved(true);
        setNewFormulaName(''); setNewFormulaDesc(''); setBuilderLayers([]);
        setTimeout(() => { setSaved(false); setScreen('formula-list'); load(); }, 1500);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Approve purchase request ───────────────────────────────
  async function approvePurchase(id: number) {
    await fetch('/api/purchase-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'APPROVED', approved_by: 'Thanh' }),
    });
    load();
  }

  function wasteInfo(layer: BatchLayer) {
    const prep = parseFloat(layer.qty_prepared_kg);
    const used = parseFloat(layer.qty_used_kg);
    if (!prep || !used || isNaN(prep) || isNaN(used)) return null;
    const waste = prep - used;
    const pct   = (waste / prep) * 100;
    return { waste: waste.toFixed(3), pct: pct.toFixed(1), alert: pct > 15 };
  }

  const btn = 'w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg active:shadow-none';
  const inputBase = 'w-full bg-slate-900 text-white rounded-2xl px-5 py-4 text-lg border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600';

  // ══════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════
  if (screen === 'home') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center justify-between border-b border-slate-800/50">
        <div>
          <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] font-black mb-1">Serendipity Lab</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Xin chào, Thanh <span className="animate-pulse">👋</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOwner(o => o === 'Serendipity' ? 'PRARA' : 'Serendipity')}
            className={`text-[10px] px-3 py-1.5 rounded-full font-black tracking-wider transition-colors shadow-sm ${owner === 'Serendipity' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}`}
          >{owner}</button>
          <button onClick={load} disabled={loading} className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-400 active:bg-slate-700 transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Activas', val: activeOrders.filter(o => o.status === 'IN_PROGRESS').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { label: 'Pendientes', val: activeOrders.filter(o => o.status === 'PENDING').length, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Compras', val: purchaseReqs.length, color: 'text-rose-400', bg: 'bg-rose-400/10', warning: true },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-3xl p-5 text-center border border-white/5 shadow-xl`}>
              <p className={`text-3xl font-black ${s.color}`}>{s.val}{s.warning && s.val > 0 ? '!' : ''}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active POs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Órdenes Activas</h2>
            <button onClick={() => setScreen('orders')} className="text-xs font-bold text-blue-400">Ver todas</button>
          </div>
          <div className="space-y-3">
            {activeOrders.slice(0, 3).map(o => (
              <div key={o.id}
                onClick={() => { setSelectedPO(o); if (o.formula_name) loadFormulaLayers(o.id); setScreen('order-detail'); }}
                className={`bg-slate-900/80 rounded-2xl p-5 flex items-center justify-between cursor-pointer border border-slate-800/50 active:bg-slate-800 transition-all shadow-lg ${STATUS_COLOR[o.status] || 'border-l-4 border-slate-700'}`}
              >
                <div className="space-y-1">
                  <p className="font-black text-lg tracking-tight">{o.po_number}</p>
                  <p className="text-sm text-slate-400 font-medium">{o.article_name || '—'} · <span className="text-slate-300 font-bold">{o.sf_target} SF</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase ${STATUS_CHIP[o.status] ?? 'bg-slate-700'}`}>
                    {o.status}
                  </span>
                  <ChevronRight size={20} className="text-slate-600" />
                </div>
              </div>
            ))}
            {activeOrders.length === 0 && (
              <div className="bg-slate-900/40 rounded-2xl p-8 border border-dashed border-slate-800 text-center">
                <p className="text-slate-500 text-sm font-medium italic">No hay órdenes activas</p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase requests alert */}
        {purchaseReqs.length > 0 && (
          <button onClick={() => setScreen('purchase-requests')}
            className="w-full bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex items-center justify-between active:scale-[0.98] transition-transform shadow-lg shadow-rose-950/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400">
                <AlertTriangle size={24} />
              </div>
              <div className="text-left space-y-1">
                <p className="font-black text-rose-100 text-lg">Solicitudes de compra</p>
                <p className="text-sm font-medium text-rose-400/80">{purchaseReqs.length} pendientes — requieren aprobación</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-rose-500/50" />
          </button>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button onClick={() => setScreen('batch')} className={`${btn} col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-950/40`}>
            <Beaker size={24} /> <span>Nuevo lote / Lô mới</span>
          </button>
          <button onClick={() => setScreen('orders')} className={`${btn} bg-slate-800 text-slate-200 border border-slate-700/50`}>
            <ClipboardList size={20} /> <span className="text-sm">Órdenes</span>
          </button>
          <button onClick={() => setScreen('formula-list')} className={`${btn} bg-slate-800 text-slate-200 border border-slate-700/50`}>
            <Layers size={20} /> <span className="text-sm">Fórmulas</span>
          </button>
          <button onClick={() => setScreen('formula-builder')} className={`${btn} col-span-2 bg-slate-900 text-emerald-400 border border-emerald-500/20`}>
            <Plus size={22} /> <span>Nueva fórmula / Công thức mới</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ALL ORDERS
  // ══════════════════════════════════════════════════════════
  if (screen === 'orders') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center gap-4 border-b border-slate-800/50">
        <button onClick={() => setScreen('home')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black">Todas las órdenes</h1>
        <button onClick={load} className="ml-auto p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-400">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {allOrders.map(o => (
          <div key={o.id}
            onClick={() => {
              setSelectedPO(o);
              if (o.formula_name) loadFormulaLayers(o.id);
              setScreen('order-detail');
            }}
            className={`bg-slate-900/80 rounded-2xl p-5 border border-slate-800/50 cursor-pointer active:bg-slate-800 transition-all shadow-lg ${STATUS_COLOR[o.status] || 'border-l-4 border-slate-700'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-lg tracking-tight">{o.po_number}</p>
              <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase ${STATUS_CHIP[o.status] ?? 'bg-slate-700'}`}>
                {o.status}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-4">{o.article_name || '—'}</p>
            <div className="grid grid-cols-2 gap-y-3 pt-4 border-t border-slate-800/50">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Objetivo</p>
                <p className="text-sm font-black text-slate-200">{o.sf_target} SF</p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Producido</p>
                <p className={`text-sm font-black ${o.sf_produced > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{o.sf_produced || 0} SF</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Propietario</p>
                <p className={`text-sm font-black ${o.owner === 'PRARA' ? 'text-orange-400' : 'text-blue-400'}`}>{o.owner}</p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Empacado</p>
                <p className={`text-sm font-black ${o.sf_packed > 0 ? 'text-blue-400' : 'text-slate-400'}`}>{o.sf_packed || 0} SF</p>
              </div>
            </div>
          </div>
        ))}
        {allOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic">
            <ClipboardList size={48} className="opacity-20 mb-4" />
            <p>Không có đơn hàng</p>
          </div>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ORDER DETAIL
  // ══════════════════════════════════════════════════════════
  if (screen === 'order-detail' && selectedPO) return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center gap-4 border-b border-slate-800/50">
        <button onClick={() => setScreen('orders')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight">{selectedPO.po_number}</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedPO.article_name} · {selectedPO.owner}</p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase ${STATUS_CHIP[selectedPO.status] ?? 'bg-slate-700'}`}>
          {selectedPO.status}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        {/* Progress Card */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Progreso de Producción</span>
              <span className="text-2xl font-black text-slate-100">
                {Math.round(((selectedPO.sf_produced || 0) / selectedPO.sf_target) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-4 p-1 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                style={{ width: `${Math.min(100, ((selectedPO.sf_produced || 0) / selectedPO.sf_target) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Target</p>
              <p className="text-base font-black text-slate-200">{selectedPO.sf_target} <span className="text-[10px] opacity-50">SF</span></p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-yellow-500/80">Hecho</p>
              <p className="text-base font-black text-yellow-500">{selectedPO.sf_produced || 0} <span className="text-[10px] opacity-50">SF</span></p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-emerald-500/80">Empacado</p>
              <p className="text-base font-black text-emerald-500">{selectedPO.sf_packed || 0} <span className="text-[10px] opacity-50">SF</span></p>
            </div>
          </div>
        </div>

        {/* Formula */}
        {selectedPO.formula_name && (
          <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800/50 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fórmula Activa</p>
              <p className="text-lg font-black text-slate-200">{selectedPO.formula_name}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
              <Layers size={24} />
            </div>
          </div>
        )}

        {/* Inventory status */}
        {selectedPO.inventory_ok !== null && (
          <div className={`rounded-3xl p-6 border flex items-center gap-4 shadow-lg transition-all ${selectedPO.inventory_ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : 'bg-rose-500/10 border-rose-500/20 text-rose-100'}`}>
            <div className={`p-3 rounded-2xl ${selectedPO.inventory_ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {selectedPO.inventory_ok ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div className="flex-1">
              <p className="font-black text-lg">{selectedPO.inventory_ok ? 'Inventario OK' : 'Falta de Stock'}</p>
              <p className={`text-xs font-medium opacity-80`}>{selectedPO.inventory_ok ? 'Todos los materiales están disponibles' : 'Se requiere aprobación de compra'}</p>
            </div>
          </div>
        )}

        {/* Actions by status */}
        <div className="space-y-4 pt-4">
          {selectedPO.status === 'PENDING' && (
            <button
              onClick={() => sendToProduction(selectedPO.id)}
              disabled={loading}
              className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-emerald-950/20 bg-gradient-to-r from-emerald-600 to-teal-500 text-white disabled:opacity-40`}
            >
              {loading ? <RefreshCw size={24} className="animate-spin" /> : <PlayCircle size={28} />}
              <span>ENVIAR A PRODUCCIÓN</span>
            </button>
          )}

          {selectedPO.status === 'IN_PROGRESS' && (
            <button
              onClick={() => {
                if (selectedFormula) setScreen('batch');
                else { loadFormulaLayers(selectedPO.id).then(() => setScreen('batch')); }
              }}
              className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-blue-950/20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white`}
            >
              <Beaker size={28} /> <span>EJECUTAR LOTE</span>
            </button>
          )}

          {selectedPO.status === 'PACKING' && (
            <button onClick={() => setScreen('packing')} className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-purple-950/20 bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white`}>
              <BoxSelect size={28} /> <span>EMPACAR Y MEDIR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // INVENTORY CHECK RESULT
  // ══════════════════════════════════════════════════════════
  if (screen === 'inventory-check') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center gap-4 border-b border-slate-800/50">
        <button onClick={() => setScreen('order-detail')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black">Kiểm tra kho / Inventario</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {checkResult?.ok ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-10 text-center space-y-6 shadow-2xl">
            <div className="p-5 bg-emerald-500/20 rounded-full w-fit mx-auto text-emerald-400">
              <CheckCircle size={64} />
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-black text-emerald-100 tracking-tight">¡Todo listo!</p>
              <p className="text-emerald-400/80 font-medium leading-relaxed text-lg">Todos los químicos y cueros están disponibles para iniciar.</p>
            </div>
            <p className="text-sm text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/5 py-3 rounded-2xl border border-emerald-500/10">La PO ya está activa</p>
          </div>
        ) : (
          <>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-[2rem] p-8 text-center space-y-4 shadow-2xl">
              <div className="p-4 bg-rose-500/20 rounded-full w-fit mx-auto text-rose-400">
                <AlertTriangle size={48} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-rose-100">Falta de stock</p>
                <p className="text-sm font-medium text-rose-400/80">Se notificó a Tuyen. La PO espera confirmación.</p>
              </div>
            </div>

            <div className="px-1 flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Materiales faltantes</h2>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700">{checkResult?.shortages.length} ítems</span>
            </div>

            <div className="space-y-4">
              {checkResult?.shortages.map((s, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <p className="font-black text-lg text-slate-200 tracking-tight">{s.name}</p>
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase ${s.type === 'CHEMICAL' ? 'bg-blue-600/20 text-blue-400 border border-blue-400/30' : 'bg-orange-600/20 text-orange-400 border border-orange-400/30'}`}>
                      {s.type === 'CHEMICAL' ? '🧪 Químico' : '🐄 Cuero'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-800/50 pt-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Necesario</p>
                      <p className="text-lg font-black text-rose-400">{s.needed.toFixed(2)} <span className="text-[10px] opacity-50 uppercase">{s.unit}</span></p>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stock</p>
                      <p className="text-lg font-black text-slate-300">{s.available.toFixed(2)} <span className="text-[10px] opacity-50 uppercase">{s.unit}</span></p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Déficit</p>
                      <p className="text-lg font-black text-rose-500">{(s.needed - s.available).toFixed(2)} <span className="text-[10px] opacity-50 uppercase">{s.unit}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setScreen('purchase-requests')} className={`${btn} bg-rose-600/10 text-rose-100 border border-rose-500/30`}>
              <ShoppingCart size={20} /> <span>Ver solicitudes de compra</span>
            </button>
          </>
        )}

        <button onClick={() => setScreen('home')} className={`${btn} bg-slate-800 text-slate-200 border border-slate-700/50`}>
          <span>Volver al inicio</span>
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // PURCHASE REQUESTS
  // ══════════════════════════════════════════════════════════
  if (screen === 'purchase-requests') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center gap-4 border-b border-slate-800/50">
        <button onClick={() => setScreen('home')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black">Solicitudes de compra</h1>
        <button onClick={load} className="ml-auto p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-400">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {purchaseReqs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic">
            <CheckCircle size={48} className="opacity-20 mb-4 text-emerald-400" />
            <p>No hay solicitudes pendientes</p>
          </div>
        )}
        {purchaseReqs.map(pr => (
          <div key={pr.id} className={`rounded-3xl p-6 border shadow-xl transition-all ${pr.urgency === 'URGENT' ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800 bg-slate-900/80'}`}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-black text-lg tracking-tight">{pr.item_name}</p>
              <div className="flex gap-2">
                {pr.urgency === 'URGENT' && <span className="text-[10px] bg-rose-600 text-white px-2.5 py-1 rounded-lg font-black tracking-wider uppercase">URGENTE</span>}
                <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase ${pr.type === 'CHEMICAL' ? 'bg-blue-600/20 text-blue-400 border border-blue-400/30' : 'bg-orange-600/20 text-orange-400 border border-orange-400/30'}`}>
                  {pr.type === 'CHEMICAL' ? '🧪' : '🐄'} {pr.type}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-4 border-t border-slate-800/50 pt-6 mb-6">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Orden</p>
                <p className="text-sm font-black text-slate-200">{pr.po_number ?? '—'}</p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">En Stock</p>
                <p className="text-sm font-black text-slate-400">{pr.qty_in_stock} <span className="text-[10px] opacity-50 uppercase">{pr.unit}</span></p>
              </div>
              <div className="space-y-0.5 col-span-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cantidad Requerida</p>
                <p className="text-xl font-black text-rose-400">{pr.qty_needed} <span className="text-xs opacity-50 uppercase">{pr.unit}</span></p>
              </div>
            </div>
            {pr.status === 'PENDING' && (
              <button
                onClick={() => approvePurchase(pr.id)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-950/20"
              >
                <CheckCircle size={20} /> <span>APROBAR COMPRA (THANH)</span>
              </button>
            )}
            {pr.status === 'APPROVED' && (
              <div className="py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                <p className="text-xs text-emerald-400 font-black tracking-widest uppercase">✓ APROBADO POR THANH</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // FORMULA LIST
  // ══════════════════════════════════════════════════════════
  if (screen === 'formula-list') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center gap-4 border-b border-slate-800/50">
        <button onClick={() => setScreen('home')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black">Fórmulas / Công thức</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {formulas.map(f => (
          <div key={f.id} className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-black text-lg tracking-tight text-slate-200">{f.name}</p>
              <p className="text-sm font-medium text-slate-500">{f.code} · <span className="text-blue-400 font-bold">{f.layer_count} pasos</span></p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-2xl text-slate-500">
              <ChevronRight size={20} />
            </div>
          </div>
        ))}
        {formulas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic">
            <Layers size={48} className="opacity-20 mb-4" />
            <p>Chưa có công thức</p>
          </div>
        )}
        <button onClick={() => setScreen('formula-builder')} className={`${btn} bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 mt-4`}>
          <Plus size={24} /> <span>Nueva fórmula</span>
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // FORMULA BUILDER
  // ══════════════════════════════════════════════════════════
  if (screen === 'formula-builder') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center gap-4 border-b border-slate-800/50">
        <button onClick={() => setScreen('formula-list')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black tracking-tight leading-tight">Nueva fórmula<br/><span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Công thức mới</span></h1>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Información General</label>
          <input value={newFormulaName} onChange={e => setNewFormulaName(e.target.value)}
            placeholder="Tên công thức / Nombre"
            className={inputBase} />
          <input value={newFormulaDesc} onChange={e => setNewFormulaDesc(e.target.value)}
            placeholder="Mô tả / Descripción (opcional)"
            className={inputBase} />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pasos ({builderLayers.length})</h2>
          </div>
          <div className="space-y-4">
            {builderLayers.map((layer, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded-[2rem] p-6 border border-slate-800 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">PASO {layer.layer_order}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase ${layer.layer_type === 'CHEMICAL' ? 'bg-blue-600/20 text-blue-400 border border-blue-400/30' : 'bg-purple-600/20 text-purple-400 border border-purple-400/30'}`}>
                      {layer.layer_type === 'CHEMICAL' ? '🧪 Químico' : '⚙️ Mecánico'}
                    </span>
                    <button onClick={() => setBuilderLayers(ls => ls.filter((_, i) => i !== idx))}
                      className="p-2 bg-rose-500/10 text-rose-500 rounded-xl active:bg-rose-500/20 transition-colors">✕</button>
                  </div>
                </div>

                {layer.layer_type === 'CHEMICAL' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Seleccionar Químico</label>
                      <select
                        value={layer.chemical_id ?? ''}
                        onChange={e => {
                          const chem = chemicals.find(c => c.id === Number(e.target.value));
                          setBuilderLayers(ls => ls.map((l, i) => i === idx
                            ? { ...l, chemical_id: chem?.id, chemical_name: chem?.name } : l));
                        }}
                        className="w-full bg-slate-800 text-white rounded-2xl px-4 py-4 text-sm border border-slate-700 outline-none focus:border-blue-500 transition-all appearance-none"
                      >
                        <option value="">— Chọn hóa chất —</option>
                        {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.category})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">% en mezcla</label>
                        <input type="number" value={layer.pct_in_mix ?? ''}
                          onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, pct_in_mix: Number(e.target.value) } : l))}
                          placeholder="100" className="w-full bg-slate-800 text-white rounded-2xl px-4 py-4 text-lg font-black border border-slate-700 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">kg / SF</label>
                        <input type="number" value={layer.qty_per_sf ?? ''}
                          onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_per_sf: Number(e.target.value) } : l))}
                          placeholder="0.010" className="w-full bg-slate-800 text-white rounded-2xl px-4 py-4 text-lg font-black border border-slate-700 outline-none" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Máquina</label>
                      <input value={layer.machine ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, machine: e.target.value } : l))}
                        placeholder="Spray" className="w-full bg-slate-800 text-white rounded-2xl px-4 py-4 font-bold border border-slate-700 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Temp °C</label>
                      <input type="number" value={layer.temperature_c ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, temperature_c: Number(e.target.value) } : l))}
                        placeholder="80" className="w-full bg-slate-800 text-white rounded-2xl px-4 py-4 font-black border border-slate-700 outline-none" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 sticky bottom-24 z-10 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A] pb-4">
            <button onClick={() => {
              const order = builderLayers.length + 1;
              setBuilderLayers(ls => [...ls, { layer_order: order, layer_type: 'CHEMICAL', name: `Hóa chất ${order}`, chemical_id: chemicals[0]?.id, chemical_name: chemicals[0]?.name, pct_in_mix: 100, qty_per_sf: 0.01 }]);
            }} className="bg-blue-600 text-white rounded-3xl py-5 font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-950/20 active:scale-95 transition-all">
              <Plus size={20} /> 🧪 QUÍMICO
            </button>
            <button onClick={() => {
              const order = builderLayers.length + 1;
              setBuilderLayers(ls => [...ls, { layer_order: order, layer_type: 'MECHANICAL', name: `Cơ học ${order}`, machine: 'Spray', passes: 1 }]);
            }} className="bg-purple-600 text-white rounded-3xl py-5 font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-purple-950/20 active:scale-95 transition-all">
              <Plus size={20} /> ⚙️ MECÁNICO
            </button>
          </div>
        </div>
      </div>
      <div className="px-6 pb-10 pt-4 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        {saved
          ? <div className="flex items-center justify-center gap-3 text-emerald-400 py-4 font-black text-lg"><CheckCircle size={28} /> GUARDADO ✓</div>
          : <button onClick={saveFormula} disabled={loading || !newFormulaName || !builderLayers.length} className="w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-emerald-950/20 bg-emerald-600 text-white disabled:opacity-40">
              {loading ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
              <span>GUARDAR FÓRMULA</span>
            </button>
        }
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // BATCH EXECUTION
  // ══════════════════════════════════════════════════════════
  if (screen === 'batch') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen(selectedPO ? 'order-detail' : 'home')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black tracking-tight leading-tight">Batch Execution<br/><span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Ejecución / Thực hiện</span></h1>
        </div>
        {selectedPO && (
          <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-2xl border border-blue-500/20 font-black text-xs tracking-widest">
            {selectedPO.po_number}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Orden de Producción</label>
          <select value={selectedPO?.id ?? ''} onChange={e => {
            const po = activeOrders.find(o => o.id === Number(e.target.value)) ?? null;
            setSelectedPO(po);
          }} className="w-full bg-slate-800 text-white rounded-3xl px-6 py-5 text-sm border border-slate-700 outline-none focus:border-blue-500 appearance-none transition-all">
            <option value="">— Sin orden —</option>
            {activeOrders.filter(o => o.status === 'IN_PROGRESS').map(o => (
              <option key={o.id} value={o.id}>{o.po_number} · {o.article_name} · {o.sf_target} SF</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Fórmula / Công thức</label>
          <select value={selectedFormula?.id ?? ''} onChange={e => { if (e.target.value) loadFormulaLayers(Number(e.target.value)); }}
            className="w-full bg-slate-800 text-white rounded-3xl px-6 py-5 text-sm border border-slate-700 outline-none focus:border-blue-500 appearance-none transition-all">
            <option value="">— Chọn công thức —</option>
            {formulas.map(f => <option key={f.id} value={f.id}>{f.name} ({f.layer_count} bước)</option>)}
          </select>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">SF Producidos</label>
          <div className="relative">
            <input type="number" inputMode="decimal" value={sfProduced} onChange={e => setSfProduced(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 text-white rounded-3xl px-6 py-6 text-3xl font-black border border-slate-800 outline-none focus:border-blue-500 transition-all placeholder-slate-800" />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">SF</span>
          </div>
        </div>

        {batchLayers.length > 0 && (
          <div className="space-y-6 pt-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Cantidades reales / Lượng thực tế</h2>
            <div className="space-y-6">
              {batchLayers.map((layer, idx) => {
                const w = wasteInfo(layer);
                return (
                  <div key={idx} className={`bg-slate-900/50 rounded-[2.5rem] p-8 border shadow-xl space-y-6 transition-all ${w?.alert ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-black text-lg tracking-tight text-slate-200">{layer.name}</p>
                      {w?.alert && <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-1"><AlertTriangle size={12} /> ALERTA {w.pct}%</span>}
                      {w && !w.alert && <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">✓ {w.pct}%</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Preparado (kg)</label>
                        <input type="number" inputMode="decimal" value={layer.qty_prepared_kg}
                          onChange={e => setBatchLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_prepared_kg: e.target.value } : l))}
                          placeholder="0.00" className="w-full bg-slate-950 text-white rounded-2xl px-5 py-5 text-xl font-black border-2 border-slate-800 outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Usado (kg)</label>
                        <input type="number" inputMode="decimal" value={layer.qty_used_kg}
                          onChange={e => setBatchLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_used_kg: e.target.value } : l))}
                          placeholder="0.00" className="w-full bg-slate-950 text-white rounded-2xl px-5 py-5 text-xl font-black border-2 border-slate-800 outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    {w && <p className={`text-[10px] font-bold tracking-widest uppercase text-center px-4 py-2 rounded-xl ${w.alert ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>Hao hụt: {w.waste} kg ({w.pct}%)</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-10 pt-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50 rounded-t-[3rem] z-20">
        {saved
          ? <div className="flex items-center justify-center gap-3 text-emerald-400 py-4 font-black text-lg"><CheckCircle size={28} /> GUARDADO ✓</div>
          : <button onClick={submitBatch} disabled={loading || !sfProduced} className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl ${loading || !sfProduced ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20'}`}>
              {loading ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
              <span>GUARDAR LOTE</span>
            </button>
        }
      </div>
    </div>
  );

  if (screen === 'packing') return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 flex flex-col font-sans tracking-tight">
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-6 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen('order-detail')} className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black tracking-tight leading-tight">Medición & Empaque<br/><span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Đo & Đóng gói</span></h1>
        </div>
        {selectedPO && (
          <div className="bg-purple-500/10 text-purple-400 px-4 py-2 rounded-2xl border border-purple-500/20 font-black text-xs tracking-widest">
            {selectedPO.po_number}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32">
        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[80px] rounded-full"></div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Artículo / Mặt hàng</span>
              <span className="font-black text-slate-200">{selectedPO?.article_name ?? '—'}</span>
            </div>
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Producido / Đã sản xuất</p>
                <p className="text-4xl font-black tracking-tighter text-purple-400">{selectedPO?.sf_produced ?? 0} <span className="text-sm text-slate-500">SF</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <Maximize size={14} className="text-purple-500" /> SF Reales Empacados / SF thực tế
            </label>
            <div className="relative">
              <input type="number" inputMode="decimal" value={sfPacked} onChange={e => setSfPacked(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-900 text-white rounded-3xl px-6 py-6 text-4xl font-black border border-slate-800 outline-none focus:border-purple-500 transition-all placeholder-slate-800" />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">SF</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <User size={14} className="text-purple-500" /> Empacado por / Người đóng gói
            </label>
            <input value={packedBy} onChange={e => setPackedBy(e.target.value)}
              placeholder="Nombre"
              className={inputBase} />
          </div>

          {sfPacked && selectedPO?.sf_produced && (
            <div className={`rounded-[2rem] p-6 border transition-all ${Math.abs(parseFloat(sfPacked) - selectedPO.sf_produced) / selectedPO.sf_produced > 0.05 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${Math.abs(parseFloat(sfPacked) - selectedPO.sf_produced) / selectedPO.sf_produced > 0.05 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {Math.abs(parseFloat(sfPacked) - selectedPO.sf_produced) / selectedPO.sf_produced > 0.05 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Diferencia de Medición</p>
                  <p className={`text-lg font-black ${(parseFloat(sfPacked) - selectedPO.sf_produced) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(parseFloat(sfPacked) - (selectedPO?.sf_produced ?? 0)).toFixed(1)} SF
                    <span className="text-sm ml-2 opacity-60">({(((parseFloat(sfPacked) - (selectedPO?.sf_produced ?? 0)) / (selectedPO?.sf_produced ?? 1)) * 100).toFixed(1)}%)</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-10 pt-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50 rounded-t-[3rem] z-20">
        {saved
          ? <div className="flex items-center justify-center gap-3 text-emerald-400 py-4 font-black text-lg"><CheckCircle size={28} /> PO CERRADA ✓</div>
          : <button onClick={completePacking} disabled={loading || !sfPacked} className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl ${loading || !sfPacked ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-purple-500/20'}`}>
              {loading ? <RefreshCw size={24} className="animate-spin" /> : <Warehouse size={24} />}
              <span>CONFIRMAR EMPAQUE</span>
            </button>
        }
      </div>
    </div>
  );
}
