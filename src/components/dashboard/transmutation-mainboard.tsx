'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Database, FlaskConical, Factory, DollarSign, Users,
    ChevronRight, AlertTriangle, Activity, TrendingUp, TrendingDown,
} from 'lucide-react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

interface Client  { name: string; sf: number; usd: number; pct: number }
interface Pipeline {
    crustSf: number; crustLots: number
    formulaSf: number; formulaOrders: number
    prodSf: number; prodOrders: number
    finishedSf: number; finishedOrders: number
    deliveredSf: number; deliveredRevenue: number
}
interface MainboardData {
    dateRange:  { from: string; to: string }
    pipeline:   Pipeline
    clients:    Client[]
    production: { sfThisMonth: number; target: number; progressPct: number; sfPerDay: number; defectPct: number | null; batches: number }
    formulas:   { active: number; draft: number; avgLiveCostKg: number }
    finance:    { revenueTotal: number; netMargin: number; praraDebtRemaining: number; breakEvenSf: number; payablesTotal: number }
    inventory:  { crustSf: number; crustLots: number; chemValueUsd: number; lowStockCount: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
    sf:  (n: number) => n.toLocaleString('en-US'),
    usd: (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pct: (n: number) => `${n.toFixed(1)}%`,
    date:(d: Date)   => d.toISOString().slice(0, 10),
}

function today()         { return new Date() }
function startOfMonth()  { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth()    { const d = today(); return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

// ── Pipeline Node ─────────────────────────────────────────────────────────────

function PipelineNode({ title, value, sub, icon: Icon, isLast = false }: {
    title: string; value: string; sub: string; icon: any; isLast?: boolean
}) {
    return (
        <div className="flex items-center">
            <div className="bg-[#14171E] border border-[#2A2F3C] hover:border-[#00C8D4] transition-colors p-4 rounded-lg w-44 cursor-default group">
                <div className="flex items-center gap-1.5 mb-2 text-[#8B93A7] group-hover:text-[#00C8D4] transition-colors">
                    <Icon size={12} />
                    <span className="text-[9px] font-bold tracking-widest uppercase font-['DM_Sans']">{title}</span>
                </div>
                <div className="font-['JetBrains_Mono'] text-lg text-[#E8ECF4] leading-tight">{value}</div>
                <div className="font-['DM_Sans'] text-[10px] text-[#5A6278] mt-1">{sub}</div>
            </div>
            {!isLast && <ChevronRight className="text-[#00C8D4] mx-1 opacity-40 shrink-0" size={16} />}
        </div>
    )
}

// ── Panel Card ────────────────────────────────────────────────────────────────

function Panel({ title, icon: Icon, href, children }: {
    title: string; icon: any; href: string; children: React.ReactNode
}) {
    return (
        <div className="bg-[#14171E] border border-[#2A2F3C] rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2A2F3C] pb-3">
                <h3 className="text-[10px] font-bold text-[#E8ECF4] uppercase tracking-widest flex items-center gap-2 font-['DM_Sans']">
                    <Icon size={13} className="text-[#00C8D4]" />
                    {title}
                </h3>
                <Link href={href} className="text-[9px] text-[#5A6278] hover:text-[#00C8D4] transition-colors font-['DM_Sans']">
                    {href} →
                </Link>
            </div>
            {children}
        </div>
    )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-[#1A1E28] rounded ${className}`} />
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TransmutationMainboard() {
    const [from, setFrom] = useState(fmt.date(startOfMonth()))
    const [to,   setTo]   = useState(fmt.date(endOfMonth()))
    const [data, setData] = useState<MainboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState<string | null>(null)

    const load = useCallback(async (f: string, t: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/local/mainboard?from=${f}&to=${t}`)
            if (!res.ok) throw new Error(`API ${res.status}`)
            setData(await res.json())
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load(from, to) }, [load, from, to])

    const p  = data?.pipeline
    const pr = data?.production
    const fi = data?.finance
    const fo = data?.formulas
    const inv = data?.inventory

    const praraOriginal = 40000
    const praraDebt     = fi?.praraDebtRemaining ?? praraOriginal
    const praraProgress = Math.round(((praraOriginal - praraDebt) / praraOriginal) * 100)

    return (
        <div className="min-h-screen bg-[#0C0E12] text-[#E8ECF4] p-6 space-y-8 font-['DM_Sans']">

            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#2A2F3C] pb-5">
                <div>
                    <h1 className="font-['Cormorant_Garamond'] text-3xl font-bold tracking-wide text-[#E8ECF4]">
                        Simulador de Transmutación
                    </h1>
                    <p className="text-[#5A6278] text-[10px] uppercase tracking-widest mt-1">
                        Mainboard · Perspectiva del Director · Datos en tiempo real
                    </p>
                </div>
                <div className="flex gap-3 items-end">
                    <div className="flex flex-col">
                        <label className="text-[9px] text-[#5A6278] uppercase tracking-widest mb-1">Desde</label>
                        <input
                            type="date" value={from}
                            onChange={e => setFrom(e.target.value)}
                            className="bg-[#14171E] border border-[#2A2F3C] rounded px-3 py-1.5 text-xs text-[#E8ECF4] font-['JetBrains_Mono'] focus:outline-none focus:border-[#00C8D4]"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[9px] text-[#5A6278] uppercase tracking-widest mb-1">Hasta</label>
                        <input
                            type="date" value={to}
                            onChange={e => setTo(e.target.value)}
                            className="bg-[#14171E] border border-[#2A2F3C] rounded px-3 py-1.5 text-xs text-[#E8ECF4] font-['JetBrains_Mono'] focus:outline-none focus:border-[#00C8D4]"
                        />
                    </div>
                </div>
            </header>

            {error && (
                <div className="bg-[#E63946]/10 border border-[#E63946]/30 rounded p-3 text-[#E63946] text-xs flex items-center gap-2">
                    <AlertTriangle size={14} /> Error cargando datos: {error}
                </div>
            )}

            {/* ── Pipeline ── */}
            <section>
                <p className="text-[9px] text-[#5A6278] uppercase tracking-widest mb-3 font-['DM_Sans']">
                    Flujo de la Materia
                </p>
                <div className="overflow-x-auto pb-2">
                    <div className="flex items-center min-w-max gap-0">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center">
                                    <Skeleton className="w-44 h-24" />
                                    {i < 4 && <ChevronRight size={16} className="mx-1 text-[#2A2F3C]" />}
                                </div>
                            ))
                        ) : (
                            <>
                                <PipelineNode title="Crust Disponible" value={fmt.sf(p?.crustSf ?? 0)} sub={`${p?.crustLots ?? 0} lotes — DONTO`} icon={Database} />
                                <PipelineNode title="En Formulación" value={fmt.sf(p?.formulaSf ?? 0)} sub={`${p?.formulaOrders ?? 0} órdenes pendientes`} icon={FlaskConical} />
                                <PipelineNode title="En Producción" value={fmt.sf(p?.prodSf ?? 0)} sub={`${p?.prodOrders ?? 0} órdenes activas`} icon={Factory} />
                                <PipelineNode title="Terminado" value={fmt.sf(p?.finishedSf ?? 0)} sub={`${p?.finishedOrders ?? 0} órdenes completadas`} icon={Activity} />
                                <PipelineNode title="Entregado (Rev)" value={fmt.usd(p?.deliveredRevenue ?? 0)} sub={`${fmt.sf(p?.deliveredSf ?? 0)} SF facturados`} icon={DollarSign} isLast />
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ── 5 Panels ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {/* Clientes */}
                <Panel title="Clientes & Revenue" icon={Users} href="/dashboard/clientes">
                    {loading ? (
                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                    ) : (
                        <div className="space-y-3">
                            {(data?.clients ?? []).slice(0, 5).map(c => (
                                <div key={c.name}>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-[#8B93A7] font-['DM_Sans']">{c.name}</span>
                                        <span className="font-['JetBrains_Mono'] text-[#E8ECF4]">{fmt.pct(c.pct)}</span>
                                    </div>
                                    <div className="w-full bg-[#1A1E28] h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${c.pct > 70 ? 'bg-[#E63946]' : c.pct > 30 ? 'bg-[#F0A500]' : 'bg-[#2ECC71]'}`}
                                            style={{ width: `${Math.min(c.pct, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(data?.clients ?? []).length === 0 && (
                                <p className="text-[#5A6278] text-xs">Sin producción en el período</p>
                            )}
                            <div className="pt-2 border-t border-[#2A2F3C] flex justify-between">
                                <span className="text-[9px] text-[#5A6278] uppercase">Meta diversificación PRARA &lt; 50%</span>
                                {(data?.clients.find(c => c.name === 'PRARA')?.pct ?? 0) > 50
                                    ? <span className="text-[#E63946] text-[10px] font-['JetBrains_Mono']">⚠ ALTA</span>
                                    : <span className="text-[#2ECC71] text-[10px] font-['JetBrains_Mono']">✓ OK</span>
                                }
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Producción */}
                <Panel title="Producción & Ritmo" icon={Factory} href="/dashboard/operaciones">
                    {loading ? (
                        <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-3" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div></div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] text-[#5A6278] uppercase mb-1">SF Procesados (Período)</p>
                                <p className="font-['JetBrains_Mono'] text-3xl text-[#00C8D4]">{fmt.sf(pr?.sfThisMonth ?? 0)}</p>
                            </div>
                            <div>
                                <div className="flex justify-between text-[9px] text-[#5A6278] uppercase mb-1">
                                    <span>Meta 500K SF</span>
                                    <span className="font-['JetBrains_Mono']">{fmt.pct(pr?.progressPct ?? 0)}</span>
                                </div>
                                <div className="w-full bg-[#1A1E28] h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#00C8D4] rounded-full transition-all" style={{ width: `${Math.min(pr?.progressPct ?? 0, 100)}%` }} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#1A1E28] p-3 rounded">
                                    <p className="text-[9px] text-[#5A6278] uppercase">Ritmo</p>
                                    <p className="font-['JetBrains_Mono'] text-sm text-[#E8ECF4] mt-1">{fmt.sf(pr?.sfPerDay ?? 0)} SF/día</p>
                                </div>
                                <div className={`p-3 rounded border ${(pr?.defectPct ?? 0) > 2 ? 'bg-[#E63946]/10 border-[#E63946]/30' : 'bg-[#1A1E28] border-transparent'}`}>
                                    <p className={`text-[9px] uppercase ${(pr?.defectPct ?? 0) > 2 ? 'text-[#E63946]' : 'text-[#5A6278]'}`}>Defectos</p>
                                    <p className={`font-['JetBrains_Mono'] text-sm mt-1 ${(pr?.defectPct ?? 0) > 2 ? 'text-[#E63946]' : 'text-[#E8ECF4]'}`}>
                                        {pr?.defectPct != null ? fmt.pct(pr.defectPct) : 'N/D'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Laboratorio */}
                <Panel title="Laboratorio · Fórmulas" icon={FlaskConical} href="/lab/formulas">
                    {loading ? (
                        <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-8" /></div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-[#1A1E28] p-3 rounded">
                                <span className="text-[10px] text-[#8B93A7] uppercase font-['DM_Sans']">Aprobadas</span>
                                <span className="font-['JetBrains_Mono'] text-2xl text-[#2ECC71]">{fo?.active ?? 0}</span>
                            </div>
                            <div className={`flex justify-between items-center p-3 rounded border ${(fo?.draft ?? 0) > 0 ? 'bg-[#F0A500]/10 border-[#F0A500]/30' : 'bg-[#1A1E28] border-transparent'}`}>
                                <span className={`text-[10px] uppercase font-['DM_Sans'] ${(fo?.draft ?? 0) > 0 ? 'text-[#F0A500]' : 'text-[#8B93A7]'}`}>Draft / Pendientes</span>
                                <span className={`font-['JetBrains_Mono'] text-2xl ${(fo?.draft ?? 0) > 0 ? 'text-[#F0A500]' : 'text-[#5A6278]'}`}>{fo?.draft ?? 0}</span>
                            </div>
                            <div className="border-t border-[#2A2F3C] pt-3">
                                <p className="text-[9px] text-[#5A6278] uppercase mb-1">Costo prom. fórmula</p>
                                <p className="font-['JetBrains_Mono'] text-lg text-[#E8ECF4]">
                                    {fmt.usd(fo?.avgLiveCostKg ?? 0)} <span className="text-[10px] text-[#5A6278]">/ kg mix</span>
                                </p>
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Finanzas — span 2 */}
                <Panel title="Finanzas & Salud" icon={DollarSign} href="/dashboard/finanzas">
                    {loading ? (
                        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-20" /><div className="col-span-2"><Skeleton className="h-20" /></div></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <p className="text-[9px] text-[#5A6278] uppercase mb-1">Revenue (Período)</p>
                                <p className="font-['JetBrains_Mono'] text-2xl text-[#E8ECF4]">{fmt.usd(fi?.revenueTotal ?? 0)}</p>
                                <p className="text-[9px] text-[#5A6278] mt-1">Margen est.</p>
                                <p className={`font-['JetBrains_Mono'] text-sm ${(fi?.netMargin ?? 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#E63946]'}`}>
                                    {fmt.usd(fi?.netMargin ?? 0)}
                                    {(fi?.netMargin ?? 0) >= 0
                                        ? <TrendingUp size={12} className="inline ml-1" />
                                        : <TrendingDown size={12} className="inline ml-1" />
                                    }
                                </p>
                                <p className="text-[9px] text-[#5A6278] mt-2">Break-even: {fmt.sf(fi?.breakEvenSf ?? 0)} SF</p>
                            </div>
                            <div className="sm:col-span-2 bg-[#1A1E28] p-4 rounded border border-[#E63946]/20">
                                <div className="flex justify-between text-[9px] text-[#8B93A7] uppercase mb-2">
                                    <span>Deuda Activa PRARA</span>
                                    <span className="font-['JetBrains_Mono'] text-[#E63946]">{fmt.usd(praraDebt)} restantes</span>
                                </div>
                                <div className="w-full bg-[#0C0E12] h-2 rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-[#2ECC71] rounded-full transition-all" style={{ width: `${praraProgress}%` }} />
                                </div>
                                <div className="flex justify-between text-[9px] text-[#5A6278]">
                                    <span>{praraProgress}% amortizado</span>
                                    <span>$5,000 / mes</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Inventario */}
                <Panel title="Inventario Global" icon={Database} href="/lab/quimicos">
                    {loading ? (
                        <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-end border-b border-[#2A2F3C] pb-2">
                                <span className="text-[10px] text-[#8B93A7] uppercase">Crust DONTO disponible</span>
                                <div className="text-right">
                                    <p className="font-['JetBrains_Mono'] text-sm text-[#E8ECF4]">{fmt.sf(inv?.crustSf ?? 0)} SF</p>
                                    <p className="text-[9px] text-[#5A6278]">{inv?.crustLots ?? 0} lotes</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-end border-b border-[#2A2F3C] pb-2">
                                <span className="text-[10px] text-[#8B93A7] uppercase">Valor Químicos en Stock</span>
                                <span className="font-['JetBrains_Mono'] text-sm text-[#E8ECF4]">{fmt.usd(inv?.chemValueUsd ?? 0)}</span>
                            </div>
                            {(inv?.lowStockCount ?? 0) > 0 ? (
                                <div className="flex items-center gap-2 text-[#E63946] bg-[#E63946]/10 p-2.5 rounded text-[10px] font-bold tracking-widest uppercase border border-[#E63946]/20 font-['DM_Sans']">
                                    <AlertTriangle size={13} />
                                    {inv!.lowStockCount} químicos bajo stock mínimo
                                </div>
                            ) : (
                                <div className="text-[#2ECC71] text-[10px] font-['DM_Sans']">✓ Stock OK — sin alertas</div>
                            )}
                        </div>
                    )}
                </Panel>

            </div>
        </div>
    )
}
