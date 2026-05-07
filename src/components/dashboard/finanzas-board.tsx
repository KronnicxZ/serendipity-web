'use client'

import { useEffect, useState, useCallback } from 'react'

const BASE = '#0C0E12'
const CARD = '#111318'
const BORDER = '#1e293b'
const CYAN = '#00C8D4'
const RED = '#E63946'
const GREEN = '#2ECC71'
const AMBER = '#F59E0B'
const MUTED = '#64748b'
const TEXT = '#f1f5f9'
const SOFT = '#cbd5e1'

const fmtUSD = (n: number) => `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtSF = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' SF'

interface Invoice { code: string; sf: number; usd: number; currency: string; status: string; created_at: string }
interface Payable { id: number; vendor: string; amount: number; due_date: string | null; status: string; description: string | null }

interface ClientRow { client: string; sf: number; revenue: number; pct: number }

interface Data {
  summary: {
    revenue_month: number; sf_month: number; payables_total: number
    payroll_month: number; net_month: number; overdue_count: number; overdue_total: number
    prara_pct: number; top_client: string | null
    prara_review_days?: number; prara_review_date?: string
    payables_current?: number; payables_arrears?: number
    visible_month?: string; is_fallback?: boolean; effective_rate?: number
  }
  client_breakdown: ClientRow[]
  invoices: Invoice[]
  payables: Payable[]
  monthly_trend: { month: string; sf: number; revenue: number }[]
  cost_breakdown: { category: string; cost_type: string; total: number; pct_of_total: number; items: any[] }[]
  margin_analysis: {
    break_even_sf: number; fixed_monthly: number; variable_per_sf: number
    curve: { sf: number; rate_020: number; rate_022: number; rate_025: number; cost_per_sf: number; margin_pct_022: number }[]
  }
  monthly_pl: { month: string; sf: number; revenue: number; estimated_costs: number; estimated_net: number }[]
  simulator_defaults: {
    sf_volume: number; rate_per_sf: number; payroll: number
    rent: number; chemicals: number; other_costs: number
  }
}

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:   { label: 'BORRADOR', color: MUTED },
  SENT:    { label: 'ENVIADA',  color: AMBER },
  PAID:    { label: 'PAGADA',   color: GREEN },
  OVERDUE: { label: 'VENCIDA',  color: RED },
}

export function FinanzasBoard() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [tab, setTab] = useState<'resumen' | 'costos' | 'margen' | 'facturas' | 'pagos' | 'simulador'>('resumen')

  // Simulator state
  const [simSF, setSimSF] = useState(120000)
  const [simRate, setSimRate] = useState(0.22)
  const [simPayroll, setSimPayroll] = useState(13860)
  const [simRent, setSimRent] = useState(5000)
  const [simChemicals, setSimChemicals] = useState(8000)
  const [simOther, setSimOther] = useState(2000)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/local/finanzas')
      if (res.ok) {
        const d: Data = await res.json()
        setData(d)
        setLastRefresh(new Date())
        const def = d.simulator_defaults
        setSimSF(def.sf_volume || 120000)
        setSimRate(def.rate_per_sf || 0.22)
        setSimPayroll(def.payroll || 13860)
        setSimRent(def.rent || 5000)
        setSimChemicals(def.chemicals || 8000)
        setSimOther(def.other_costs || 2000)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const simRevenue = simSF * simRate
  const simCosts = simPayroll + simRent + simChemicals + simOther
  const simNet = simRevenue - simCosts
  const simMargin = simRevenue > 0 ? (simNet / simRevenue) * 100 : 0

  if (loading) {
    return (
      <div style={{ background: BASE, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>cargando finanzas...</div>
      </div>
    )
  }

  if (!data) return null

  const { summary, invoices, payables, monthly_trend, cost_breakdown, margin_analysis, monthly_pl } = data

  return (
    <div style={{ background: BASE, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Finanzas
          </h1>
          <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 12 }}>
            Actualizado {lastRefresh.toLocaleTimeString('es-VN', { hour: '2-digit', minute: '2-digit' })}
            {summary.overdue_count > 0 && (
              <span style={{ marginLeft: 12, color: RED, fontWeight: 700 }}>
                ⚠ {summary.overdue_count} FACTURA{summary.overdue_count !== 1 ? 'S' : ''} VENCIDA{summary.overdue_count !== 1 ? 'S' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Actualizar
        </button>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'REVENUE ESTE MES', value: fmtUSD(summary.revenue_month), sub: fmtSF(summary.sf_month) + ' procesados', color: CYAN },
          { label: 'NÓMINA MENSUAL',   value: fmtUSD(summary.payroll_month), sub: 'costo fijo', color: SOFT },
          { label: 'CUENTAS POR PAGAR', value: fmtUSD(summary.payables_total), sub: `${payables.length} pendientes`, color: summary.payables_total > 20000 ? AMBER : SOFT },
          { label: 'FACTURAS VENCIDAS', value: summary.overdue_count > 0 ? fmtUSD(summary.overdue_total) : '— Sin vencidas', sub: summary.overdue_count > 0 ? `${summary.overdue_count} factura(s)` : 'Al día', color: summary.overdue_count > 0 ? RED : GREEN },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'resumen',    label: 'Resumen' },
          { id: 'costos',     label: 'Costos' },
          { id: 'margen',     label: 'Margen PRARA' },
          { id: 'facturas',   label: 'Facturas', count: invoices.length },
          { id: 'pagos',      label: 'Cuentas por Pagar', count: payables.length, alert: payables.length > 0 },
          { id: 'simulador',  label: 'Simulador P&L' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              background: tab === t.id ? `${CYAN}18` : 'transparent',
              border: `1px solid ${tab === t.id ? CYAN + '60' : BORDER}`,
              color: tab === t.id ? CYAN : MUTED,
              padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                background: t.alert ? AMBER + '30' : BORDER,
                color: t.alert ? AMBER : MUTED,
                borderRadius: 10, padding: '1px 8px', fontSize: 11,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Resumen Tab */}
      {tab === 'resumen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* P&L Snapshot */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 16 }}>P&L ESTE MES (ESTIMADO)</div>
            {[
              { label: `Revenue${summary.effective_rate ? ' (SF × $' + summary.effective_rate.toFixed(3) + ')' : ''}`, value: fmtUSD(summary.revenue_month), color: GREEN, sign: '+' },
              { label: 'Nómina',               value: `− ${fmtUSD(summary.payroll_month)}`, color: RED, sign: '' },
              { label: 'Cuentas por pagar',    value: `− ${fmtUSD(summary.payables_total)}`, color: AMBER, sign: '' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: SOFT, fontSize: 13 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 0' }}>
              <span style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>Neto estimado</span>
              <span style={{
                color: summary.net_month >= 0 ? GREEN : RED,
                fontSize: 18, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
              }}>
                {fmtUSD(summary.net_month)}
              </span>
            </div>
          </div>

          {/* PRARA Dependency */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 16 }}>CONCENTRACIÓN DE CLIENTE</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: SOFT, fontSize: 13 }}>{summary.top_client || 'PRARA'}</span>
                <span style={{ color: summary.prara_pct > 80 ? RED : AMBER, fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{summary.prara_pct > 0 ? summary.prara_pct + '%' : '82%'}</span>
              </div>
              <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(summary.prara_pct || 82, 100)}%`, height: '100%', background: (summary.prara_pct || 82) > 80 ? RED : AMBER, borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>
              Alta concentración en un solo cliente es riesgo estructural.
              Meta: diversificar a 3+ clientes ≥ 15% cada uno.
            </div>
            {summary.prara_review_days !== undefined && summary.prara_review_days <= 30 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: summary.prara_review_days <= 7 ? `${RED}15` : `${AMBER}12`, border: `1px solid ${summary.prara_review_days <= 7 ? RED : AMBER}40`, borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: summary.prara_review_days <= 7 ? RED : AMBER, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                    REVISIÓN DE TARIFA PRARA
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 900, color: summary.prara_review_days <= 7 ? RED : AMBER }}>
                    {summary.prara_review_days}d
                  </div>
                </div>
                <div style={{ color: SOFT, fontSize: 12, marginTop: 4 }}>
                  {summary.prara_review_date} · Tarifa actual ${(summary.effective_rate || 0.22).toFixed(3)}/SF · Objetivo: negociar alza
                </div>
              </div>
            )}
            {summary.payables_arrears !== undefined && summary.payables_arrears > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: `${MUTED}10`, border: `1px solid ${MUTED}30`, borderRadius: 6 }}>
                <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>DEUDA ACUMULADA (no incluida en neto)</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: SOFT }}>{fmtUSD(summary.payables_arrears)}</div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* COSTOS TAB */}
      {tab === 'costos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>
              COSTOS OPERATIVOS — CLASIFICADOS POR COMARCA
            </div>
            {(cost_breakdown || []).filter(c => c.category !== 'DEUDA_HISTORICA').map(cat => (
              <div key={cat.category} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: TEXT }}>
                      {cat.category}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                      background: cat.cost_type === 'fijo' ? CYAN + '20' : AMBER + '20',
                      color: cat.cost_type === 'fijo' ? CYAN : AMBER,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const
                    }}>
                      {cat.cost_type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TEXT }}>
                      {fmtUSD(cat.total)}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: MUTED, minWidth: 40, textAlign: 'right' }}>
                      {cat.pct_of_total}%
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.min(cat.pct_of_total, 100)}%`,
                    background: cat.cost_type === 'fijo' ? CYAN : AMBER,
                    transition: 'width 0.6s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {cat.items.filter((i: any) => i.status !== 'historical').slice(0, 5).map((item: any, idx: number) => (
                    <span key={idx} style={{
                      fontSize: 10, color: MUTED, padding: '2px 8px',
                      background: '#ffffff08', borderRadius: 4, border: `1px solid ${BORDER}`
                    }}>
                      {item.vendor} · {fmtUSD(item.amount)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Deuda estructural separada */}
          {(cost_breakdown || []).filter(c => c.category === 'DEUDA_HISTORICA').map(cat => (
            <div key="hist" style={{ background: CARD, border: `1px solid ${MUTED}30`, borderRadius: 8, padding: '14px 20px', opacity: 0.7 }}>
              <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                DEUDA HISTÓRICA — SEPARADA DEL P&L OPERATIVO
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: MUTED }}>DELFI + GUNA TARUS + GREAT FORTUNE</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: MUTED }}>
                  {fmtUSD(cat.total)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                No incluida en P&L operativo. Plan de cancelación independiente.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MARGEN TAB */}
      {tab === 'margen' && margin_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* P&L historico */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>
              P&L HISTÓRICO — CAPA TEMPORAL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {(monthly_pl || []).map((row, i) => {
                const d = new Date(row.month)
                const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                const isPositive = row.estimated_net >= 0
                return (
                  <div key={i} style={{
                    background: '#0C0E12', borderRadius: 8, padding: '12px 14px',
                    border: `1px solid ${isPositive ? GREEN + '30' : RED + '30'}`
                  }}>
                    <div style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: MUTED, marginBottom: 2 }}>
                      {(row.sf/1000).toFixed(0)}K SF
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: GREEN }}>
                      + {fmtUSD(row.revenue)}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: MUTED }}>
                      - {fmtUSD(row.estimated_costs)}
                    </div>
                    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 6, paddingTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: isPositive ? GREEN : RED }}>
                      {isPositive ? '+' : ''}{fmtUSD(row.estimated_net)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Break-even + estructura de costos */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>
              ESTRUCTURA DE COSTOS PRARA
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#0C0E12', borderRadius: 8, padding: '12px 14px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>COSTO FIJO / MES</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: CYAN, marginTop: 4 }}>
                  {fmtUSD(margin_analysis.fixed_monthly)}
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>infraestructura + nómina + admin</div>
              </div>
              <div style={{ background: '#0C0E12', borderRadius: 8, padding: '12px 14px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>COSTO VARIABLE / SF</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: AMBER, marginTop: 4 }}>
                  ${margin_analysis.variable_per_sf.toFixed(3)}
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>energía + insumos + logística</div>
              </div>
              <div style={{ background: '#0C0E12', borderRadius: 8, padding: '12px 14px', border: `1px solid ${GREEN}30` }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>BREAK-EVEN</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color: GREEN, marginTop: 4 }}>
                  {(margin_analysis.break_even_sf/1000).toFixed(0)}K SF
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>por mes para cubrir costos</div>
              </div>
            </div>

            {/* Curva de margen */}
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
              MARGEN POR VOLUMEN — 3 ESCENARIOS DE TARIFA
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['SF / mes', 'Costo/SF', '$0.20/SF', '$0.22/SF (actual)', '$0.25/SF'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'right', color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {margin_analysis.curve.map((row, i) => {
                    const isBreakEven = row.sf >= margin_analysis.break_even_sf && margin_analysis.curve[i > 0 ? i-1 : 0].sf < margin_analysis.break_even_sf
                    return (
                      <tr key={row.sf} style={{
                        borderBottom: `1px solid ${BORDER}20`,
                        background: isBreakEven ? GREEN + '08' : 'transparent'
                      }}>
                        <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: TEXT, fontWeight: row.sf === 150000 ? 800 : 400 }}>
                          {(row.sf/1000).toFixed(0)}K {isBreakEven ? '← break-even' : ''}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: MUTED }}>
                          ${row.cost_per_sf.toFixed(3)}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: row.rate_020 >= 0 ? GREEN : RED }}>
                          {row.rate_020 >= 0 ? '+' : ''}{fmtUSD(row.rate_020 * row.sf)}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', fontWeight: 700, color: row.rate_022 >= 0 ? GREEN : RED }}>
                          {row.rate_022 >= 0 ? '+' : ''}{fmtUSD(row.rate_022 * row.sf)}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: row.rate_025 >= 0 ? GREEN : RED }}>
                          {row.rate_025 >= 0 ? '+' : ''}{fmtUSD(row.rate_025 * row.sf)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Facturas Tab */}
      {tab === 'facturas' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Código', 'SF', 'Monto (USD)', 'Estado', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const sc = INVOICE_STATUS[inv.status] || { label: inv.status, color: MUTED }
                return (
                  <tr key={inv.code} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? 'transparent' : '#ffffff04' }}>
                    <td style={{ padding: '12px 16px', color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>
                      {inv.code}
                    </td>
                    <td style={{ padding: '12px 16px', color: SOFT, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtSF(inv.sf)}
                    </td>
                    <td style={{ padding: '12px 16px', color: TEXT, fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtUSD(inv.usd)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: `${sc.color}20`, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4 }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: MUTED, fontSize: 12 }}>
                      {new Date(inv.created_at).toLocaleDateString('es-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagos Tab */}
      {tab === 'pagos' && (
        <div>
          {payables.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${GREEN}40`, borderRadius: 8, padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ color: GREEN, fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ color: GREEN, fontSize: 16, fontWeight: 700 }}>Sin cuentas por pagar pendientes</div>
            </div>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Proveedor', 'Monto (USD)', 'Categoría', 'Vencimiento', 'Descripción'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p, i) => {
                    const isOverdue = p.due_date && new Date(p.due_date) < new Date()
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? 'transparent' : '#ffffff04' }}>
                        <td style={{ padding: '12px 16px', color: SOFT, fontSize: 13, fontWeight: 600 }}>{p.vendor}</td>
                        <td style={{ padding: '12px 16px', color: isOverdue ? RED : TEXT, fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                          {fmtUSD(p.amount)}
                        </td>
                        <td style={{ padding: '12px 16px', color: isOverdue ? RED : MUTED, fontSize: 12, fontWeight: isOverdue ? 700 : 400 }}>
                          {p.due_date ? new Date(p.due_date).toLocaleDateString('es-VN', { day: '2-digit', month: 'short' }) : '—'}
                          {isOverdue && <span style={{ marginLeft: 6, fontSize: 10 }}>VENCIDA</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: MUTED, fontSize: 12 }}>{p.description || '—'}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '12px 16px', color: TEXT, fontSize: 13, fontWeight: 700 }}>TOTAL</td>
                    <td style={{ padding: '12px 16px', color: AMBER, fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtUSD(summary.payables_total)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Simulador Tab */}
      {tab === 'simulador' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          {/* Sliders */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px 28px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 20 }}>PARÁMETROS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* SF Volume */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: SOFT, fontSize: 13 }}>Volumen SF</span>
                  <span style={{ color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>{fmtSF(simSF)}</span>
                </div>
                <input
                  type="range" min={10000} max={250000} step={5000} value={simSF}
                  onChange={e => setSimSF(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: CYAN }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: MUTED, fontSize: 10 }}>10,000 SF</span>
                  <span style={{ color: MUTED, fontSize: 10 }}>250,000 SF</span>
                </div>
              </div>

              {/* Rate per SF */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: SOFT, fontSize: 13 }}>Tarifa (USD/SF)</span>
                  <span style={{ color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>USD {simRate.toFixed(3)}</span>
                </div>
                <input
                  type="range" min={0.10} max={0.50} step={0.005} value={simRate}
                  onChange={e => setSimRate(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: CYAN }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: MUTED, fontSize: 10 }}>USD 0.10/SF</span>
                  <span style={{ color: MUTED, fontSize: 10 }}>USD 0.50/SF</span>
                </div>
              </div>

              {/* Payroll */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: SOFT, fontSize: 13 }}>Nómina mensual</span>
                  <span style={{ color: RED, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>{fmtUSD(simPayroll)}</span>
                </div>
                <input
                  type="range" min={5000} max={30000} step={500} value={simPayroll}
                  onChange={e => setSimPayroll(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: RED }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: MUTED, fontSize: 10 }}>USD 5,000</span>
                  <span style={{ color: MUTED, fontSize: 10 }}>USD 30,000</span>
                </div>
              </div>

              {/* Rent */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: SOFT, fontSize: 13 }}>Alquiler mensual</span>
                  <span style={{ color: RED, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>{fmtUSD(simRent)}</span>
                </div>
                <input
                  type="range" min={0} max={20000} step={500} value={simRent}
                  onChange={e => setSimRent(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: RED }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: MUTED, fontSize: 10 }}>USD 0</span>
                  <span style={{ color: MUTED, fontSize: 10 }}>USD 20,000</span>
                </div>
              </div>

              {/* Chemicals */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: SOFT, fontSize: 13 }}>Químicos / insumos</span>
                  <span style={{ color: RED, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>{fmtUSD(simChemicals)}</span>
                </div>
                <input
                  type="range" min={0} max={30000} step={500} value={simChemicals}
                  onChange={e => setSimChemicals(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: RED }}
                />
              </div>

              {/* Other */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: SOFT, fontSize: 13 }}>Otros costos</span>
                  <span style={{ color: RED, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>{fmtUSD(simOther)}</span>
                </div>
                <input
                  type="range" min={0} max={10000} step={200} value={simOther}
                  onChange={e => setSimOther(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: RED }}
                />
              </div>

            </div>
          </div>

          {/* Results Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Net Result — hero number */}
            <div style={{
              background: simNet >= 0 ? `${GREEN}15` : `${RED}15`,
              border: `1px solid ${simNet >= 0 ? GREEN + '50' : RED + '50'}`,
              borderRadius: 8, padding: '24px 24px', textAlign: 'center',
            }}>
              <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 12 }}>RESULTADO NETO</div>
              <div style={{ color: simNet >= 0 ? GREEN : RED, fontSize: 36, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                {simNet >= 0 ? '+' : ''}{fmtUSD(simNet)}
              </div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>
                Margen {simMargin >= 0 ? '+' : ''}{simMargin.toFixed(1)}%
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 20px' }}>
              <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>DESGLOSE</div>
              {[
                { label: 'Revenue',          value: simRevenue,   color: GREEN,  sign: '+' },
                { label: 'Nómina',           value: simPayroll,   color: RED,    sign: '−' },
                { label: 'Alquiler',         value: simRent,      color: AMBER,  sign: '−' },
                { label: 'Químicos',         value: simChemicals, color: AMBER,  sign: '−' },
                { label: 'Otros',            value: simOther,     color: AMBER,  sign: '−' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: SOFT, fontSize: 12 }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {row.sign} {fmtUSD(row.value)}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0' }}>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Neto</span>
                <span style={{ color: simNet >= 0 ? GREEN : RED, fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmtUSD(simNet)}
                </span>
              </div>
            </div>

            {/* Break-even */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>BREAK-EVEN</div>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtSF(Math.ceil(simCosts / simRate))}
              </div>
              <div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>
                mínimo para cubrir costos a USD {simRate.toFixed(3)}/SF
              </div>
            </div>

            {/* Reset to actuals */}
            <button
              onClick={() => {
                if (data) {
                  const def = data.simulator_defaults
                  setSimSF(def.sf_volume || 120000)
                  setSimRate(def.rate_per_sf || 0.22)
                  setSimPayroll(def.payroll || 13860)
                  setSimRent(def.rent || 5000)
                  setSimChemicals(def.chemicals || 8000)
                  setSimOther(def.other_costs || 2000)
                }
              }}
              style={{
                background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED,
                padding: '9px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, width: '100%',
              }}
            >
              Restaurar valores reales
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
