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

const fmtSF = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' SF'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: 'BLOQUEADO',   color: RED,   dot: RED },
  lab_ready:  { label: 'LAB LISTO',   color: AMBER, dot: AMBER },
  in_progress:{ label: 'PRODUCCIÓN',  color: CYAN,  dot: CYAN },
  qc:         { label: 'INSPECCIÓN',  color: '#a855f7', dot: '#a855f7' },
  completed:  { label: 'COMPLETADO',  color: GREEN, dot: GREEN },
}

function getStatusConfig(status: string, hasFormula: boolean) {
  if (status === 'pending' && !hasFormula) return STATUS_CONFIG['pending']
  if (status === 'pending' && hasFormula) return STATUS_CONFIG['lab_ready']
  return STATUS_CONFIG[status] || { label: status.toUpperCase(), color: MUTED, dot: MUTED }
}

interface Order {
  id: number
  qr_id: string
  customer: string
  sf: number
  status: string
  formula_id: number | null
  formula_name: string | null
  product_type: string | null
  color: string | null
  invoiced: boolean
  packed: boolean
  created_at: string
  blocker: string | null
}

interface Formula { id: number; name: string; article: string | null; color_ref: string | null }

interface Data {
  orders: Order[]
  formulas: Formula[]
  lab: { blocked_count: number; blocked_sf: number; blocked_orders: Order[] }
  stats: { sf_today: number; batches_today: number; operators_today: number; sf_week: number; batches_week: number }
  pipeline: { blocked: number; lab_ready: number; production: number; qc: number; completed: number }
}

