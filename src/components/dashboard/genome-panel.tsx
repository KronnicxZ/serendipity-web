'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, ChevronDown, CheckCircle2, AlertTriangle, Loader2, BarChart3 } from 'lucide-react'

// ── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0C0E12', card: '#111318', border: '#1e293b',
  cyan: '#00C8D4', green: '#2ECC71', red: '#E63946',
  amber: '#F59E0B', text: '#e2e8f0', muted: '#64748b', dim: '#334155',
}
const mono = { fontFamily: "'JetBrains Mono', monospace" }

// ── Types ─────────────────────────────────────────────────────────────────────
interface Chemical { id: number; name: string; category: string; unit_cost: number; stock_kg: number }
interface Formula { id: number; name: string; article: string; total_cost_reference: number; chemicals: { chemical_id: number; chemical_name: string; grams: number; unit_cost: number }[] }
interface Batch {
  batch_code: string; client_code: string; sqft: number; fecha: string
  genome_id: number | null; formula_json: any
  chem_cost: number | null; labor_cost: number | null; total_cost: number | null
  cost_per_sqft: number | null; yield_pct: number | null; chem_logs: number
}
interface GenomeEntry {
  lot_id: string; citizen_id: string; sf_out: number; yield_pct: number
  cost_per_sqft: number; chem_cost: number; formula: string; fecha: string
}
interface Stats { total_entries: number; avg_cost_per_sf: number; avg_yield: number; total_cost_all: number }

interface ChemRow { chemical_id: number; name: string; qty_kg: string; unit_cost: number }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtUSD = (n: number | null) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const fmtDate = (s: string) => new Date(s).toLocaleDateString('es-VN', { day: '2-digit', month: 'short' })

function YieldBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: C.muted, fontSize: 11 }}>—</span>
  const color = pct > 110 ? C.amber : pct < 90 ? C.red : C.green
  return <span style={{ ...mono, fontSize: 11, color, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function GenomePanel() {
  const [tab, setTab] = useState<'stats' | 'log'>('stats')
  const [data, setData] = useState<{ batches: Batch[]; chemicals: Chemical[]; formulas: Formula[]; stats: Stats; recent_genome: GenomeEntry[] } | null>(null)
  const [loading, setLoading] = useState(true)

  // Log form state
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedFormula, setSelectedFormula] = useState<number | null>(null)
  const [chemRows, setChemRows] = useState<ChemRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/local/genome')
      if (r.ok) setData(await r.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // When formula selected: pre-populate chem rows from recipe lines
  const onFormulaChange = (fId: number) => {
    setSelectedFormula(fId)
    if (!data) return
    const f = data.formulas.find(f => f.id === fId)
    if (!f) return
    // Get sqft of selected batch for gram→kg conversion
    const batch = data.batches.find(b => b.batch_code === selectedBatch)
    const sqft = batch?.sqft || 0
    setChemRows(
      f.chemicals.map(c => ({
        chemical_id: c.chemical_id,
        name: c.chemical_name,
        unit_cost: c.unit_cost,
        qty_kg: sqft > 0
          ? String(Math.round(c.grams / 1000 * (sqft / 1000) * 1000) / 1000)
          : '',
      }))
    )
  }

  const updateChemRow = (i: number, qty: string) => {
    setChemRows(prev => prev.map((r, j) => j === i ? { ...r, qty_kg: qty } : r))
  }

  const addChemRow = () => {
    setChemRows(prev => [...prev, { chemical_id: 0, name: '', unit_cost: 0, qty_kg: '' }])
  }

  const addChemFromList = (chem: Chemical) => {
    setChemRows(prev => {
      if (prev.find(r => r.chemical_id === chem.id)) return prev
      return [...prev, { chemical_id: chem.id, name: chem.name, unit_cost: chem.unit_cost, qty_kg: '' }]
    })
  }

  const removeChemRow = (i: number) => setChemRows(prev => prev.filter((_, j) => j !== i))

  const handleSave = async () => {
    if (!selectedBatch || chemRows.length === 0) return
    setSaving(true)
    setSaveResult(null)
    try {
      const payload = {
        action: 'log_chemicals',
        batch_code: selectedBatch,
        formula_id: selectedFormula,
        chemicals: chemRows
          .filter(r => r.chemical_id > 0 && parseFloat(r.qty_kg) > 0)
          .map(r => ({ chemical_id: r.chemical_id, qty_kg: parseFloat(r.qty_kg) })),
      }
      const res = await fetch('/api/local/genome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await res.json()
      setSaveResult(result)
      if (result.ok) { await load(); setTab('stats') }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.muted }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
      Cargando genome…
    </div>
  )

  if (!data) return null

  const { stats, batches, chemicals, formulas, recent_genome } = data

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 28px', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <FlaskConical size={22} color={C.cyan} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Production Genome</h1>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Costo real por SF · Yield por artículo · Uso de químicos</p>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Entradas', value: stats.total_entries?.toLocaleString() || '—', color: C.cyan },
          { label: 'Costo/SF promedio', value: fmtUSD(stats.avg_cost_per_sf), color: C.amber },
          { label: 'Yield promedio', value: stats.avg_yield ? stats.avg_yield + '%' : '—', color: C.green },
          { label: 'Costo total estimado', value: stats.total_cost_all ? '$' + stats.total_cost_all.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—', color: C.text },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ ...mono, fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {([['stats', 'Vista Genome', BarChart3], ['log', 'Registrar Químicos', FlaskConical]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === id ? C.cyan : C.muted, borderBottom: tab === id ? `2px solid ${C.cyan}` : '2px solid transparent', transition: 'all 0.15s' }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Recent batches */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Batches — Últimos 14 días
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0d1017' }}>
                    {['Batch', 'Cliente', 'SF', 'Chem Cost', 'Costo/SF', 'Yield', 'Químicos'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: h === 'SF' || h === 'Chem Cost' || h === 'Costo/SF' ? 'right' : 'left', color: C.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, i) => (
                    <tr key={b.batch_code} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#0d1017' }}>
                      <td style={{ padding: '9px 14px', ...mono, fontSize: 12, color: C.cyan }}>{b.batch_code}</td>
                      <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12 }}>{b.client_code}</td>
                      <td style={{ padding: '9px 14px', ...mono, textAlign: 'right' }}>{Number(b.sqft).toLocaleString()}</td>
                      <td style={{ padding: '9px 14px', ...mono, textAlign: 'right', color: b.chem_cost != null && b.chem_cost > 0 ? C.green : C.muted }}>
                        {b.chem_cost != null && b.chem_cost > 0 ? '$' + Number(b.chem_cost).toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', ...mono, textAlign: 'right', color: C.amber }}>
                        {b.cost_per_sqft != null ? '$' + Number(b.cost_per_sqft).toFixed(4) : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', textAlign: 'left' }}>
                        <YieldBadge pct={b.yield_pct ? Number(b.yield_pct) : null} />
                      </td>
                      <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                        {Number(b.chem_logs) > 0
                          ? <CheckCircle2 size={14} color={C.green} />
                          : <span style={{ fontSize: 10, color: C.dim }}>pendiente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Genome entries */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Genome — Últimas 10 entradas (desde Feb 2026)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0d1017' }}>
                    {['Lote', 'SF', 'Yield', 'Costo/SF', 'Chem', 'Fórmula', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent_genome.map((g, i) => (
                    <tr key={g.lot_id + i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#0d1017' }}>
                      <td style={{ padding: '9px 14px', ...mono, fontSize: 11, color: C.cyan }}>{g.lot_id}</td>
                      <td style={{ padding: '9px 14px', ...mono }}>{Number(g.sf_out).toLocaleString()}</td>
                      <td style={{ padding: '9px 14px' }}><YieldBadge pct={g.yield_pct} /></td>
                      <td style={{ padding: '9px 14px', ...mono, color: C.amber }}>${Number(g.cost_per_sqft).toFixed(4)}</td>
                      <td style={{ padding: '9px 14px', ...mono, fontSize: 11 }}>${Number(g.chem_cost).toFixed(4)}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: C.muted }}>{g.formula || '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: C.dim }}>{fmtDate(g.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'log' && (
          <motion.div key="log" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

              {/* Left: form */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Registrar uso de químicos</h3>

                {/* Batch selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Batch</label>
                  <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, ...mono }}>
                    <option value=''>-- Seleccionar batch --</option>
                    {batches.map(b => (
                      <option key={b.batch_code} value={b.batch_code}>
                        {b.batch_code} · {b.client_code} · {Number(b.sqft).toLocaleString()} SF · {fmtDate(b.fecha)}
                        {Number(b.chem_logs) > 0 ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Formula selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Fórmula (pre-carga químicos)</label>
                  <select value={selectedFormula ?? ''} onChange={e => onFormulaChange(Number(e.target.value))}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13 }}>
                    <option value=''>-- Sin fórmula / manual --</option>
                    {formulas.map(f => (
                      <option key={f.id} value={f.id}>{f.name} · ${Number(f.total_cost_reference).toFixed(4)}/SF</option>
                    ))}
                  </select>
                </div>

                {/* Chemical rows */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Químicos usados</label>
                    <button onClick={addChemRow} style={{ fontSize: 11, color: C.cyan, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>+ agregar</button>
                  </div>
                  {chemRows.length === 0 && (
                    <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Seleccioná una fórmula o agregá químicos manualmente.</p>
                  )}
                  {chemRows.map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 24px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      {row.chemical_id > 0
                        ? <div style={{ padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 12, color: C.text }}>
                            {row.name} <span style={{ color: C.muted }}>· ${row.unit_cost}/kg</span>
                          </div>
                        : <select onChange={e => {
                              const c = chemicals.find(c => c.id === Number(e.target.value))
                              if (c) setChemRows(prev => prev.map((r, j) => j === i ? { ...r, chemical_id: c.id, name: c.name, unit_cost: c.unit_cost } : r))
                            }}
                            style={{ padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12 }}>
                            <option value=''>-- Químico --</option>
                            {chemicals.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      }
                      <input
                        type='number' step='0.001' min='0'
                        placeholder='kg'
                        value={row.qty_kg}
                        onChange={e => updateChemRow(i, e.target.value)}
                        style={{ padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, ...mono, textAlign: 'right' }}
                      />
                      <button onClick={() => removeChemRow(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>

                {/* Cost preview */}
                {chemRows.length > 0 && selectedBatch && (
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Previsualización de costo</div>
                    {(() => {
                      const batch = batches.find(b => b.batch_code === selectedBatch)
                      const sqft = batch?.sqft || 0
                      const chemTotal = chemRows.reduce((s, r) => s + (parseFloat(r.qty_kg) || 0) * r.unit_cost, 0)
                      const laborTotal = sqft * 0.170
                      const overheadTotal = sqft * 0.072
                      const total = chemTotal + laborTotal + overheadTotal
                      const perSF = sqft > 0 ? total / sqft : 0
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                          <span style={{ color: C.muted }}>Químicos:</span>
                          <span style={{ ...mono, textAlign: 'right', color: C.green }}>${chemTotal.toFixed(4)}</span>
                          <span style={{ color: C.muted }}>Labor (est.):</span>
                          <span style={{ ...mono, textAlign: 'right' }}>${laborTotal.toFixed(4)}</span>
                          <span style={{ color: C.muted }}>Overhead:</span>
                          <span style={{ ...mono, textAlign: 'right' }}>${overheadTotal.toFixed(4)}</span>
                          <span style={{ color: C.amber, fontWeight: 700 }}>Total/SF:</span>
                          <span style={{ ...mono, textAlign: 'right', color: C.amber, fontWeight: 700 }}>${perSF.toFixed(4)}</span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || !selectedBatch || chemRows.filter(r => r.chemical_id > 0 && parseFloat(r.qty_kg) > 0).length === 0}
                  style={{ width: '100%', padding: '10px', background: saving ? C.dim : C.cyan, color: '#000', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: (!selectedBatch || chemRows.length === 0) ? 0.5 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar en Genome'}
                </button>

                {saveResult && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: saveResult.ok ? C.green + '15' : C.red + '15', border: `1px solid ${saveResult.ok ? C.green : C.red}30`, borderRadius: 6, fontSize: 12 }}>
                    {saveResult.ok
                      ? `✓ Guardado — ${saveResult.chem_entries} químicos · Costo/SF: $${saveResult.genome?.cost_per_sqft || '—'}`
                      : `Error: ${saveResult.error}`}
                  </div>
                )}
              </div>

              {/* Right: chemical browser */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Catálogo — {chemicals.length} químicos
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {['ACABADO', 'BASE', 'FIJADOR', 'PIGMENTO', 'RETICULANTE', 'SOFTENER', 'OTROS'].map(cat => {
                    const list = chemicals.filter(c => c.category?.toUpperCase() === cat || (!c.category && cat === 'OTROS'))
                    if (list.length === 0) return null
                    return (
                      <div key={cat}>
                        <div style={{ padding: '6px 14px', fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#0d1017', borderBottom: `1px solid ${C.border}` }}>{cat}</div>
                        {list.map(c => (
                          <div key={c.id} onClick={() => addChemFromList(c)}
                            style={{ padding: '7px 14px', borderBottom: `1px solid ${C.border}20`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.border + '40')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ color: C.text }}>{c.name}</span>
                            <span style={{ ...mono, fontSize: 11, color: C.muted }}>${c.unit_cost}/kg</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
