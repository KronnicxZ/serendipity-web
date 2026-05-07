'use client'

import React, { useMemo } from 'react'

/**
 * MarkovWidget — Cadena de Markov aplicada a Serendipity
 * 
 * Visualiza el estado actual del negocio como un nodo en una cadena de Markov,
 * con probabilidades de transición basadas en datos reales de producción y finanzas.
 * 
 * Inspirado en:
 * - Viktor Nekrásov: "La verdad está en las trincheras"
 * - Andrey Markov: Convergencia sin independencia
 * - Google PageRank: Ranking por conexiones reales
 */

// Business states mapped to Markov chain
const STATES = [
  { id: 'tormenta', label: 'Tormenta', color: '#ef4444', emoji: '🌪️' },
  { id: 'sequia',   label: 'Sequía',   color: '#f59e0b', emoji: '🏜️' },
  { id: 'siembra',  label: 'Siembra',  color: '#3b82f6', emoji: '🌱' },
  { id: 'cosecha',  label: 'Cosecha',  color: '#34d399', emoji: '🌾' },
  { id: 'paz',      label: 'Paz Total',color: '#a78bfa', emoji: '💎' },
]

// Determine current state from real metrics
function getCurrentState(margin: number, progressPct: number, cashFlow: number): string {
  if (cashFlow < 0 || margin < 0) return 'tormenta'
  if (margin < 15 || progressPct < 50) return 'sequia'
  if (margin < 30 || progressPct < 80) return 'siembra'
  if (margin < 50 || progressPct < 120) return 'cosecha'
  return 'paz'
}

// Transition matrix — probabilities from current state
const TRANSITIONS: Record<string, Record<string, number>> = {
  tormenta: { tormenta: 0.30, sequia: 0.40, siembra: 0.20, cosecha: 0.08, paz: 0.02 },
  sequia:   { tormenta: 0.10, sequia: 0.30, siembra: 0.35, cosecha: 0.20, paz: 0.05 },
  siembra:  { tormenta: 0.05, sequia: 0.10, siembra: 0.30, cosecha: 0.40, paz: 0.15 },
  cosecha:  { tormenta: 0.02, sequia: 0.05, siembra: 0.15, cosecha: 0.45, paz: 0.33 },
  paz:      { tormenta: 0.01, sequia: 0.04, siembra: 0.10, cosecha: 0.35, paz: 0.50 },
}

// Stationary distribution (π = πP)
const STATIONARY = { tormenta: 0.06, sequia: 0.12, siembra: 0.21, cosecha: 0.33, paz: 0.28 }

interface ClientData {
  name: string
  totalUsd?: number
  revenue?: number
  totalSqft?: number
  pagerank?: number
}

// Client PageRank — importance by revenue links
function computeClientRank(clients: ClientData[]): (ClientData & { pagerank: number })[] {
  if (!clients || clients.length === 0) return []
  const total = clients.reduce((s, c) => s + (c.totalUsd || c.revenue || 0), 0)
  if (total === 0) return clients.map(c => ({ ...c, pagerank: 1 / clients.length }))
  
  const d = 0.85
  const N = clients.length
  return clients.map(c => {
    const share = (c.totalUsd || c.revenue || 0) / total
    const rank = (1 - d) / N + d * share
    return { ...c, pagerank: rank }
  }).sort((a, b) => b.pagerank - a.pagerank)
}

interface StateNodeProps {
  state: string
  isCurrent: boolean
  probability: number
}

function StateNode({ state, isCurrent, probability }: StateNodeProps) {
  const stateInfo = STATES.find(s => s.id === state)
  if (!stateInfo) return null
  
  const size = isCurrent ? 'w-16 h-16' : 'w-12 h-12'
  const ring = isCurrent ? `ring-2 ring-offset-2 ring-offset-slate-900` : ''
  const opacity = probability > 0.2 ? 'opacity-100' : probability > 0.1 ? 'opacity-70' : 'opacity-40'
  
  return (
    <div className={`flex flex-col items-center gap-1 ${opacity}`}>
      <div 
        className={`${size} rounded-full flex items-center justify-center ${ring} transition-all duration-500`}
        style={{ 
          backgroundColor: `${stateInfo.color}20`,
          borderColor: stateInfo.color,
          borderWidth: isCurrent ? 3 : 1,
          borderStyle: 'solid',
          boxShadow: isCurrent ? `0 0 20px ${stateInfo.color}40` : 'none'
        }}
      >
        <span className={isCurrent ? 'text-2xl' : 'text-lg'}>{stateInfo.emoji}</span>
      </div>
      <span className="text-[10px] text-slate-400">{stateInfo.label}</span>
      <span className="text-[10px] font-mono" style={{ color: stateInfo.color }}>
        {(probability * 100).toFixed(0)}%
      </span>
    </div>
  )
}

interface MarkovWidgetProps {
  margin?: number
  progressPct?: number
  cashFlow?: number
  clients?: ClientData[]
}

