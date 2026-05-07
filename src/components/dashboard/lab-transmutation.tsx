'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, Sparkles, CheckCircle2, Circle, Zap, Star, Trophy, ChevronRight, Plus, Minus, X, AlertTriangle, Package, Beaker, Atom } from 'lucide-react'

// ── Theme ──────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0A0C10',
  card:    '#111318',
  border:  '#1E2330',
  surface: '#181C25',
  cyan:    '#00C8D4',
  purple:  '#8B5CF6',
  amber:   '#F59E0B',
  green:   '#10B981',
  red:     '#EF4444',
  muted:   '#4B5563',
  text:    '#E2E8F0',
  sub:     '#94A3B8',
  mono:    "'JetBrains Mono', monospace",
}

// ── Sofia dialogue per step ────────────────────────────────────────────────
const SOFIA_DIALOGUE: Record<number, string[]> = {
  0: [
    '¡Hola! Soy Sofia, tu guía en el laboratorio. ¿Qué lote vamos a transformar hoy?',
    'Selecciona el lote para comenzar la transmutación. Cada uno tiene su historia.',
    'El lote que elijas define la base de todo lo que viene después.',
  ],
  1: [
    '¡Excelente elección! Ahora selecciona la fórmula base o crea una nueva.',
    'La fórmula es el ADN de la transmutación. Elige sabiamente.',
    'Cada fórmula tiene su costo estimado. Puedes editarla o partir desde cero.',
  ],
  2: [
    '¡Ahora la magia! Agrega los ingredientes al crisol. El stock en verde está disponible.',
    'Cada químico que agregas suma puntos y define el costo real del batch.',
    'Si el stock aparece en rojo, necesitaremos hacer un pedido de compra.',
  ],
  3: [
    'Revisión final antes de la transmutación. ¿Todo en orden?',
    '¡Perfecto! Al confirmar, Tuyen y Thuy recibirán su señal para preparar los materiales.',
    'Las 3 luces deben encenderse antes de pasar a la sala de máquinas.',
  ],
  4: [
    '¡TRANSMUTACIÓN INICIADA! Las señales fueron enviadas al equipo.',
    'Ahora esperamos las 3 luces: Fórmula ✓ · Químicos · Material · ¡Listo para producción!',
    '',
  ],
}

