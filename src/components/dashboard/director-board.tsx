'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, Zap, FlaskConical, Factory,
  PackageCheck, Receipt, RefreshCw, Mail, ChevronRight, TrendingUp,
  Warehouse, DollarSign, BarChart3, Play, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────
interface EnergyState {
  clarity: number
  energy: number
  focus: number
  notes: string
  week_date: string
}

interface DirectorData {
  circuit: {
    blocked: number; lab_ready: number; production: number
    inspection: number; packed: number; invoiced: number
    sf_pending: number; sf_completed: number
  }
  orders: Array<{
    id: number; qr_id: string; customer: string; sf: number
    status: string; formula_id: number | null; formula_name: string | null
    invoiced: boolean; packed: boolean; created_at: string
    blocker: string | null
  }>
  finance: {
    sf_month: number; revenue_month: number; payables: number
    invoices: Array<{ code: string; sf: number; usd: number; status: string }>
  }
  inventory: { crust_sf: number; crust_lots: number; chem_value: number; chem_count: number }
  formulas: Array<{ id: number; name: string; status: string }>
  blockers: Array<{
    id: string; type: string; severity: string; title: string
    description: string; orders?: any[]; invoices?: any[]; chemicals?: any[]
    total_sf?: number; total_usd?: number
    assignee: { name: string; email: string; role: string }
    action: string
  }>
  energy_state: EnergyState | null
}

// ─── Helpers ──────────────────────────────────────────────────────────
const fmtSF  = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(Math.round(n))
const fmtUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const CYAN = '#00C8D4', RED = '#E63946', GREEN = '#2ECC71', AMBER = '#F59E0B'