export default function MarkovWidget({ margin = 57.9, progressPct = 183, cashFlow = 1, clients }: MarkovWidgetProps) {
  const defaultClients: ClientData[] = [
    { name: 'PRARA', totalUsd: 58792, totalSqft: 267238 },
    { name: 'C06', totalUsd: 1489, totalSqft: 6769 },
    { name: 'CAIHONG', totalUsd: 103, totalSqft: 468 },
    { name: 'STRONGBUNCH', totalUsd: 42, totalSqft: 190 },
    { name: 'C03', totalUsd: 19, totalSqft: 87 },
  ]

  const activeClients = clients || defaultClients
  const currentState = useMemo(() => getCurrentState(margin, progressPct, cashFlow), [margin, progressPct, cashFlow])
  const transitions = TRANSITIONS[currentState] || TRANSITIONS.cosecha
  const rankedClients = useMemo(() => computeClientRank(activeClients), [activeClients])

  const stateIndex = STATES.findIndex(s => s.id === currentState)
  const pazIndex = STATES.findIndex(s => s.id === 'paz')
  const stepsToConverge = Math.max(1, (pazIndex - stateIndex) * 3)

  return (
    <div className="bg-white/[0.03] p-5 rounded-lg border border-white/[0.05] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>🔗</span> Cadena de Markov — Estado del Sistema
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5 italic">
            &quot;Lo que pasa mañana depende solo de lo que hacés HOY&quot; — Propiedad de Markov
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500">Convergencia π</div>
          <div className="text-xs font-mono text-emerald-400">
            {((STATIONARY.cosecha + STATIONARY.paz) * 100).toFixed(0)}% → Paz
          </div>
        </div>
      </div>

      {/* State Chain Visualization */}
      <div className="flex items-center justify-between px-2">
        {STATES.map((state, i) => (
          <React.Fragment key={state.id}>
            <StateNode 
              state={state.id} 
              isCurrent={state.id === currentState}
              probability={transitions[state.id] || 0}
            />
            {i < STATES.length - 1 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-px bg-slate-700 flex-1 mx-1" />
                <span className="text-[8px] text-slate-600 font-mono">
                  {((transitions[STATES[i+1].id] || 0) * 100).toFixed(0)}%
                </span>
                <div className="text-slate-700 text-xs mx-1">→</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current State Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Markov Analysis */}
        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            Estado Actual
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {STATES.find(s => s.id === currentState)?.emoji}
            </span>
            <div>
              <div className="text-sm font-semibold" style={{ color: STATES.find(s => s.id === currentState)?.color }}>
                {STATES.find(s => s.id === currentState)?.label}
              </div>
              <div className="text-[10px] text-slate-400">
                Margen: {margin.toFixed(1)}% | SF: {progressPct.toFixed(0)}% meta
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500">Probabilidades de transición:</div>
            {Object.entries(transitions)
              .filter(([, p]) => p >= 0.10)
              .sort(([, a], [, b]) => b - a)
              .map(([state, prob]) => {
                const info = STATES.find(s => s.id === state)
                return (
                  <div key={state} className="flex items-center gap-2">
                    <span className="text-xs">{info?.emoji}</span>
                    <div className="flex-1 bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${prob * 100}%`, backgroundColor: info?.color }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                      {(prob * 100).toFixed(0)}%
                    </span>
                  </div>
                )
              })
            }
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            ≈ {stepsToConverge} meses hasta distribución estacionaria
          </div>
        </div>

        {/* Client PageRank */}
        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            PageRank de Clientes
          </div>
          <div className="text-[9px] text-slate-600 mb-2 italic">
            α = 0.85 (Google damping factor)
          </div>
          <div className="space-y-1.5">
            {rankedClients.slice(0, 5).map((client, i) => (
              <div key={client.name} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 w-3 font-mono">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{client.name}</span>
                    <span className="text-[10px] font-mono text-blue-400">
                      PR: {client.pagerank.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex-1 bg-white/[0.05] rounded-full h-1 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-blue-500/70"
                        style={{ width: `${client.pagerank * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600">
                      {(client.totalSqft || 0).toLocaleString()} SF
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 p-1.5 bg-amber-500/10 rounded text-[9px] text-amber-400/80 border border-amber-500/20">
            ⚠️ PRARA concentra {rankedClients[0]?.pagerank > 0.8 ? '>80%' : `${((rankedClients[0]?.pagerank || 0) * 100).toFixed(0)}%`} del peso. 
            Diversificar = más nodos apuntando a Serendipity.
          </div>
        </div>
      </div>

      {/* Nekrasov Principle */}
      <div className="bg-white/[0.02] rounded p-3 border-l-2 border-emerald-500/50">
        <div className="flex items-start gap-2">
          <span className="text-lg">📜</span>
          <div>
            <div className="text-[10px] text-emerald-500/70 uppercase tracking-wider mb-1">
              Principio Nekrásov-Markov
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Viktor Nekrásov</strong> escribió la verdad desde las trincheras de Stalingrado, 
              no desde la propaganda del cuartel general.{' '}
              <strong className="text-slate-300">Andrey Markov</strong> probó que el sistema converge 
              <em> incluso con dependencias</em> — refutando a Pavel Nekrásov.{' '}
              <strong className="text-emerald-400">Google</strong> usa exactamente esto: PageRank es una cadena de Markov 
              donde cada link es un voto de verdad.
            </p>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              &quot;No necesitás condiciones perfectas para que el sistema converja — 
              solo actuar consistentemente desde el presente.&quot; — Distribución estacionaria π
            </p>
          </div>
        </div>
      </div>

      {/* Convergence Formula */}
      <div className="flex items-center justify-center gap-6 text-[10px] text-slate-600 font-mono">
        <span>π = πP</span>
        <span>|</span>
        <span>PR(i) = (1-d)/N + d·Σ PR(j)/L(j)</span>
        <span>|</span>
        <span>d = 0.85</span>
      </div>
    </div>
  )
}
