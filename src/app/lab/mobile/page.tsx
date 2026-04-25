'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Beaker, Layers, Save, RefreshCw, ChevronRight, ChevronLeft,
  Plus, AlertTriangle, CheckCircle, Package, ClipboardList,
  Warehouse, ShoppingCart, PlayCircle, BoxSelect,
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
  PENDING:     'bg-gray-700 text-gray-200',
  IN_PROGRESS: 'bg-yellow-800 text-yellow-200',
  PACKING:     'bg-blue-800 text-blue-200',
  COMPLETED:   'bg-green-800 text-green-200',
  CANCELLED:   'bg-red-900 text-red-200',
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

  const btn = 'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform';

  // ══════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════
  if (screen === 'home') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Serendipity Lab</p>
          <h1 className="text-xl font-bold">Xin chào, Thanh 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOwner(o => o === 'Serendipity' ? 'PRARA' : 'Serendipity')}
            className={`text-xs px-3 py-1 rounded-full font-bold ${owner === 'Serendipity' ? 'bg-blue-700' : 'bg-orange-700'}`}
          >{owner}</button>
          <button onClick={load} disabled={loading} className="p-2 text-gray-400">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activas', val: activeOrders.filter(o => o.status === 'IN_PROGRESS').length, color: 'text-yellow-400' },
            { label: 'Pendientes', val: activeOrders.filter(o => o.status === 'PENDING').length, color: 'text-gray-300' },
            { label: 'Compras ⚠️', val: purchaseReqs.length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active POs */}
        {activeOrders.slice(0, 3).map(o => (
          <div key={o.id}
            onClick={() => { setSelectedPO(o); if (o.formula_name) loadFormulaLayers(o.id); setScreen('order-detail'); }}
            className="bg-gray-800 rounded-xl p-4 flex items-center justify-between cursor-pointer border border-gray-700 active:bg-gray-700"
          >
            <div>
              <p className="font-bold">{o.po_number}</p>
              <p className="text-sm text-gray-400">{o.article_name || '—'} · {o.sf_target} SF</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[o.status] ?? 'bg-gray-700'}`}>
                {o.status}
              </span>
              <ChevronRight size={16} className="text-gray-500" />
            </div>
          </div>
        ))}

        {/* Purchase requests alert */}
        {purchaseReqs.length > 0 && (
          <button onClick={() => setScreen('purchase-requests')}
            className="w-full bg-red-950 border border-red-800 rounded-xl p-4 flex items-center justify-between active:bg-red-900">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400" />
              <div className="text-left">
                <p className="font-bold text-red-200">Solicitudes de compra</p>
                <p className="text-xs text-red-400">{purchaseReqs.length} pendientes — requieren aprobación</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-red-500" />
          </button>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-1">
          <button onClick={() => setScreen('orders')} className={`${btn} bg-gray-700 text-white`}>
            <ClipboardList size={22} /> Todas las órdenes
          </button>
          <button onClick={() => setScreen('batch')} className={`${btn} bg-blue-700 text-white`}>
            <Beaker size={22} /> Nuevo lote / Lô mới
          </button>
          <button onClick={() => setScreen('formula-list')} className={`${btn} bg-gray-700 text-white`}>
            <Layers size={22} /> Fórmulas / Công thức
          </button>
          <button onClick={() => setScreen('formula-builder')} className={`${btn} bg-emerald-800 text-white`}>
            <Plus size={22} /> Nueva fórmula
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ALL ORDERS
  // ══════════════════════════════════════════════════════════
  if (screen === 'orders') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('home')} className="p-1"><ChevronLeft size={22} /></button>
        <h1 className="text-xl font-bold">Todas las órdenes</h1>
        <button onClick={load} className="ml-auto p-2 text-gray-400">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {allOrders.map(o => (
          <div key={o.id}
            onClick={() => {
              setSelectedPO(o);
              if (o.formula_name) loadFormulaLayers(o.id);
              setScreen('order-detail');
            }}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 cursor-pointer active:bg-gray-700"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold">{o.po_number}</p>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[o.status] ?? 'bg-gray-700'}`}>
                {o.status}
              </span>
            </div>
            <p className="text-sm text-gray-300">{o.article_name || '—'}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>Target: {o.sf_target} SF</span>
              {o.sf_produced > 0 && <span className="text-green-400">Produced: {o.sf_produced} SF</span>}
              {o.sf_packed > 0   && <span className="text-blue-400">Packed: {o.sf_packed} SF</span>}
              <span className={o.owner === 'PRARA' ? 'text-orange-400' : 'text-blue-400'}>{o.owner}</span>
            </div>
          </div>
        ))}
        {allOrders.length === 0 && (
          <p className="text-gray-500 text-center py-10 text-sm">Không có đơn hàng</p>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ORDER DETAIL
  // ══════════════════════════════════════════════════════════
  if (screen === 'order-detail' && selectedPO) return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('orders')} className="p-1"><ChevronLeft size={22} /></button>
        <div>
          <h1 className="text-xl font-bold">{selectedPO.po_number}</h1>
          <p className="text-xs text-gray-400">{selectedPO.article_name} · {selectedPO.owner}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[selectedPO.status] ?? 'bg-gray-700'}`}>
          {selectedPO.status}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Progress */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Target</span>
            <span className="font-bold">{selectedPO.sf_target} SF</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Producido</span>
            <span className="font-bold text-yellow-400">{selectedPO.sf_produced || 0} SF</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Empacado</span>
            <span className="font-bold text-green-400">{selectedPO.sf_packed || 0} SF</span>
          </div>
          {selectedPO.sf_target > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((selectedPO.sf_produced || 0) / selectedPO.sf_target) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Formula */}
        {selectedPO.formula_name && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Fórmula</p>
            <p className="font-bold">{selectedPO.formula_name}</p>
          </div>
        )}

        {/* Inventory status */}
        {selectedPO.inventory_ok !== null && (
          <div className={`rounded-xl p-4 border flex items-center gap-3 ${selectedPO.inventory_ok ? 'bg-green-950 border-green-800' : 'bg-red-950 border-red-800'}`}>
            {selectedPO.inventory_ok
              ? <><CheckCircle size={20} className="text-green-400" /><span className="text-green-200 font-bold">Inventario confirmado ✓</span></>
              : <><AlertTriangle size={20} className="text-red-400" /><span className="text-red-200 font-bold">Falta de stock — ver compras</span></>
            }
          </div>
        )}

        {/* Actions by status */}
        <div className="space-y-3">
          {selectedPO.status === 'PENDING' && (
            <button
              onClick={() => sendToProduction(selectedPO.id)}
              disabled={loading}
              className={`${btn} bg-green-700 text-white disabled:opacity-40`}
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <PlayCircle size={22} />}
              Enviar a producción
            </button>
          )}

          {selectedPO.status === 'IN_PROGRESS' && (
            <button
              onClick={() => {
                if (selectedFormula) setScreen('batch');
                else { loadFormulaLayers(selectedPO.id).then(() => setScreen('batch')); }
              }}
              className={`${btn} bg-blue-700 text-white`}
            >
              <Beaker size={22} /> Ejecutar lote
            </button>
          )}

          {selectedPO.status === 'PACKING' && (
            <button onClick={() => setScreen('packing')} className={`${btn} bg-purple-700 text-white`}>
              <BoxSelect size={22} /> Empacar y medir
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('order-detail')} className="p-1"><ChevronLeft size={22} /></button>
        <h1 className="text-xl font-bold">Kiểm tra kho / Inventario</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {checkResult?.ok ? (
          <div className="bg-green-950 border border-green-700 rounded-xl p-6 text-center space-y-3">
            <CheckCircle size={48} className="text-green-400 mx-auto" />
            <p className="text-2xl font-bold text-green-300">¡Todo listo!</p>
            <p className="text-green-400">Todos los químicos y cueros están disponibles.</p>
            <p className="text-sm text-green-500">La PO ya está activa — Thanh puede comenzar el lote.</p>
          </div>
        ) : (
          <>
            <div className="bg-red-950 border border-red-700 rounded-xl p-5 text-center">
              <AlertTriangle size={40} className="text-red-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-red-300">Falta de stock</p>
              <p className="text-sm text-red-400 mt-1">Se notificó a Tuyen. La PO espera confirmación.</p>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-widest">Materiales faltantes</p>

            {checkResult?.shortages.map((s, i) => (
              <div key={i} className="bg-gray-800 border border-red-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">{s.name}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${s.type === 'CHEMICAL' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'}`}>
                    {s.type === 'CHEMICAL' ? '🧪 Químico' : '🐄 Cuero'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Necesario</p>
                    <p className="font-bold text-red-300">{s.needed.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{s.unit}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Disponible</p>
                    <p className="font-bold text-gray-300">{s.available.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{s.unit}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Déficit</p>
                    <p className="font-bold text-red-400">{(s.needed - s.available).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{s.unit}</p>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => setScreen('purchase-requests')} className={`${btn} bg-red-900 text-white`}>
              <ShoppingCart size={20} /> Ver solicitudes de compra
            </button>
          </>
        )}

        <button onClick={() => setScreen('home')} className={`${btn} bg-gray-700 text-white`}>
          Volver al inicio
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // PURCHASE REQUESTS
  // ══════════════════════════════════════════════════════════
  if (screen === 'purchase-requests') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('home')} className="p-1"><ChevronLeft size={22} /></button>
        <h1 className="text-xl font-bold">Solicitudes de compra</h1>
        <button onClick={load} className="ml-auto p-2 text-gray-400">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {purchaseReqs.length === 0 && (
          <p className="text-gray-500 text-center py-10 text-sm">No hay solicitudes pendientes</p>
        )}
        {purchaseReqs.map(pr => (
          <div key={pr.id} className={`rounded-xl p-4 border ${pr.urgency === 'URGENT' ? 'border-red-800 bg-red-950' : 'border-gray-700 bg-gray-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold">{pr.item_name}</p>
              <div className="flex gap-2">
                {pr.urgency === 'URGENT' && <span className="text-xs bg-red-800 text-red-200 px-2 py-1 rounded-full font-bold">URGENTE</span>}
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${pr.type === 'CHEMICAL' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'}`}>
                  {pr.type === 'CHEMICAL' ? '🧪' : '🐄'} {pr.type}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>PO: <span className="text-white">{pr.po_number ?? '—'}</span></p>
              <p>Necesario: <span className="text-red-300 font-bold">{pr.qty_needed} {pr.unit}</span></p>
              <p>En stock: <span className="text-gray-300">{pr.qty_in_stock} {pr.unit}</span></p>
            </div>
            {pr.status === 'PENDING' && (
              <button
                onClick={() => approvePurchase(pr.id)}
                className="mt-3 w-full py-3 bg-green-800 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Aprobar compra (Thanh)
              </button>
            )}
            {pr.status === 'APPROVED' && (
              <p className="mt-2 text-xs text-green-400 font-bold text-center">✓ Aprobado — Tuyen procesa el pedido</p>
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('home')} className="p-1"><ChevronLeft size={22} /></button>
        <h1 className="text-xl font-bold">Fórmulas / Công thức</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {formulas.map(f => (
          <div key={f.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="font-bold">{f.name}</p>
            <p className="text-sm text-gray-400 mt-1">{f.code} · {f.layer_count} bước / pasos</p>
          </div>
        ))}
        {formulas.length === 0 && (
          <p className="text-gray-500 text-center py-8 text-sm">Chưa có công thức</p>
        )}
        <button onClick={() => setScreen('formula-builder')} className={`${btn} bg-emerald-800 text-white mt-4`}>
          <Plus size={20} /> Nueva fórmula
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // FORMULA BUILDER
  // ══════════════════════════════════════════════════════════
  if (screen === 'formula-builder') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('formula-list')} className="p-1"><ChevronLeft size={22} /></button>
        <h1 className="text-xl font-bold">Nueva fórmula / Công thức mới</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <input value={newFormulaName} onChange={e => setNewFormulaName(e.target.value)}
          placeholder="Tên công thức / Nombre de la fórmula"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 text-lg border border-gray-700 placeholder-gray-500" />
        <input value={newFormulaDesc} onChange={e => setNewFormulaDesc(e.target.value)}
          placeholder="Mô tả / Descripción (opcional)"
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 placeholder-gray-500" />

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Các bước / Capas ({builderLayers.length})</p>
          {builderLayers.map((layer, idx) => (
            <div key={idx} className="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">BƯỚC {layer.layer_order}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${layer.layer_type === 'CHEMICAL' ? 'bg-blue-900 text-blue-200' : 'bg-purple-900 text-purple-200'}`}>
                  {layer.layer_type === 'CHEMICAL' ? '🧪 Hóa chất' : '⚙️ Cơ học'}
                </span>
                <button onClick={() => setBuilderLayers(ls => ls.filter((_, i) => i !== idx))}
                  className="text-red-500 text-sm px-2">✕</button>
              </div>
              {layer.layer_type === 'CHEMICAL' ? (
                <div className="space-y-2">
                  <select
                    value={layer.chemical_id ?? ''}
                    onChange={e => {
                      const chem = chemicals.find(c => c.id === Number(e.target.value));
                      setBuilderLayers(ls => ls.map((l, i) => i === idx
                        ? { ...l, chemical_id: chem?.id, chemical_name: chem?.name } : l));
                    }}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600"
                  >
                    <option value="">— Chọn hóa chất —</option>
                    {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.category})</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">% en mezcla</label>
                      <input type="number" value={layer.pct_in_mix ?? ''}
                        onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, pct_in_mix: Number(e.target.value) } : l))}
                        placeholder="100" className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">kg / SF</label>
                      <input type="number" value={layer.qty_per_sf ?? ''}
                        onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_per_sf: Number(e.target.value) } : l))}
                        placeholder="0.010" className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input value={layer.machine ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, machine: e.target.value } : l))}
                    placeholder="Máquina" className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm" />
                  <input type="number" value={layer.temperature_c ?? ''} onChange={e => setBuilderLayers(ls => ls.map((l, i) => i === idx ? { ...l, temperature_c: Number(e.target.value) } : l))}
                    placeholder="°C" className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm" />
                </div>
              )}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => {
              const order = builderLayers.length + 1;
              setBuilderLayers(ls => [...ls, { layer_order: order, layer_type: 'CHEMICAL', name: `Hóa chất ${order}`, chemical_id: chemicals[0]?.id, chemical_name: chemicals[0]?.name, pct_in_mix: 100, qty_per_sf: 0.01 }]);
            }} className="bg-blue-900 text-blue-100 rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2">
              <Plus size={16} /> 🧪 Hóa chất
            </button>
            <button onClick={() => {
              const order = builderLayers.length + 1;
              setBuilderLayers(ls => [...ls, { layer_order: order, layer_type: 'MECHANICAL', name: `Cơ học ${order}`, machine: 'Spray', passes: 1 }]);
            }} className="bg-purple-900 text-purple-100 rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2">
              <Plus size={16} /> ⚙️ Cơ học
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 pb-6 pt-3 bg-gray-950 border-t border-gray-800">
        {saved
          ? <div className="flex items-center justify-center gap-2 text-green-400 py-4 font-bold"><CheckCircle size={22} /> Guardado ✓</div>
          : <button onClick={saveFormula} disabled={loading || !newFormulaName || !builderLayers.length} className={`${btn} bg-emerald-700 text-white disabled:opacity-40`}>
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
              Guardar fórmula
            </button>
        }
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // BATCH EXECUTION
  // ══════════════════════════════════════════════════════════
  if (screen === 'batch') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen(selectedPO ? 'order-detail' : 'home')} className="p-1"><ChevronLeft size={22} /></button>
        <div>
          <h1 className="text-xl font-bold">Thực hiện Lô / Lote</h1>
          {selectedPO && <p className="text-xs text-gray-400">{selectedPO.po_number} · {selectedPO.sf_target} SF</p>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Orden de Producción</label>
          <select value={selectedPO?.id ?? ''} onChange={e => {
            const po = activeOrders.find(o => o.id === Number(e.target.value)) ?? null;
            setSelectedPO(po);
          }} className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 border border-gray-700">
            <option value="">— Sin orden —</option>
            {activeOrders.filter(o => o.status === 'IN_PROGRESS').map(o => (
              <option key={o.id} value={o.id}>{o.po_number} · {o.article_name} · {o.sf_target} SF</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Fórmula / Công thức</label>
          <select value={selectedFormula?.id ?? ''} onChange={e => { if (e.target.value) loadFormulaLayers(Number(e.target.value)); }}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 border border-gray-700">
            <option value="">— Chọn công thức —</option>
            {formulas.map(f => <option key={f.id} value={f.id}>{f.name} ({f.layer_count} bước)</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">SF producidos</label>
          <input type="number" inputMode="decimal" value={sfProduced} onChange={e => setSfProduced(e.target.value)}
            placeholder="Ej: 500"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 text-2xl font-bold border border-gray-700" />
        </div>

        {batchLayers.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Cantidades reales / Lượng thực tế</p>
            {batchLayers.map((layer, idx) => {
              const w = wasteInfo(layer);
              return (
                <div key={idx} className={`rounded-xl p-4 mb-3 border ${w?.alert ? 'border-red-700 bg-red-950' : 'border-gray-700 bg-gray-800'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold">{layer.name}</p>
                    {w?.alert && <span className="text-red-400 text-xs font-bold flex items-center gap-1"><AlertTriangle size={14} />⚠️ {w.pct}%</span>}
                    {w && !w.alert && <span className="text-green-400 text-xs">✓ {w.pct}%</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Chuẩn bị (kg)</label>
                      <input type="number" inputMode="decimal" value={layer.qty_prepared_kg}
                        onChange={e => setBatchLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_prepared_kg: e.target.value } : l))}
                        placeholder="0.000" className="w-full bg-gray-700 text-white rounded-lg px-3 py-3 text-lg border border-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Đã dùng (kg)</label>
                      <input type="number" inputMode="decimal" value={layer.qty_used_kg}
                        onChange={e => setBatchLayers(ls => ls.map((l, i) => i === idx ? { ...l, qty_used_kg: e.target.value } : l))}
                        placeholder="0.000" className="w-full bg-gray-700 text-white rounded-lg px-3 py-3 text-lg border border-gray-600" />
                    </div>
                  </div>
                  {w && <p className={`text-xs mt-2 ${w.alert ? 'text-red-400' : 'text-gray-400'}`}>Hao hụt: {w.waste} kg ({w.pct}%) {w.alert ? '⚠️ > 15%' : '✓'}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 bg-gray-950 border-t border-gray-800">
        {saved
          ? <div className="flex items-center justify-center gap-2 text-green-400 py-4 font-bold text-lg"><CheckCircle size={24} /> Lô guardado ✓</div>
          : <button onClick={submitBatch} disabled={loading || !sfProduced} className={`${btn} bg-blue-700 text-white disabled:opacity-40`}>
              {loading ? <RefreshCw size={22} className="animate-spin" /> : <Save size={22} />}
              Lưu Lô / Guardar Lote
            </button>
        }
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // PACKING & MEASURING
  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 px-5 py-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => setScreen('order-detail')} className="p-1"><ChevronLeft size={22} /></button>
        <div>
          <h1 className="text-xl font-bold">Đo & Đóng gói / Empacar</h1>
          {selectedPO && <p className="text-xs text-gray-400">{selectedPO.po_number} · {selectedPO.sf_produced} SF producidos</p>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Artículo</p>
          <p className="font-bold text-lg">{selectedPO?.article_name ?? '—'}</p>
          <p className="text-sm text-gray-400">SF producidos: <span className="text-yellow-400 font-bold">{selectedPO?.sf_produced ?? 0}</span></p>
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">SF reales empacados / Measured SF</label>
          <input type="number" inputMode="decimal" value={sfPacked} onChange={e => setSfPacked(e.target.value)}
            placeholder="SF medidos"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 text-2xl font-bold border border-gray-700" />
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest block mb-2">Empacado por</label>
          <input value={packedBy} onChange={e => setPackedBy(e.target.value)}
            placeholder="Nombre"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700" />
        </div>

        {sfPacked && selectedPO?.sf_produced && (
          <div className={`rounded-xl p-4 border ${Math.abs(parseFloat(sfPacked) - selectedPO.sf_produced) / selectedPO.sf_produced > 0.05 ? 'border-yellow-700 bg-yellow-950' : 'border-green-700 bg-green-950'}`}>
            <p className="text-sm font-bold">
              Diferencia: {(parseFloat(sfPacked) - (selectedPO?.sf_produced ?? 0)).toFixed(1)} SF
              ({(((parseFloat(sfPacked) - (selectedPO?.sf_produced ?? 0)) / (selectedPO?.sf_produced ?? 1)) * 100).toFixed(1)}%)
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 bg-gray-950 border-t border-gray-800">
        {saved
          ? <div className="flex items-center justify-center gap-2 text-green-400 py-4 font-bold text-lg"><CheckCircle size={24} /> PO cerrada ✓</div>
          : <button onClick={completePacking} disabled={loading || !sfPacked} className={`${btn} bg-purple-700 text-white disabled:opacity-40`}>
              {loading ? <RefreshCw size={22} className="animate-spin" /> : <Warehouse size={22} />}
              Confirmar empaque / Đóng gói xong
            </button>
        }
      </div>
    </div>
  );
}