export function OperacionesBoard() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<Record<number, boolean>>({})
  const [selectedFormula, setSelectedFormula] = useState<Record<number, number>>({})
  const [assignSuccess, setAssignSuccess] = useState<Record<number, boolean>>({})
  const [tab, setTab] = useState<'tracker' | 'lab'>('tracker')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/local/operaciones')
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const assignFormula = async (orderId: number) => {
    const fid = selectedFormula[orderId]
    if (!fid) return
    setAssigning(p => ({ ...p, [orderId]: true }))
    try {
      const res = await fetch('/api/local/operaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_formula', order_id: orderId, formula_id: fid }),
      })
      if (res.ok) {
        setAssignSuccess(p => ({ ...p, [orderId]: true }))
        setTimeout(() => {
          setAssignSuccess(p => ({ ...p, [orderId]: false }))
          load()
        }, 2000)
      }
    } finally {
      setAssigning(p => ({ ...p, [orderId]: false }))
    }
  }

  if (loading) {
    return (
      <div style={{ background: BASE, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>cargando operaciones...</div>
      </div>
    )
  }

  if (!data) return null

  const { orders, formulas, lab, stats, pipeline } = data
  const totalOrders = orders.length
  const blockedCount = lab.blocked_count

  return (
    <div style={{ background: BASE, minHeight: '100vh', padding: '28px 32px', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Operaciones
          </h1>
          <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 12 }}>
            Actualizado {lastRefresh.toLocaleTimeString('es-VN', { hour: '2-digit', minute: '2-digit' })}
            {blockedCount > 0 && (
              <span style={{ marginLeft: 12, color: RED, fontWeight: 700 }}>
                ⚠ {blockedCount} BLOQUEADA{blockedCount !== 1 ? 'S' : ''}
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

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'SF HOY', value: fmtSF(stats.sf_today), color: stats.sf_today > 0 ? CYAN : MUTED },
          { label: 'LOTES HOY', value: stats.batches_today.toString(), color: TEXT },
          { label: 'SF SEMANA', value: fmtSF(stats.sf_week), color: TEXT },
          { label: 'ÓRDENES TOTAL', value: totalOrders.toString(), color: TEXT },
          { label: 'BLOQUEADAS', value: blockedCount.toString(), color: blockedCount > 0 ? RED : GREEN },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>PIPELINE DE ÓRDENES</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { key: 'blocked',    label: 'Bloqueado', count: pipeline.blocked,    color: RED },
            { key: 'lab_ready',  label: 'Lab Listo',  count: pipeline.lab_ready,  color: AMBER },
            { key: 'production', label: 'Producción', count: pipeline.production, color: CYAN },
            { key: 'qc',         label: 'Inspección', count: pipeline.qc,         color: '#a855f7' },
            { key: 'completed',  label: 'Completado', count: pipeline.completed,  color: GREEN },
          ].map((stage, i) => (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  background: stage.count > 0 ? `${stage.color}20` : '#0C0E1280',
                  border: `1px solid ${stage.count > 0 ? stage.color + '60' : BORDER}`,
                  borderRadius: 6, padding: '10px 8px',
                }}>
                  <div style={{ color: stage.count > 0 ? stage.color : MUTED, fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                    {stage.count}
                  </div>
                  <div style={{ color: stage.count > 0 ? stage.color : MUTED, fontSize: 10, fontWeight: 600, marginTop: 3, letterSpacing: '0.05em' }}>
                    {stage.label}
                  </div>
                </div>
              </div>
              {i < 4 && (
                <div style={{ color: BORDER, fontSize: 16, margin: '0 4px', flexShrink: 0 }}>›</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'tracker', label: 'Order Tracker', count: totalOrders },
          { id: 'lab',     label: 'Lab — Asignar Fórmulas', count: blockedCount, alert: blockedCount > 0 },
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
            <span style={{
              background: t.alert ? RED + '30' : BORDER,
              color: t.alert ? RED : MUTED,
              borderRadius: 10, padding: '1px 8px', fontSize: 11,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Order Tracker Tab */}
      {tab === 'tracker' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['QR / ID', 'Cliente', 'SF', 'Fórmula', 'Estado', 'Docs', 'Fecha'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const sc = getStatusConfig(order.status, !!order.formula_id)
                  return (
                    <tr key={order.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? 'transparent' : '#ffffff04' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: CYAN, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                          {order.qr_id}
                        </div>
                        <div style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>#{order.id}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: SOFT, fontSize: 13 }}>{order.customer}</td>
                      <td style={{ padding: '12px 16px', color: TEXT, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        {fmtSF(order.sf)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {order.formula_name ? (
                          <span style={{ color: SOFT, fontSize: 12 }}>{order.formula_name}</span>
                        ) : (
                          <span style={{ color: RED, fontSize: 11, fontWeight: 700 }}>SIN FÓRMULA</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                          <span style={{ color: sc.color, fontSize: 11, fontWeight: 700 }}>{sc.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, color: order.packed ? GREEN : MUTED, fontWeight: 600 }}>
                            {order.packed ? '✓ PACKING' : '○ PACKING'}
                          </span>
                          <span style={{ fontSize: 10, color: order.invoiced ? GREEN : MUTED, fontWeight: 600 }}>
                            {order.invoiced ? '✓ INV' : '○ INV'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: MUTED, fontSize: 11 }}>
                        {new Date(order.created_at).toLocaleDateString('es-VN', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lab Tab */}
      {tab === 'lab' && (
        <div>
          {lab.blocked_orders.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${GREEN}40`, borderRadius: 8, padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ color: GREEN, fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ color: GREEN, fontSize: 16, fontWeight: 700 }}>Todas las órdenes tienen fórmula asignada</div>
              <div style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>No hay órdenes bloqueadas en este momento.</div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16, color: MUTED, fontSize: 12 }}>
                {lab.blocked_count} orden{lab.blocked_count !== 1 ? 'es' : ''} bloqueada{lab.blocked_count !== 1 ? 's' : ''} — {fmtSF(lab.blocked_sf)} en espera
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lab.blocked_orders.map(order => (
                  <div key={order.id} style={{ background: CARD, border: `1px solid ${RED}40`, borderRadius: 8, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ color: CYAN, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>
                            {order.qr_id}
                          </span>
                          <span style={{ background: `${RED}20`, color: RED, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                            SIN FÓRMULA
                          </span>
                        </div>
                        <div style={{ color: SOFT, fontSize: 13 }}>{order.customer}</div>
                        <div style={{ color: TEXT, fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                          {fmtSF(order.sf)}
                        </div>
                        {order.product_type && (
                          <div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>
                            {order.product_type}{order.color ? ` · ${order.color}` : ''}
                          </div>
                        )}
                        <div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>
                          Creada {new Date(order.created_at).toLocaleDateString('es-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {assignSuccess[order.id] ? (
                          <div style={{ color: GREEN, fontSize: 13, fontWeight: 700, padding: '10px 20px', background: `${GREEN}20`, borderRadius: 6 }}>
                            ✓ Asignada
                          </div>
                        ) : (
                          <>
                            <select
                              value={selectedFormula[order.id] || ''}
                              onChange={e => setSelectedFormula(p => ({ ...p, [order.id]: parseInt(e.target.value) }))}
                              style={{
                                background: BASE, border: `1px solid ${BORDER}`, color: selectedFormula[order.id] ? TEXT : MUTED,
                                padding: '9px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                                minWidth: 220,
                              }}
                            >
                              <option value="">Seleccionar fórmula...</option>
                              {formulas.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => assignFormula(order.id)}
                              disabled={!selectedFormula[order.id] || assigning[order.id]}
                              style={{
                                background: selectedFormula[order.id] ? CYAN : BORDER,
                                color: selectedFormula[order.id] ? '#0C0E12' : MUTED,
                                border: 'none', padding: '9px 20px', borderRadius: 6,
                                cursor: selectedFormula[order.id] ? 'pointer' : 'not-allowed',
                                fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                                opacity: assigning[order.id] ? 0.7 : 1,
                              }}
                            >
                              {assigning[order.id] ? 'Asignando...' : 'Asignar'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