function SofiaGuide({ step, points }: { step: number; points: number }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const msgs = SOFIA_DIALOGUE[step] || SOFIA_DIALOGUE[0]

  useEffect(() => { setMsgIdx(0) }, [step])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
      {/* Sofia avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <motion.div
          animate={{ boxShadow: [`0 0 10px ${C.cyan}40`, `0 0 20px ${C.cyan}80`, `0 0 10px ${C.cyan}40`] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
          }}
        >S</motion.div>
        {points > 0 && (
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            background: C.amber, borderRadius: 8, padding: '1px 5px',
            fontSize: 9, fontWeight: 700, color: '#000', fontFamily: C.mono,
          }}>{points}</div>
        )}
      </div>
      {/* Bubble */}
      <motion.div
        key={`${step}-${msgIdx}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          background: C.surface, border: `1px solid ${C.cyan}40`,
          borderRadius: '4px 16px 16px 16px', padding: '12px 16px',
          fontSize: 13, color: C.text, lineHeight: 1.5, flex: 1, cursor: 'pointer',
        }}
        onClick={() => setMsgIdx(i => (i + 1) % msgs.length)}
        title="Click para siguiente mensaje"
      >
        {msgs[msgIdx]}
        {msgs.length > 1 && (
          <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>
            [{msgIdx + 1}/{msgs.length}] toca para continuar
          </span>
        )}
      </motion.div>
    </div>
  )
}

function StepBar({ current }: { current: number }) {
  const steps = ['Lote', 'Fórmula', 'Ingredientes', 'Confirmar']
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, position: 'relative' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', border: `2px solid`,
              borderColor: i < current ? C.green : i === current ? C.cyan : C.border,
              background: i < current ? C.green : i === current ? `${C.cyan}20` : C.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i < current ? '#fff' : i === current ? C.cyan : C.muted,
              fontSize: 12, fontWeight: 700, zIndex: 1, position: 'relative',
              transition: 'all 0.3s',
            }}>
              {i < current ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === current ? C.cyan : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              position: 'absolute', top: 15, left: '50%', width: '100%',
              height: 2, background: i < current ? C.green : C.border,
              transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function POCard({ po, selected, onSelect }: { po: any; selected: boolean; onSelect: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        background: selected ? `${C.cyan}15` : C.card,
        border: `2px solid ${selected ? C.cyan : C.border}`,
        borderRadius: 12, padding: 16, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {po.client_name || po.client_code}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: C.mono }}>
            {po.batch_code}
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>
            {parseFloat(po.sqft).toLocaleString()} SF
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {po.request_status ? (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 6,
              background: po.request_status === 'ALL_READY' ? `${C.green}20` : `${C.amber}20`,
              color: po.request_status === 'ALL_READY' ? C.green : C.amber,
              fontWeight: 600,
            }}>{po.request_status}</span>
          ) : (
            <span style={{ fontSize: 10, color: C.muted }}>Sin pedido</span>
          )}
          {selected && <div style={{ marginTop: 6, color: C.cyan }}><CheckCircle2 size={18} /></div>}
        </div>
      </div>
    </motion.div>
  )
}

function FormulaCard({ formula, selected, onSelect }: { formula: any; selected: boolean; onSelect: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        background: selected ? `${C.purple}20` : C.card,
        border: `2px solid ${selected ? C.purple : C.border}`,
        borderRadius: 12, padding: 16, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{formula.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{formula.article}</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
            {formula.chemicals?.length || 0} ingredientes
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: C.mono, color: selected ? C.purple : C.text }}>
            ${parseFloat(formula.total_cost_reference || 0).toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>/SF ref</div>
          {selected && <div style={{ marginTop: 6, color: C.purple }}><CheckCircle2 size={18} /></div>}
        </div>
      </div>
    </motion.div>
  )
}

function ChemCard({ chem, qty, onAdd, onRemove, onQtyChange }: {
  chem: any; qty: number; onAdd: () => void; onRemove: () => void; onQtyChange: (v: number) => void
}) {
  const inCart = qty > 0
  const stockOk = parseFloat(chem.stock_kg) >= qty
  const stockColor = parseFloat(chem.stock_kg) <= 0 ? C.red : parseFloat(chem.stock_kg) < 5 ? C.amber : C.green

  return (
    <motion.div
      layout
      style={{
        background: inCart ? `${C.green}10` : C.card,
        border: `1px solid ${inCart ? C.green : C.border}`,
        borderRadius: 10, padding: '10px 12px',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {chem.name}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: C.muted }}>{chem.category}</span>
            <span style={{ fontSize: 10, color: stockColor, fontFamily: C.mono }}>
              {parseFloat(chem.stock_kg).toFixed(1)} kg
            </span>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>
              ${parseFloat(chem.unit_cost).toFixed(2)}/kg
            </span>
          </div>
        </div>
        {inCart ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={onRemove} style={{ background: C.surface, border: 'none', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={12} />
            </button>
            <input
              type="number"
              value={qty}
              onChange={e => onQtyChange(parseFloat(e.target.value) || 0)}
              style={{ width: 52, background: C.surface, border: `1px solid ${stockOk ? C.border : C.red}`, borderRadius: 4, color: C.text, textAlign: 'center', fontSize: 12, padding: '2px 4px', fontFamily: C.mono }}
              min="0" step="0.1"
            />
            <span style={{ fontSize: 10, color: C.muted }}>kg</span>
            <button onClick={() => onRemove()} style={{ background: C.surface, border: 'none', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: C.cyan, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={11} /> Agregar
          </button>
        )}
      </div>
    </motion.div>
  )
}

function TrafficLights({ formula, chemicals, material }: { formula: boolean; chemicals: boolean; material: boolean }) {
  const lights = [
    { label: 'Fórmula', on: formula, owner: 'Lab', color: C.cyan },
    { label: 'Químicos', on: chemicals, owner: 'Tuyen', color: C.purple },
    { label: 'Material', on: material, owner: 'Thuy', color: C.amber },
  ]
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '20px 0' }}>
      {lights.map((l, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <motion.div
            animate={l.on ? { boxShadow: [`0 0 8px ${l.color}60`, `0 0 18px ${l.color}`, `0 0 8px ${l.color}60`] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: l.on ? l.color : C.surface,
              border: `2px solid ${l.on ? l.color : C.border}`,
              margin: '0 auto 6px',
              transition: 'all 0.4s',
            }}
          />
          <div style={{ fontSize: 10, color: l.on ? l.color : C.muted, fontWeight: 600 }}>{l.label}</div>
          <div style={{ fontSize: 9, color: C.muted }}>{l.owner}</div>
        </div>
      ))}
    </div>
  )
}

function PointsBurst({ pts }: { pts: number }) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
        background: `linear-gradient(135deg, ${C.amber}, #FCD34D)`,
        borderRadius: 20, padding: '20px 40px', textAlign: 'center',
        zIndex: 1000, boxShadow: `0 0 60px ${C.amber}80`,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', letterSpacing: '0.1em' }}>PUNTOS GANADOS</div>
      <div style={{ fontSize: 48, fontWeight: 900, color: '#000', fontFamily: C.mono }}>+{pts}</div>
      <div style={{ fontSize: 14, color: '#92400E' }}>¡Transmutación enviada!</div>
    </motion.div>
  )
}

function Leaderboard({ scores }: { scores: any[] }) {
  const levelColor: Record<string, string> = {
    'Maestro Alquimista': C.amber,
    'Químico Senior': C.purple,
    'Técnico de Lab': C.cyan,
    'Aprendiz': C.muted,
  }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Trophy size={12} /> Tabla de Alquimistas
      </div>
      {scores.map((s, i) => (
        <div key={s.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < scores.length - 1 ? `1px solid ${C.border}` : 'none' }}>
          <div style={{ width: 20, fontSize: 12, color: C.muted, textAlign: 'center', fontFamily: C.mono }}>{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.username}</div>
            <div style={{ fontSize: 10, color: levelColor[s.level_name] || C.muted }}>{s.level_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: C.mono, color: C.amber }}>{s.total_points}</div>
            <div style={{ fontSize: 9, color: C.muted }}>{s.total_requests} pedidos</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function LabTransmutation() {
  const [data, setData] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [selectedFormula, setSelectedFormula] = useState<any>(null)
  const [cart, setCart] = useState<Record<number, number>>({}) // chemical_id → qty_kg
  const [sessionPoints, setSessionPoints] = useState(0)
  const [showBurst, setShowBurst] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [chemFilter, setChemFilter] = useState('')
  const [chemCategory, setChemCategory] = useState('ALL')
  const currentUser = 'Thanh' // TODO: from auth context

  const load = useCallback(async () => {
    const r = await fetch(`/api/local/lab?user=${currentUser}`)
    setData(await r.json())
  }, [currentUser])

  useEffect(() => { load() }, [load])

  // Pre-populate cart when formula selected
  const applyFormula = (formula: any) => {
    setSelectedFormula(formula)
    if (!formula?.chemicals?.length) return
    const sqft = parseFloat(selectedPO?.sqft || 0)
    const newCart: Record<number, number> = {}
    for (const c of formula.chemicals) {
      if (c.chemical_id) {
        // grams/SF × sqft ÷ 1000 = kg
        const kg = sqft > 0 ? (parseFloat(c.grams || 0) * sqft) / 1000 : parseFloat(c.grams || 0) / 1000
        newCart[c.chemical_id] = Math.round(kg * 100) / 100
      }
    }
    setCart(newCart)
  }

  const cartItems = data?.chemicals?.filter((c: any) => cart[c.id] > 0) || []
  const totalChemCost = cartItems.reduce((s: number, c: any) => s + (cart[c.id] || 0) * parseFloat(c.unit_cost), 0)
  const sqft = parseFloat(selectedPO?.sqft || 0)
  const costPerSf = sqft > 0 ? (totalChemCost / sqft) : 0

  const categories = data ? ['ALL', ...Array.from(new Set(data.chemicals.map((c: any) => c.category)))] : ['ALL']
  const filteredChems = data?.chemicals?.filter((c: any) => {
    const matchCat = chemCategory === 'ALL' || c.category === chemCategory
    const matchTxt = !chemFilter || c.name.toLowerCase().includes(chemFilter.toLowerCase())
    return matchCat && matchTxt
  }) || []

  const handleSubmit = async () => {
    setSubmitting(true)
    const chemicals = cartItems.map((c: any) => ({
      chemical_id: c.id, name: c.name, qty_kg: cart[c.id], unit_cost: parseFloat(c.unit_cost),
    }))
    const res = await fetch('/api/local/lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_request',
        batch_code: selectedPO.batch_code,
        client_code: selectedPO.client_code,
        formula_id: selectedFormula?.id || null,
        formula_snapshot: selectedFormula || null,
        chemicals,
        sqft: selectedPO.sqft,
        requested_by: currentUser,
      }),
    })
    const r = await res.json()
    setResult(r)
    if (r.ok) {
      setSessionPoints(p => p + r.points_earned)
      setShowBurst(true)
      setTimeout(() => setShowBurst(false), 2500)
      setStep(4)
      load()
    }
    setSubmitting(false)
  }

  if (!data) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
        <Atom size={32} color={C.cyan} />
      </motion.div>
    </div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 16px', color: C.text, fontFamily: 'Inter, sans-serif' }}>
      <AnimatePresence>{showBurst && <PointsBurst pts={result?.points_earned || 0} />}</AnimatePresence>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FlaskConical size={22} color={C.cyan} />
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Alquimia Lab</h1>
              <span style={{ fontSize: 11, background: `${C.purple}20`, color: C.purple, padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                TRANSMUTACIÓN I
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Prepara la fórmula, elige los ingredientes, enciende las 3 luces.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>SESIÓN</div>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: C.mono, color: C.amber }}>
              +{sessionPoints} <Star size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginTop: 24 }}>
          {/* Main wizard */}
          <div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <SofiaGuide step={step} points={sessionPoints} />
              {step < 4 && <StepBar current={step} />}

              {/* ── STEP 0: Select PO ── */}
              {step === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Lotes activos (últimos 30 días)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {data.active_pos.map((po: any) => (
                      <POCard key={po.batch_code} po={po} selected={selectedPO?.batch_code === po.batch_code} onSelect={() => setSelectedPO(po)} />
                    ))}
                  </div>
                  <button
                    onClick={() => selectedPO && setStep(1)}
                    disabled={!selectedPO}
                    style={{
                      marginTop: 20, width: '100%', padding: '14px', borderRadius: 10,
                      background: selectedPO ? C.cyan : C.surface,
                      border: 'none', cursor: selectedPO ? 'pointer' : 'not-allowed',
                      color: selectedPO ? '#000' : C.muted, fontWeight: 700, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    Continuar <ChevronRight size={16} />
                  </button>
                </motion.div>
              )}

              {/* ── STEP 1: Select Formula ── */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Fórmulas aprobadas
                  </div>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                    {data.formulas.map((f: any) => (
                      <FormulaCard key={f.id} formula={f} selected={selectedFormula?.id === f.id} onSelect={() => applyFormula(f)} />
                    ))}
                  </div>
                  <button
                    onClick={() => { if (!selectedFormula) applyFormula(null); setStep(2) }}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 10,
                      background: C.purple, border: 'none', cursor: 'pointer',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {selectedFormula ? 'Usar esta fórmula' : 'Continuar sin fórmula base'} <ChevronRight size={16} />
                  </button>
                  <button onClick={() => setStep(0)} style={{ marginTop: 8, width: '100%', padding: 10, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>
                    ← Volver
                  </button>
                </motion.div>
              )}

              {/* ── STEP 2: Mix Chemicals ── */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {(categories as string[]).map((cat: string) => (
                      <button key={cat} onClick={() => setChemCategory(cat)} style={{
                        padding: '4px 12px', borderRadius: 20, border: `1px solid ${chemCategory === cat ? C.cyan : C.border}`,
                        background: chemCategory === cat ? `${C.cyan}20` : C.surface,
                        color: chemCategory === cat ? C.cyan : C.muted, fontSize: 11, cursor: 'pointer',
                      }}>{cat}</button>
                    ))}
                  </div>
                  <input
                    placeholder="Buscar químico..."
                    value={chemFilter}
                    onChange={e => setChemFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, marginBottom: 12, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {filteredChems.map((c: any) => (
                      <ChemCard
                        key={c.id}
                        chem={c}
                        qty={cart[c.id] || 0}
                        onAdd={() => setCart(prev => ({ ...prev, [c.id]: 0.5 }))}
                        onRemove={() => setCart(prev => { const n = { ...prev }; delete n[c.id]; return n })}
                        onQtyChange={(v) => setCart(prev => ({ ...prev, [c.id]: v }))}
                      />
                    ))}
                  </div>
                  {/* Running cost */}
                  {cartItems.length > 0 && (
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: C.muted }}>{cartItems.length} ingredientes · Costo quím.</span>
                        <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.green }}>${totalChemCost.toFixed(4)}</span>
                      </div>
                      {sqft > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>Costo / SF</span>
                          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.cyan }}>${costPerSf.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => cartItems.length > 0 && setStep(3)}
                    disabled={cartItems.length === 0}
                    style={{
                      marginTop: 12, width: '100%', padding: '14px', borderRadius: 10,
                      background: cartItems.length > 0 ? C.green : C.surface,
                      border: 'none', cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed',
                      color: cartItems.length > 0 ? '#fff' : C.muted, fontWeight: 700, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    Revisar pedido ({cartItems.length}) <ChevronRight size={16} />
                  </button>
                  <button onClick={() => setStep(1)} style={{ marginTop: 8, width: '100%', padding: 10, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>
                    ← Volver
                  </button>
                </motion.div>
              )}

              {/* ── STEP 3: Review + Submit ── */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ background: C.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Resumen del pedido</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: C.sub, fontSize: 12 }}>Lote</span>
                      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text }}>{selectedPO?.batch_code}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: C.sub, fontSize: 12 }}>Cliente</span>
                      <span style={{ fontSize: 12, color: C.text }}>{selectedPO?.client_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: C.sub, fontSize: 12 }}>SF objetivo</span>
                      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text }}>{parseFloat(selectedPO?.sqft).toLocaleString()}</span>
                    </div>
                    {selectedFormula && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: C.sub, fontSize: 12 }}>Fórmula</span>
                        <span style={{ fontSize: 12, color: C.purple }}>{selectedFormula.name}</span>
                      </div>
                    )}
                    <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10 }}>
                      {cartItems.map((c: any) => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: C.sub }}>{c.name}</span>
                          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text }}>{cart[c.id]} kg · ${(cart[c.id] * parseFloat(c.unit_cost)).toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Total químicos</span>
                      <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.green }}>${totalChemCost.toFixed(4)}</span>
                    </div>
                  </div>

                  <TrafficLights formula={!!selectedFormula} chemicals={false} material={false} />

                  <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 16 }}>
                    Al confirmar, Sofia notifica a <strong style={{ color: C.purple }}>Tuyen</strong> (químicos) y <strong style={{ color: C.amber }}>Thuy</strong> (material)
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 12,
                      background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
                      border: 'none', cursor: submitting ? 'wait' : 'pointer',
                      color: '#fff', fontWeight: 800, fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: `0 0 30px ${C.cyan}40`,
                    }}
                  >
                    <Sparkles size={18} />
                    {submitting ? 'Enviando...' : 'INICIAR TRANSMUTACIÓN'}
                  </button>
                  <button onClick={() => setStep(2)} style={{ marginTop: 8, width: '100%', padding: 10, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>
                    ← Volver a ingredientes
                  </button>
                </motion.div>
              )}

              {/* ── STEP 4: Result ── */}
              {step === 4 && result?.ok && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5 }}
                    style={{ fontSize: 64, marginBottom: 16 }}
                  >⚗️</motion.div>
                  <h2 style={{ color: C.cyan, marginBottom: 8 }}>¡Transmutación en marcha!</h2>
                  <p style={{ color: C.sub, fontSize: 13, marginBottom: 20 }}>
                    Pedido #{result.request_id} enviado.<br />
                    Tuyen y Thuy recibieron la señal.
                  </p>
                  <TrafficLights formula={true} chemicals={false} material={false} />
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Esperando las 3 luces para pasar a producción...</div>
                  <button
                    onClick={() => { setStep(0); setSelectedPO(null); setSelectedFormula(null); setCart({}); setResult(null) }}
                    style={{ marginTop: 20, padding: '10px 24px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer', fontSize: 13 }}
                  >
                    Nueva transmutación
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Leaderboard scores={data.scores} />

            {/* Recent requests */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Beaker size={12} /> Pedidos recientes
              </div>
              {data.requests.slice(0, 5).map((r: any) => {
                const allReady = r.light_formula && r.light_chemicals && r.light_material
                const statusColor = allReady ? C.green : r.status === 'SUBMITTED' ? C.amber : C.muted
                return (
                  <div key={r.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontFamily: C.mono, color: C.text }}>{r.batch_code}</span>
                      <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{allReady ? 'ALL READY' : r.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {[['F', r.light_formula, C.cyan], ['Q', r.light_chemicals, C.purple], ['M', r.light_material, C.amber]].map(([label, on, color]: any) => (
                        <span key={label} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: on ? `${color}20` : C.surface, color: on ? color : C.muted, fontWeight: 600 }}>
                          {label} {on ? '✓' : '○'}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {data.requests.length === 0 && <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '12px 0' }}>Sin pedidos aún</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
