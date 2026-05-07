'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight,
  RefreshCw, TrendingUp, TrendingDown, Zap, Users,
  DollarSign, Package, Crosshair
} from 'lucide-react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SanctumData {
  production: { sf_today: number; sf_month: number; target_month: number; progress_pct: number; operators_today: number; visible_month?: string; is_fallback?: boolean }
  circuit: { blocked: number; lab_ready: number; production: number; inspection: number; invoiced: number; sf_pending: number }
  finance: { revenue_month: number; payables: number; overdue_count: number; overdue_usd: number; net: number }
  alerts: { low_chem_count: number; dep_alert: boolean }
  dependency: { top_client: string | null; top_pct: number; threshold: number; clients: { client: string; pct: number; revenue: number }[] }
  insight: string
  status: 'ALL_CLEAR' | 'ATTENTION' | 'CRITICAL'
  as_of: string
}

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#0C0E12', card: '#111318', border: '#1e293b',
  cyan: '#00C8D4', green: '#2ECC71', red: '#E63946',
  amber: '#F59E0B', text: '#e2e8f0', muted: '#64748b',
  dim: '#334155',
}

const STATUS_CONFIG = {
  ALL_CLEAR: { label: 'All Clear', color: C.green, bg: 'rgba(46,204,113,0.06)', border: 'rgba(46,204,113,0.2)', icon: CheckCircle2 },
  ATTENTION: { label: 'Attention', color: C.amber, bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', icon: AlertTriangle },
  CRITICAL:  { label: 'Critical',  color: C.red,   bg: 'rgba(230,57,70,0.06)',  border: 'rgba(230,57,70,0.2)',  icon: AlertTriangle },
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtSF  = (n: number) => n.toLocaleString('en-US')
const fmtUSD = (n: number) => n < 0
  ? `-$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  : `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
const fmtDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

// ── Arc Progress ──────────────────────────────────────────────────────────────

function ArcProgress({ pct, size = 140 }: { pct: number; size?: number }) {
  const r = size * 0.38
  const cx = size / 2
  const cy = size / 2 + 10
  const startAngle = -200
  const endAngle = 20
  const range = endAngle - startAngle
  const fillAngle = startAngle + (range * Math.min(pct, 100) / 100)

  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const start = toXY(startAngle)
  const end = toXY(endAngle)
  const fill = toXY(fillAngle)
  const largeArc = range > 180 ? 1 : 0
  const fillLarge = (fillAngle - startAngle) > 180 ? 1 : 0

  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  const fillPath = pct > 0 ? `M ${start.x} ${start.y} A ${r} ${r} 0 ${fillLarge} 1 ${fill.x} ${fill.y}` : ''

  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`} className="overflow-visible">
      <path d={trackPath} fill="none" stroke={C.border} strokeWidth={6} strokeLinecap="round" />
      {fillPath && (
        <motion.path
          d={fillPath} fill="none"
          stroke={pct >= 80 ? C.cyan : pct >= 50 ? C.amber : C.red}
          strokeWidth={6} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}
    </svg>
  )
}

// ── Panel Card ────────────────────────────────────────────────────────────────

function Panel({ title, icon: Icon, href, children, alert }: {
  title: string; icon: any; href?: string; children: React.ReactNode; alert?: boolean
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{
      background: C.card,
      border: `1px solid ${alert ? C.red + '40' : C.border}`,
    }}>
      <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <h3 style={{ fontSize: 10, fontWeight: 700, color: C.text, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
          <Icon size={12} color={alert ? C.red : C.cyan} />
          {title}
        </h3>
        {href && (
          <Link href={href} style={{ fontSize: 10, color: C.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            open <ChevronRight size={10} />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

function Metric({ value, label, sub, color }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, color: color || C.text, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{sub}</p>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SanctumBoard() {
  const [data, setData] = useState<SanctumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/local/sanctum')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Crosshair size={32} color={C.cyan} />
        </motion.div>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 12 }}>Loading Sanctum...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <AlertTriangle size={32} color={C.red} style={{ margin: '0 auto 12px' }} />
        <p style={{ color: C.red, fontSize: 14, fontWeight: 600 }}>{error || 'No data'}</p>
        <button onClick={load} style={{ marginTop: 16, padding: '8px 20px', background: C.cyan + '20', border: `1px solid ${C.cyan}40`, color: C.cyan, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    </div>
  )

  const { production: prod, circuit, finance, dependency, insight, status, as_of } = data
  const sc = STATUS_CONFIG[status]
  const StatusIcon = sc.icon
  const isCritical = status === 'CRITICAL'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.cyan + '15', border: `1px solid ${C.cyan}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crosshair size={16} color={C.cyan} />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.3px', margin: 0 }}>
                  Serendipity OS
                </h1>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, letterSpacing: '0.06em' }}>
                  {fmtDate()} · {fmtTime(as_of)}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={isCritical ? { scale: [1, 1.03, 1] } : {}}
              transition={isCritical ? { duration: 2, repeat: Infinity } : {}}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 999, background: sc.bg, border: `1px solid ${sc.border}`,
              }}
            >
              {isCritical && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, animation: 'pulse 1.5s infinite' }} />}
              <StatusIcon size={13} color={sc.color} />
              <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {sc.label}
              </span>
            </motion.div>
            <button
              onClick={load}
              style={{ padding: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={14} color={C.muted} />
            </button>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* VITALES — top left */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Panel title="Vitales del Mes" icon={Activity} href="/dashboard/operaciones">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ArcProgress pct={prod.progress_pct} size={130} />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -30%)', textAlign: 'center' }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1, margin: 0 }}>
                      {prod.progress_pct}%
                    </p>
                    <p style={{ fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>target</p>
                  </div>
                </div>
                {prod.is_fallback && (
                  <div style={{ marginTop: 6, padding: '3px 8px', background: C.amber + '15', border: `1px solid ${C.amber}40`, borderRadius: 4, display: 'inline-block' }}>
                    <span style={{ fontSize: 9, color: C.amber, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {prod.visible_month} · último activo
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
                  <Metric
                    value={fmtSF(prod.sf_month)}
                    label={prod.visible_month ? `SF ${prod.visible_month.split(' ')[0]}` : 'SF este mes'}
                    sub={`meta: ${fmtSF(prod.target_month)} SF`}
                    color={prod.progress_pct >= 80 ? C.cyan : prod.progress_pct >= 50 ? C.amber : C.red}
                  />
                  <Metric
                    value={prod.sf_today > 0 ? fmtSF(prod.sf_today) : '—'}
                    label="SF hoy"
                    sub={prod.operators_today > 0 ? `${prod.operators_today} rol${prod.operators_today > 1 ? 'es' : ''} activo${prod.operators_today > 1 ? 's' : ''}` : 'Sin actividad hoy'}
                    color={prod.sf_today > 0 ? C.text : C.muted}
                  />
                </div>
              </div>
            </Panel>
          </motion.div>

          {/* CIRCUITO — top right */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Panel title="Circuito de Producción" icon={Zap} href="/dashboard/director" alert={circuit.blocked > 0}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Bloqueadas', value: circuit.blocked, color: circuit.blocked > 0 ? C.red : C.muted, warn: circuit.blocked > 0 },
                  { label: 'Lab Ready', value: circuit.lab_ready, color: circuit.lab_ready > 0 ? C.amber : C.muted },
                  { label: 'Producción', value: circuit.production, color: circuit.production > 0 ? C.cyan : C.muted },
                  { label: 'Inspección', value: circuit.inspection, color: circuit.inspection > 0 ? C.cyan : C.muted },
                  { label: 'Facturadas', value: circuit.invoiced, color: circuit.invoiced > 0 ? C.green : C.muted },
                  { label: 'SF pendiente', value: fmtSF(circuit.sf_pending), color: C.muted, small: true },
                ].map(item => (
                  <div key={item.label} style={{ background: '#0C0E12', borderRadius: 8, padding: '10px 12px', border: `1px solid ${item.warn ? C.red + '30' : C.border}` }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: item.small ? 13 : 20, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1.1 }}>
                      {item.value}
                    </p>
                    <p style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '3px 0 0' }}>{item.label}</p>
                  </div>
                ))}
              </div>
              {circuit.blocked > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: C.red + '10', borderRadius: 6, border: `1px solid ${C.red}25` }}>
                  <AlertTriangle size={12} color={C.red} />
                  <span style={{ fontSize: 11, color: C.red }}>
                    {circuit.sf_pending.toLocaleString()} SF bloqueados sin fórmula
                  </span>
                  <Link href="/dashboard/director" style={{ fontSize: 11, color: C.cyan, textDecoration: 'none', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                    resolver <ChevronRight size={10} />
                  </Link>
                </div>
              )}
            </Panel>
          </motion.div>

          {/* FINANZAS — bottom left */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Panel title="Posición Financiera" icon={DollarSign} href="/dashboard/finanzas" alert={finance.overdue_count > 0}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Metric value={fmtUSD(finance.revenue_month)} label="Revenue mes" color={C.green} />
                <Metric value={fmtUSD(finance.payables)} label="Payables" color={finance.payables > finance.revenue_month ? C.red : C.amber} />
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: finance.net >= 0 ? C.cyan : C.red, margin: 0 }}>
                      {fmtUSD(finance.net)}
                    </p>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '2px 0 0' }}>posición neta</p>
                  </div>
                  {finance.net >= 0
                    ? <TrendingUp size={20} color={C.green} />
                    : <TrendingDown size={20} color={C.red} />
                  }
                </div>
                {finance.overdue_count > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: C.red + '10', borderRadius: 6, border: `1px solid ${C.red}25` }}>
                    <AlertTriangle size={11} color={C.red} />
                    <span style={{ fontSize: 11, color: C.red }}>
                      {finance.overdue_count} factura{finance.overdue_count > 1 ? 's' : ''} vencida{finance.overdue_count > 1 ? 's' : ''} — USD {finance.overdue_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>

          {/* SOPHIA INSIGHT — bottom right */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Panel title="Sophia — Lectura del Sistema" icon={Package} href="/dashboard/sophia">
              <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                <div style={{ width: 3, borderRadius: 2, background: `linear-gradient(to bottom, ${C.cyan}, ${C.cyan}30)`, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: 0 }}>
                  {insight}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { label: 'Director Board', href: '/dashboard/director' },
                  { label: 'Operaciones', href: '/dashboard/operaciones' },
                  { label: 'Finanzas', href: '/dashboard/finanzas' },
                ].map(item => (
                  <Link key={item.href} href={item.href} style={{
                    fontSize: 11, color: C.muted, textDecoration: 'none', padding: '4px 10px',
                    background: '#0C0E12', borderRadius: 6, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s',
                  }}>
                    {item.label} <ChevronRight size={9} />
                  </Link>
                ))}
              <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Concentración cliente
                  </span>
                  <span style={{ fontSize: 11, fontFamily: "\'JetBrains Mono\', monospace", color: dependency.top_pct > 90 ? C.red : dependency.top_pct > 70 ? C.amber : C.green, fontWeight: 700 }}>
                    {dependency.top_client || '—'}{dependency.top_pct > 0 ? ' ' + dependency.top_pct + '%' : ''}
                  </span>
                </div>
                <div style={{ background: C.card, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${Math.min(dependency.top_pct, 100)}%`,
                    background: dependency.top_pct > 90 ? C.red : dependency.top_pct > 70 ? C.amber : C.green,
                    transition: 'width 0.6s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                  <span style={{ fontSize: 9, color: dependency.top_pct > 70 ? C.amber : C.muted }}>
                    {dependency.top_pct > 70 ? `⚠ umbral ${dependency.threshold}% superado` : `objetivo < ${dependency.threshold}%`}
                  </span>
                </div>
              </div>
              </div>
            </Panel>
          </motion.div>
        </div>

        {/* Floor Bar */}
        {prod.operators_today > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ marginTop: 14, padding: '10px 16px', background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <Users size={13} color={C.muted} />
            <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>Piso hoy</span>
            <span style={{ fontSize: 12, color: C.text }}>
              {prod.operators_today} rol{prod.operators_today > 1 ? 'es' : ''} activo{prod.operators_today > 1 ? 's' : ''} en producción
            </span>
            <Link href="/dashboard/operaciones" style={{ marginLeft: 'auto', fontSize: 11, color: C.cyan, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              ver detalle <ChevronRight size={10} />
            </Link>
          </motion.div>
        )}

      </div>
    </div>
  )
}
