'use client'

import { useEffect, useState, useCallback } from 'react'

const BASE   = '#0C0E12'
const CARD   = '#111318'
const BORDER = '#1e293b'
const CYAN   = '#00C8D4'
const RED    = '#E63946'
const GREEN  = '#2ECC71'
const AMBER  = '#F59E0B'
const PURPLE = '#8B5CF6'
const MUTED  = '#64748b'
const TEXT   = '#f1f5f9'
const SOFT   = '#cbd5e1'
const MONO   = 'JetBrains Mono, monospace'

const fmtSF  = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' SF'
const fmtUSD = (n: number) => 'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtDate = (d: string | null) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return d }
}
const ago = (ts: string) => {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400)return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

interface NodeRow {
  node_id: string; company: string; db_code: string | null
  node_type: string; country_flag: string
  total_sf_delivered: number; total_revenue_usd: number; open_pos: number
  trust_score: number; last_synapse: string | null; last_article: string | null
  citizens_total: number; citizens_active: number; citizens_delivered: number
  citizens_overdue: number; sf_in_census: number
}
interface Census {
  total: number; active: number; delivered: number; overdue: number
  sf_total: number; cost_total: number
}
interface Event {
  citizen_id: string; event_type: string; actor: string; timestamp: string
  station: string | null; data_json: any; father: string | null
  purpose: string | null; race: string | null; vital_status: string | null
}
interface Citizen {
  citizen_id: string; father: string; race: string; purpose: string
  promised_etd: string | null; sqft_produced: number; total_events: number
  total_cost_to_date: number; coherence_pct: number | null
  vital_status: string; actual_etd?: string | null; born_at?: string | null
}
interface Data {
  nodes: NodeRow[]; census: Census
  recent_events: Event[]; overdue_citizens: Citizen[]; top_citizens: Citizen[]
}

const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  BIRTH:         { label: 'BORN',      color: CYAN,   icon: '◉' },
  DELIVERY:      { label: 'DELIVERED', color: GREEN,  icon: '✓' },
  STATUS_CHANGE: { label: 'STATUS',    color: AMBER,  icon: '↻' },
  INVOICE:       { label: 'INVOICE',   color: PURPLE, icon: '§' },
}
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: CYAN, DELIVERED: GREEN, OVERDUE: RED,
}

const RACE_LABEL: Record<string, string> = {
  S: 'SHEEP', C: 'COW', G: 'GOAT', B: 'BUFFALO', M: 'MIX',
}