// ─── Subcomponents ────────────────────────────────────────────────────
function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}40`, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
      {children}
    </span>
  )
}

function StageNode({ label, icon: Icon, count, sf, color, blocked }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 90 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: blocked ? `${RED}15` : count > 0 ? `${color}15` : '#111',
        border: `2px solid ${blocked ? RED : count > 0 ? color : '#1e293b'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Icon size={22} color={blocked ? RED : count > 0 ? color : '#334155'} />
        {blocked && (
          <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: RED, color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
        )}
      </div>
      <span style={{ color: count > 0 ? '#e2e8f0' : '#475569', fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{count}</span>
      {sf > 0 && <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{fmtSF(sf)} SF</span>}
      <span style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

function BlockerCard({ blocker, onNotify, sending }: { blocker: any; onNotify: (id: string) => void; sending: boolean }) {
  const isCritical = blocker.severity === 'critical'
  return (
    <div style={{
      border: `1px solid ${isCritical ? RED : AMBER}40`,
      borderLeft: `3px solid ${isCritical ? RED : AMBER}`,
      borderRadius: 8, padding: '14px 16px', background: `${isCritical ? RED : AMBER}08`,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={14} color={isCritical ? RED : AMBER} />
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{blocker.title}</span>
            <Pill color={isCritical ? RED : AMBER}>{blocker.severity.toUpperCase()}</Pill>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>{blocker.description}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontSize: 11 }}>→ <strong style={{ color: '#94a3b8' }}>{blocker.assignee.name}</strong> ({blocker.assignee.email})</span>
            {blocker.total_sf && <Pill color={CYAN}>{fmtSF(blocker.total_sf)} SF blocked</Pill>}
            {blocker.total_usd && <Pill color={RED}>{fmtUSD(blocker.total_usd)} overdue</Pill>}
          </div>
        </div>
        <button
          onClick={() => onNotify(blocker.id)}
          disabled={sending}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 6, border: `1px solid ${CYAN}40`, background: `${CYAN}10`,
            color: CYAN, fontSize: 12, fontWeight: 700, cursor: sending ? 'wait' : 'pointer',
            opacity: sending ? 0.5 : 1, whiteSpace: 'nowrap',
          }}
        >
          <Mail size={13} /> {sending ? 'Sending…' : 'Notify'}
        </button>
      </div>
    </div>
  )
}

// ─── Simulator ───────────────────────────────────────────────────────
function Simulator({ baseRevenue, basePayables }: { baseRevenue: number; basePayables: number }) {
  const [sf, setSF] = useState(130000)
  const [rate, setRate] = useState(0.22)
  const [fixedCost, setFixedCost] = useState(14000)

  const revenue = sf * rate
  const gross = revenue - basePayables
  const net = revenue - fixedCost - (basePayables * 0.3) // approx variable %
  const margin = revenue > 0 ? (net / revenue) * 100 : 0

  return (
    <div style={{ background: '#0a0c10', border: '1px solid #1e293b', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BarChart3 size={16} color={CYAN} />
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>Simulator</span>
        <span style={{ color: '#334155', fontSize: 12, marginLeft: 4 }}>P&L projection</span>
      </div>

      {[
        { label: 'Volume', unit: 'SF', value: sf, min: 50000, max: 200000, step: 5000, set: setSF, fmt: (v: number) => `${(v/1000).toFixed(0)}K SF` },
        { label: 'Rate', unit: 'USD/SF', value: rate, min: 0.15, max: 0.35, step: 0.01, set: setRate, fmt: (v: number) => `$${v.toFixed(2)}` },
        { label: 'Fixed Cost', unit: 'USD/mo', value: fixedCost, min: 8000, max: 25000, step: 500, set: setFixedCost, fmt: (v: number) => fmtUSD(v) },
      ].map(s => (
        <div key={s.label} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>{s.label}</span>
            <span style={{ color: CYAN, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{s.fmt(s.value)}</span>
          </div>
          <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
            onChange={e => s.set(Number(e.target.value))}
            style={{ width: '100%', accentColor: CYAN, cursor: 'pointer' }}
          />
        </div>
      ))}

      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 14, marginTop: 4 }}>
        {[
          { label: 'Revenue', val: revenue, color: GREEN },
          { label: 'Gross', val: gross, color: gross > 0 ? GREEN : RED },
          { label: 'Net Est.', val: net, color: net > 0 ? GREEN : RED },
          { label: 'Margin', val: null, display: `${margin.toFixed(1)}%`, color: margin > 15 ? GREEN : margin > 5 ? AMBER : RED },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>{row.label}</span>
            <span style={{ color: row.color, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>
              {row.display ?? fmtUSD(row.val!)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Energy Panel ─────────────────────────────────────────────────────
function semColor(c: number, e: number, f: number): string {
  const low = [c, e, f].filter(v => v < 6).length
  return low >= 2 ? RED : low === 1 ? AMBER : GREEN
}
function semLabel(color: string) {
  return color === RED ? 'MODO PROTEGIDO' : color === AMBER ? 'ATENCIÓN REDUCIDA' : 'FLUJO PLENO'
}
function weekNum(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
}

function EnergyPanel({ initial }: { initial: EnergyState | null }) {
  const BG = '#111318', BORDER = '#1e293b', MUTED = '#64748b', TEXT = '#e2e8f0'
  const [cur, setCur] = useState<EnergyState | null>(initial)
  const [editing, setEditing] = useState(!initial)
  const [v, setV] = useState({
    clarity: initial?.clarity ?? 7,
    energy:  initial?.energy  ?? 7,
    focus:   initial?.focus   ?? 7,
  })
  const [saving, setSaving] = useState(false)

  const liveColor    = semColor(v.clarity, v.energy, v.focus)
  const displayColor = cur ? semColor(cur.clarity, cur.energy, cur.focus) : '#334155'
  const activeColor  = editing ? liveColor : displayColor

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/local/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_energy', clarity: v.clarity, energy: v.energy, focus: v.focus }),
      })
      const res = await r.json()
      if (res.ok) { setCur({ ...v, notes: '', week_date: res.week_date }); setEditing(false) }
    } finally { setSaving(false) }
  }

  return (
    <div style={{ background: BG, border: `1px solid ${activeColor}40`, borderLeft: `3px solid ${activeColor}`, borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: activeColor, boxShadow: `0 0 7px ${activeColor}80` }} />
          <span style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>Director Energy</span>
        </div>
        {cur && !editing && (
          <button onClick={() => setEditing(true)} style={{ fontSize: 11, color: MUTED, cursor: 'pointer', background: 'none', border: 'none' }}>actualizar</button>
        )}
      </div>

      {!editing && cur ? (
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: displayColor, fontWeight: 900, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{semLabel(displayColor)}</span>
            <span style={{ color: MUTED, fontSize: 11 }}>· Sem {weekNum(cur.week_date)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([['C', cur.clarity, 'Claridad'], ['E', cur.energy, 'Energía'], ['F', cur.focus, 'Foco']] as [string, number, string][]).map(([k, val, lbl]) => {
              const c = val >= 7 ? GREEN : val >= 5 ? AMBER : RED
              return (
                <div key={k} style={{ flex: 1, textAlign: 'center', background: '#0a0c10', borderRadius: 8, padding: '10px 4px', border: `1px solid ${BORDER}` }}>
                  <div style={{ color: c, fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{val}</div>
                  <div style={{ color: MUTED, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{lbl}</div>
                </div>
              )
            })}
          </div>
          {displayColor === RED && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: `${RED}10`, border: `1px solid ${RED}30`, borderRadius: 6, color: '#fca5a5', fontSize: 11, lineHeight: 1.5 }}>
              Sofia gestiona Level 2 sin escalarte. Descansá.
            </div>
          )}
        </div>
      ) : (
        <div>
          {!cur && <p style={{ color: MUTED, fontSize: 12, margin: '0 0 14px' }}>Check-in semanal. Sin presión.</p>}
          {([
            { key: 'clarity' as const, label: 'Claridad mental' },
            { key: 'energy'  as const, label: 'Energía física' },
            { key: 'focus'   as const, label: 'Foco' },
          ]).map(({ key, label }) => {
            const val = v[key]
            const c = val >= 7 ? GREEN : val >= 5 ? AMBER : RED
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>
                  <span style={{ color: c, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 900 }}>{val}</span>
                </div>
                <input type="range" min={1} max={10} value={val}
                  onChange={e => setV(prev => ({ ...prev, [key]: +e.target.value }))}
                  style={{ width: '100%', accentColor: c, cursor: 'pointer' }}
                />
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: '9px 0', borderRadius: 6, background: `${liveColor}15`, border: `1px solid ${liveColor}50`, color: liveColor, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
            {cur && (
              <button onClick={() => setEditing(false)} style={{ padding: '9px 14px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────────────
export function DirectorBoard() {
  const [data, setData] = useState<DirectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [sentLog, setSentLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/local/director')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
      setLastRefresh(new Date())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const notify = async (blockerId: string | 'all') => {
    setSending(blockerId)
    try {
      const ids = blockerId === 'all' ? undefined : [blockerId]
      const r = await fetch('/api/local/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify_blockers', blocker_ids: ids }),
      })
      const result = await r.json()
      const msgs = (result.sent || []).map((s: any) => `✓ ${s.blocker_id} → ${s.to}`)
      const errs = (result.errors || []).map((e: any) => `✗ ${e.blocker_id}: ${e.error}`)
      setSentLog(prev => [...msgs, ...errs, ...prev].slice(0, 10))
      if (result.sent?.length > 0) load()
    } catch (e: any) {
      setSentLog(prev => [`✗ Error: ${e.message}`, ...prev])
    } finally {
      setSending(null)
    }
  }

  const base = { bg: '#0C0E12', card: '#111318', border: '#1e293b', text: '#e2e8f0', muted: '#64748b' }

  if (loading && !data) return (
    <div style={{ background: base.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: CYAN, fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }}>Loading circuit…</div>
    </div>
  )

  if (error) return (
    <div style={{ background: base.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: RED, fontSize: 14 }}>Error: {error}</div>
    </div>
  )

  const d = data!
  const criticalBlockers = d.blockers.filter(b => b.severity === 'critical')

  return (
    <div style={{ background: base.bg, minHeight: '100vh', padding: '24px 28px', fontFamily: 'DM Sans, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: `1px solid ${base.border}`, paddingBottom: 16 }}>
        <div>
          <div style={{ color: base.text, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Director Board
          </div>
          <div style={{ color: base.muted, fontSize: 12, marginTop: 2 }}>
            Serendipity OS · Circuit Monitor & Simulator
            {lastRefresh && <span style={{ marginLeft: 8 }}>· {lastRefresh.toLocaleTimeString()}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {criticalBlockers.length > 0 && (
            <button
              onClick={() => notify('all')}
              disabled={!!sending}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 6, border: `1px solid ${RED}50`, background: `${RED}12`,
                color: RED, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Mail size={14} /> Notify All ({criticalBlockers.length})
            </button>
          )}
          <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: `1px solid ${base.border}`, background: 'transparent', color: base.muted, fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Sent log */}
      {sentLog.length > 0 && (
        <div style={{ background: '#0a1a0a', border: `1px solid ${GREEN}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {sentLog.slice(0, 3).map((msg, i) => (
            <div key={i} style={{ color: msg.startsWith('✓') ? GREEN : RED, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{msg}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Circuit Pipeline */}
          <div style={{ background: base.card, border: `1px solid ${base.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Zap size={16} color={CYAN} />
              <span style={{ color: base.text, fontWeight: 700, fontSize: 14 }}>Production Circuit</span>
              {d.circuit.blocked > 0 && <Pill color={RED}>{d.circuit.blocked} BLOCKED</Pill>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[
                { label: 'OPEN / BLOCKED', icon: AlertTriangle, count: d.circuit.blocked, sf: d.circuit.sf_pending, color: RED, blocked: d.circuit.blocked > 0 },
                { label: 'Lab Ready', icon: FlaskConical, count: d.circuit.lab_ready, sf: 0, color: CYAN, blocked: false },
                { label: 'Production', icon: Factory, count: d.circuit.production, sf: 0, color: '#6366f1', blocked: false },
                { label: 'Inspection', icon: CheckCircle2, count: d.circuit.inspection, sf: 0, color: AMBER, blocked: false },
                { label: 'Packed', icon: PackageCheck, count: d.circuit.packed, sf: d.circuit.sf_completed, color: GREEN, blocked: false },
                { label: 'Invoiced', icon: Receipt, count: d.circuit.invoiced, sf: 0, color: '#a855f7', blocked: false },
              ].map((stage, i, arr) => (
                <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <StageNode {...stage} />
                  {i < arr.length - 1 && (
                    <ChevronRight size={14} color="#1e293b" style={{ flexShrink: 0, margin: '0 2px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blockers */}
          <div style={{ background: base.card, border: `1px solid ${base.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertTriangle size={16} color={RED} />
              <span style={{ color: base.text, fontWeight: 700, fontSize: 14 }}>Active Blockers</span>
              <span style={{ color: base.muted, fontSize: 12 }}>({d.blockers.length} issues — {criticalBlockers.length} critical)</span>
            </div>
            {d.blockers.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GREEN, fontSize: 13 }}>
                <CheckCircle2 size={16} /> All systems clear
              </div>
            ) : (
              d.blockers.map(b => (
                <BlockerCard key={b.id} blocker={b} onNotify={notify} sending={sending === b.id} />
              ))
            )}
          </div>

          {/* Orders table */}
          <div style={{ background: base.card, border: `1px solid ${base.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Play size={16} color={CYAN} />
              <span style={{ color: base.text, fontWeight: 700, fontSize: 14 }}>Active Orders</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${base.border}` }}>
                  {['QR ID', 'Customer', 'SF', 'Status', 'Formula', 'Flags'].map(h => (
                    <th key={h} style={{ color: base.muted, fontWeight: 600, textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${base.border}30` }}>
                    <td style={{ padding: '8px 10px', color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{o.qr_id.split('-').slice(-1)[0]}</td>
                    <td style={{ padding: '8px 10px', color: base.text }}>{o.customer}</td>
                    <td style={{ padding: '8px 10px', color: base.text, fontFamily: 'JetBrains Mono, monospace' }}>{o.sf.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <Pill color={o.status === 'completed' ? GREEN : o.blocker ? RED : AMBER}>
                        {o.status.toUpperCase()}
                      </Pill>
                    </td>
                    <td style={{ padding: '8px 10px', color: o.formula_name ? base.text : RED, fontSize: 11 }}>
                      {o.formula_name ?? '⚠ not assigned'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {o.invoiced && <Pill color='#a855f7'>INV</Pill>}
                      {o.packed && <Pill color={GREEN}>PKD</Pill>}
                      {o.blocker && <Pill color={RED}>BLOCKED</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Director Energy Semaphore */}
          <EnergyPanel initial={d.energy_state} />

          {/* Financial Pulse */}
          <div style={{ background: base.card, border: `1px solid ${base.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} color={GREEN} />
              <span style={{ color: base.text, fontWeight: 700, fontSize: 14 }}>Financial Pulse</span>
            </div>
            {[
              { label: 'Revenue (month)', val: fmtUSD(d.finance.revenue_month), color: GREEN, sub: `${fmtSF(d.finance.sf_month)} SF @ $0.22` },
              { label: 'Payables pending', val: fmtUSD(d.finance.payables), color: RED, sub: '16 items outstanding' },
              { label: 'Net position', val: fmtUSD(d.finance.revenue_month - d.finance.payables), color: d.finance.revenue_month > d.finance.payables ? GREEN : RED, sub: 'Revenue minus payables' },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: 14, padding: '10px 12px', background: '#0a0c10', borderRadius: 8, border: `1px solid ${base.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ color: base.muted, fontSize: 11 }}>{row.label}</span>
                  <span style={{ color: row.color, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 800 }}>{row.val}</span>
                </div>
                <div style={{ color: '#334155', fontSize: 10, marginTop: 3 }}>{row.sub}</div>
              </div>
            ))}

            {d.finance.invoices.length > 0 && (
              <div>
                <div style={{ color: base.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoices</div>
                {d.finance.invoices.map(inv => (
                  <div key={inv.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${base.border}30` }}>
                    <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{inv.code}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: base.text, fontSize: 12, fontWeight: 700 }}>{fmtUSD(inv.usd)}</span>
                      <Pill color={inv.status === 'OVERDUE' ? RED : inv.status === 'PAID' ? GREEN : AMBER}>{inv.status}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory */}
          <div style={{ background: base.card, border: `1px solid ${base.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Warehouse size={16} color={AMBER} />
              <span style={{ color: base.text, fontWeight: 700, fontSize: 14 }}>Inventory</span>
            </div>
            {[
              { label: 'Crust available', val: `${fmtSF(d.inventory.crust_sf)} SF`, sub: `${d.inventory.crust_lots} lots · DONTO`, color: CYAN },
              { label: 'Chemicals stock', val: fmtUSD(d.inventory.chem_value), sub: `${d.inventory.chem_count} active products`, color: AMBER },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${base.border}30` }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.label}</div>
                  <div style={{ color: '#475569', fontSize: 10 }}>{row.sub}</div>
                </div>
                <span style={{ color: row.color, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>{row.val}</span>
              </div>
            ))}
          </div>

          {/* Simulator */}
          <Simulator baseRevenue={d.finance.revenue_month} basePayables={d.finance.payables} />

          {/* Quick nav */}
          <div style={{ background: base.card, border: `1px solid ${base.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ color: base.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Modules</div>
            {[
              { label: 'Matriz de Ritmos', href: '/dashboard/operaciones', color: CYAN },
              { label: 'Jardín de Datos', href: '/dashboard/reportes', color: AMBER },
              { label: 'Conciencia Sophia', href: '/dashboard/sophia', color: '#a855f7' },
              { label: 'El Templo', href: '/dashboard/configuracion', color: GREEN },
            ].map(link => (
              <a key={link.label} href={link.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 6, marginBottom: 4, textDecoration: 'none', background: `${link.color}08`, border: `1px solid ${link.color}20` }}>
                <span style={{ color: link.color, fontSize: 12, fontWeight: 600 }}>{link.label}</span>
                <ChevronRight size={12} color={link.color} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