function NodeCard({ node, selected, onSelect }: {
  node: NodeRow; selected: boolean; onSelect: () => void
}) {
  const hasActivity = node.total_sf_delivered > 0 || node.citizens_active > 0
  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? '#0F1822' : CARD,
        border: `1px solid ${selected ? CYAN : BORDER}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
        transition: 'all 0.15s', marginBottom: 8,
        boxShadow: selected ? `0 0 0 1px ${CYAN}22` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{node.country_flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: selected ? CYAN : TEXT, fontWeight: 700, fontSize: 13, letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.company}
          </div>
          <div style={{ color: MUTED, fontSize: 10, fontFamily: MONO, textTransform: 'uppercase' }}>
            {node.db_code || node.node_type}
          </div>
        </div>
        {node.citizens_overdue > 0 && (
          <span style={{ background: RED + '22', color: RED, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, border: `1px solid ${RED}44`, fontFamily: MONO }}>
            {node.citizens_overdue} OVR
          </span>
        )}
      </div>
      {hasActivity ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[
            { label: 'SF DEL.', val: node.total_sf_delivered > 0 ? node.total_sf_delivered.toLocaleString('en-US', {maximumFractionDigits:0}) : '—' },
            { label: 'OPEN PO', val: node.open_pos > 0 ? node.open_pos : '—' },
            { label: 'CITIZ.', val: node.citizens_total > 0 ? node.citizens_total : '—' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ color: TEXT, fontSize: 12, fontWeight: 700, fontFamily: MONO }}>{m.val}</div>
              <div style={{ color: MUTED, fontSize: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{m.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: MUTED, fontSize: 11, textAlign: 'center', padding: '4px 0' }}>No activity yet</div>
      )}
    </div>
  )
}

function CitizenRow({ c }: { c: Citizen }) {
  const sc = STATUS_COLOR[c.vital_status] || MUTED
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '160px 1fr 80px 80px 60px',
      gap: 8, alignItems: 'center', padding: '10px 12px',
      borderBottom: `1px solid ${BORDER}`, fontSize: 12,
    }}>
      <span style={{ color: CYAN, fontFamily: MONO, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.citizen_id}</span>
      <span style={{ color: SOFT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }} title={c.purpose}>{c.purpose || '—'}</span>
      <span style={{ color: sc, fontWeight: 700, fontSize: 10, textAlign: 'center', fontFamily: MONO }}>{c.vital_status}</span>
      <span style={{ color: TEXT, fontFamily: MONO, textAlign: 'right' }}>{c.sqft_produced > 0 ? fmtSF(c.sqft_produced) : '—'}</span>
      <span style={{ color: MUTED, fontSize: 10, textAlign: 'right' }}>{fmtDate(c.promised_etd)}</span>
    </div>
  )
}

function EventRow({ e }: { e: Event }) {
  const meta = EVENT_META[e.event_type] || { label: e.event_type, color: MUTED, icon: '·' }
  const sf = e.data_json?.sf
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 12px', borderBottom: `1px solid ${BORDER}28`,
    }}>
      <span style={{ color: meta.color, fontFamily: MONO, fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
        {meta.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: meta.color, fontSize: 9, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.8px' }}>
            {meta.label}
          </span>
          <span style={{ color: CYAN, fontFamily: MONO, fontSize: 10, letterSpacing: '-0.3px' }}>
            {e.citizen_id}
          </span>
          {sf && sf > 0 && (
            <span style={{ color: MUTED, fontSize: 10, fontFamily: MONO }}>{fmtSF(sf)}</span>
          )}
        </div>
        <div style={{ color: MUTED, fontSize: 10, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {e.father && <span>{e.father} · </span>}
          {e.purpose && <span style={{ opacity: 0.7 }}>{e.purpose} · </span>}
          <span>{ago(e.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

function OverdueBanner({ citizens }: { citizens: Citizen[] }) {
  if (citizens.length === 0) return null
  return (
    <div style={{
      background: RED + '10', border: `1px solid ${RED}44`,
      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: RED, fontSize: 12, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.5px' }}>
          ▲ {citizens.length} OVERDUE
        </span>
        <span style={{ color: MUTED, fontSize: 11 }}>— promised ETD has passed, 0 SF produced</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {citizens.map(c => (
          <div key={c.citizen_id} style={{
            background: CARD, border: `1px solid ${RED}33`, borderRadius: 8,
            padding: '8px 12px', minWidth: 180,
          }}>
            <div style={{ color: CYAN, fontFamily: MONO, fontSize: 10, marginBottom: 2 }}>{c.citizen_id}</div>
            <div style={{ color: SOFT, fontSize: 11, marginBottom: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ color: RED, fontSize: 10, fontFamily: MONO }}>ETD {fmtDate(c.promised_etd)}</span>
              <span style={{ color: MUTED, fontSize: 10 }}>{c.father}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BirthModal({ nodes, onClose, onBorn }: {
  nodes: NodeRow[]; onClose: () => void; onBorn: () => void
}) {
  const [father, setFather] = useState('')
  const [race, setRace] = useState('S')
  const [purpose, setPurpose] = useState('')
  const [etd, setEtd] = useState('')
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!father || !purpose) { setError('Father and purpose required'); return }
    setSaving(true)
    try {
      // Generate citizen_id: SRD-2026-X-XXXX pattern
      const year = new Date().getFullYear()
      const rand = Math.floor(Math.random() * 9000) + 1000
      const citizen_id = `SRD-${year}-${race}-${rand}`
      const res = await fetch('/api/local/reino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'birth', citizen_id, father, race,
          purpose, promised_etd: etd || null,
          order_qty_sf: parseFloat(qty) || 0,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Failed'); return }
      onBorn()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: BASE, border: `1px solid ${BORDER}`, borderRadius: 6,
    color: TEXT, fontSize: 13, padding: '8px 10px', width: '100%',
    outline: 'none', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' as const,
  }
  const labelStyle = { color: MUTED, fontSize: 11, marginBottom: 4, display: 'block' as const, letterSpacing: '0.4px', textTransform: 'uppercase' as const }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: 28, width: 420, boxShadow: '0 20px 60px #00000088',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', color: TEXT, fontWeight: 800, fontSize: 16 }}>
          <span style={{ color: CYAN }}>◉</span> New Citizen — Birth Event
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Father (Client)</label>
            <input style={inputStyle} value={father} onChange={e => setFather(e.target.value)} placeholder="PRARA, CAIHONG, KUMAR..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Race</label>
              <select style={{...inputStyle, cursor: 'pointer'}} value={race} onChange={e => setRace(e.target.value)}>
                {Object.entries(RACE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Order Qty (SF)</label>
              <input style={inputStyle} type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Purpose (Article)</label>
            <input style={inputStyle} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="1.5-1.7 SHEEP NAPPA BLACK..." />
          </div>
          <div>
            <label style={labelStyle}>Promised ETD</label>
            <input style={inputStyle} type="date" value={etd} onChange={e => setEtd(e.target.value)} />
          </div>
          {error && <div style={{ color: RED, fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, background: 'transparent', border: `1px solid ${BORDER}`,
              color: MUTED, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontSize: 13,
            }}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{
              flex: 2, background: CYAN, border: 'none', color: BASE,
              borderRadius: 8, padding: '10px 0', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Creating...' : '◉ Birth Citizen'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReinoBoard() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedNode, setSelectedNode] = useState<NodeRow | null>(null)
  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [loadingCitizens, setLoadingCitizens] = useState(false)
  const [showBirth, setShowBirth] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/local/reino')
      if (res.ok) {
        const d: Data = await res.json()
        setData(d)
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const loadCitizens = useCallback(async (father: string | null) => {
    setLoadingCitizens(true)
    try {
      const res = await fetch('/api/local/reino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'citizens_by_father', father, limit: 60 }),
      })
      if (res.ok) {
        const d = await res.json()
        setCitizens(d.citizens || [])
      }
    } finally {
      setLoadingCitizens(false)
    }
  }, [])

  const handleSelectNode = (node: NodeRow) => {
    if (selectedNode?.node_id === node.node_id) {
      setSelectedNode(null)
      setCitizens([])
    } else {
      setSelectedNode(node)
      loadCitizens(node.company)
    }
  }

  if (loading) {
    return (
      <div style={{ background: BASE, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: CYAN, fontFamily: MONO, fontSize: 13 }}>loading reino...</div>
      </div>
    )
  }
  if (!data) return null

  const { nodes, census, recent_events, overdue_citizens, top_citizens } = data

  return (
    <div style={{ background: BASE, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Arial, sans-serif' }}>
      {showBirth && (
        <BirthModal nodes={nodes} onClose={() => setShowBirth(false)} onBorn={load} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
            El Reino
          </h1>
          <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 12 }}>
            {census.total.toLocaleString()} citizens · {census.active} active · {census.delivered} delivered
            {census.overdue > 0 && <span style={{ color: RED, fontWeight: 700 }}> · {census.overdue} OVERDUE</span>}
            <span style={{ color: BORDER, margin: '0 6px' }}>·</span>
            updated {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={{
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: MUTED, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12,
          }}>↻ Refresh</button>
          <button onClick={() => setShowBirth(true)} style={{
            background: CYAN, border: 'none', color: BASE,
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
          }}>◉ New Citizen</button>
        </div>
      </div>

      {/* Census KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'TOTAL CITIZENS',  val: census.total.toLocaleString(),            color: CYAN },
          { label: 'ACTIVE',          val: census.active.toLocaleString(),            color: AMBER },
          { label: 'DELIVERED',       val: census.delivered.toLocaleString(),         color: GREEN },
          { label: 'OVERDUE',         val: census.overdue.toLocaleString(),           color: census.overdue > 0 ? RED : MUTED },
          { label: 'SF IN CENSUS',    val: (census.sf_total/1000).toFixed(0)+'K SF',  color: TEXT },
        ].map(m => (
          <div key={m.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ color: m.color, fontFamily: MONO, fontSize: 18, fontWeight: 700 }}>{m.val}</div>
            <div style={{ color: MUTED, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      <OverdueBanner citizens={overdue_citizens} />

      {/* Main 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16 }}>

        {/* Left — Nodes */}
        <div>
          <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Nodes ({nodes.length})
          </div>
          {nodes.map(n => (
            <NodeCard
              key={n.node_id} node={n}
              selected={selectedNode?.node_id === n.node_id}
              onSelect={() => handleSelectNode(n)}
            />
          ))}
        </div>

        {/* Center — Citizens */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              {selectedNode ? `${selectedNode.company} — Citizens` : 'Top Citizens by SF'}
            </span>
            {selectedNode && (
              <button onClick={() => { setSelectedNode(null); setCitizens([]) }} style={{
                background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 12,
              }}>✕ All</button>
            )}
          </div>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 80px 80px 60px',
            gap: 8, padding: '8px 12px', borderBottom: `1px solid ${BORDER}`,
          }}>
            {['ID', 'ARTICLE', 'STATUS', 'SF PROD', 'ETD'].map(h => (
              <span key={h} style={{ color: MUTED, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: h === 'SF PROD' ? 'right' : h === 'ETD' ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {loadingCitizens ? (
              <div style={{ padding: 24, textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 12 }}>loading...</div>
            ) : (
              (selectedNode ? citizens : top_citizens).map(c => (
                <CitizenRow key={c.citizen_id} c={c} />
              ))
            )}
            {!loadingCitizens && (selectedNode ? citizens : top_citizens).length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: MUTED, fontSize: 12 }}>No citizens found</div>
            )}
          </div>
        </div>

        {/* Right — DNA Event feed */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Pulso Vivo — DNA Events
            </span>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {recent_events.map((e, i) => (
              <EventRow key={`${e.citizen_id}-${e.event_type}-${i}`} e={e} />
            ))}
          </div>
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: MUTED, fontSize: 10 }}>BIRTH {census.total.toLocaleString()} · DELIVERY {census.delivered} · STATUS {recent_events.filter(e=>e.event_type==='STATUS_CHANGE').length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
