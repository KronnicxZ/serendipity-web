'use client'

import { Card, Badge, Button, Skeleton } from '@/components/ui-library'
import { Package, QrCode, ArrowRight, Play, CheckCircle2, Clock, Activity, AlertTriangle, Plus, X, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useOperations } from '@/hooks/use-operations'
import dynamic from 'next/dynamic'
import { useTranslation } from '@/context/language-context'

const SophiaEye = dynamic(() => import('@/components/sophia-eye').then(mod => mod.SophiaEye), {
    ssr: false,
    loading: () => <div className="hidden" />
})
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNotifications } from '@/context/notification-context'
import { QRCodeCanvas } from 'qrcode.react'
import { StationTracker } from '@/components/station-tracker'

export default function OperacionesPage() {
    const { t, language } = useTranslation()
    const { addNotification } = useNotifications()
    const { orders, isLoading, summary, updateStatus, createOrder, isCreating, moveToStation, stations, getStationById } = useOperations()
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [activeFilter, setActiveFilter] = useState<'all' | 'green' | 'amber' | 'red'>('all')
    const [stationFilter, setStationFilter] = useState<string | 'all'>('all')

    const [selectedOrderForQR, setSelectedOrderForQR] = useState<string | null>(null)
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null)
    const [pendingYieldCheck, setPendingYieldCheck] = useState<any | null>(null)
    const [yieldInput, setYieldInput] = useState('')

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [createForm, setCreateForm] = useState({
        customer: '',
        product: '',
        quantity: '',
        unit: 'Kg',
        currentStationId: ''
    })

    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams?.get('scan') === 'true') {
            setIsScannerOpen(true)
            router.replace('/dashboard/operaciones', { scroll: false })
        }

        const orderId = searchParams?.get('order')
        if (orderId && orders.length > 0) {
            const foundOrder = orders.find(o => o.id === orderId)
            if (foundOrder && selectedOrderDetails?.id !== orderId) {
                // Wait slightly to ensure initial render is done
                setTimeout(() => setSelectedOrderDetails(foundOrder), 100)
            }
        }
    }, [searchParams, router, orders, selectedOrderDetails])

    const handleCloseOrderDetails = useCallback(() => {
        setSelectedOrderDetails(null)
        if (searchParams?.get('order')) {
            router.replace('/dashboard/operaciones', { scroll: false })
        }
    }, [searchParams, router])

    const handleMoveToNextStation = useCallback((orderToMove: any) => {
        if (stations.length > 0) {
            const currentIdx = stations.findIndex(s => s.id === orderToMove.currentStationId)
            const isLastStation = currentIdx === stations.length - 1

            if (isLastStation) {
                addNotification({
                    type: 'INFO',
                    title: language === 'es' ? 'Lote Finalizado' : 'Batch Completed',
                    message: language === 'es' ? 'El lote ya se encuentra en su etapa final.' : 'This batch is already in its final stage.'
                })
                return
            }

            const nextStation = stations[currentIdx + 1]
            const isMovingToFinalStage = currentIdx + 1 === stations.length - 1

            if (isMovingToFinalStage) {
                setPendingYieldCheck(orderToMove)
            } else if (nextStation) {
                moveToStation({ orderId: orderToMove.id, stationId: nextStation.id })
                addNotification({
                    type: 'SUCCESS',
                    title: t('operations.syncAchieved'),
                    message: `${orderToMove.id} ${t('operations.movedToNext')}`
                })
            }
        }
    }, [stations, moveToStation, t, addNotification, language])

    const handleScanComplete = useCallback((data: string) => {
        setIsScannerOpen(false)

        const existingOrder = orders.find(o => o.id === data || o.qrCode.includes(data))

        if (existingOrder) {
            handleMoveToNextStation(existingOrder)
        } else {
            createOrder({
                customer: `${t('operations.batch')} ${data.substring(0, 8)}`,
                product: 'Materia Primera Promedio',
                quantity: Math.floor(Math.random() * 500) + 100,
                unit: 'Kg',
                currentStationId: stations[0]?.id
            })
            addNotification({
                type: 'INFO',
                title: t('operations.newBatchIdentified'),
                message: t('operations.sophiaRegistered')
            })
        }
    }, [orders, createOrder, moveToStation, t, stations])

    const handleYieldSubmit = () => {
        if (!pendingYieldCheck || !yieldInput) return

        const expected = pendingYieldCheck.quantity
        const actual = parseInt(yieldInput)
        const yieldPct = ((actual / expected) * 100).toFixed(1)
        const isCritical = actual < expected * 0.9

        if (isCritical) {
            addNotification({
                type: 'ERROR',
                title: language === 'es' ? `Alerta Crítica: Yield bajo en ${pendingYieldCheck.id}` : `Critical Alert: Low Yield in ${pendingYieldCheck.id}`,
                message: language === 'es'
                    ? `Rendimiento: ${yieldPct}% (Pérdida de ${expected - actual} SF). Sophia registrará anomalía.`
                    : `Yield: ${yieldPct}% (${expected - actual} SF loss). Sophia will register anomaly.`
            })
            updateStatus({ orderId: pendingYieldCheck.id, status: 'red' })
        } else {
            addNotification({
                type: 'SUCCESS',
                title: language === 'es' ? `Control de Calidad Aprobado en ${pendingYieldCheck.id}` : `Quality Control Approved in ${pendingYieldCheck.id}`,
                message: language === 'es'
                    ? `Sincronía perfecta. Rendimiento: ${yieldPct}%.`
                    : `Perfect symmetry. Yield: ${yieldPct}%.`
            })
            updateStatus({ orderId: pendingYieldCheck.id, status: 'green' })
        }

        if (stations.length > 0 && pendingYieldCheck.currentStationId !== stations[stations.length - 1].id) {
            moveToStation({ orderId: pendingYieldCheck.id, stationId: stations[stations.length - 1].id })
        }

        setPendingYieldCheck(null)
        setYieldInput('')
    }

    const filteredOrders = orders.filter(o => {
        const statusMatch = activeFilter === 'all' ? true : o.status === activeFilter
        const stationMatch = stationFilter === 'all' ? true : o.currentStationId === stationFilter
        return statusMatch && stationMatch
    })

    return (
        <div className="space-y-12">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0;
                    }
                    .print-hide {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <Badge variant="warning" className="mb-2 px-3 py-1 bg-blue-500/10 text-blue-500 border-none font-medium">{t('operations.activeOperation')}</Badge>
                    <h1 className="text-3xl lg:text-[36px] font-semibold tracking-tight text-[var(--foreground)]">
                        {t('operations.title')}
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-base font-medium transition-colors">{t('operations.subtitle')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="flex bg-[var(--card)] p-1.5 rounded-[20px] shadow-sm border border-[var(--border)] overflow-x-auto scrollbar-hide max-w-full sm:max-w-none">
                        {(['all', 'green', 'amber', 'red'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={cn(
                                    "px-4 py-2 text-[13px] font-semibold rounded-[14px] transition-all",
                                    activeFilter === f
                                        ? "bg-blue-500/10 text-blue-500"
                                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/50"
                                )}
                            >
                                {f === 'all' ? t('operations.filterAll') : f === 'green' ? t('operations.filterReady') : f === 'amber' ? t('operations.filterProcess') : t('operations.filterUrgent')}
                            </button>
                        ))}
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-[20px] shadow-sm whitespace-nowrap px-4 py-2 hover:bg-blue-600 bg-blue-500 text-white font-semibold flex items-center gap-2">
                        <Plus size={18} />
                        {language === 'es' ? 'Nuevo Lote' : 'New Batch'}
                    </Button>
                </div>
            </div>

            <SophiaEye
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScanComplete}
            />

            <StationTracker
                orders={orders}
                onStationClick={(id) => setStationFilter(prev => prev === id ? 'all' : id)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                <Card className="lg:col-span-8 p-6 lg:p-8 space-y-6 rounded-[28px] border-none ring-1 ring-[var(--border)] shadow-sm bg-[var(--card)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border)] pb-4 gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-[var(--foreground)] text-lg tracking-tight">{t('operations.batchInProcess')}</h3>
                            {stationFilter !== 'all' && (
                                <Badge variant="default" className="bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium px-2 py-0.5 rounded-[8px]">
                                    {t('operations.station')}: {getStationById(stationFilter)?.name || stationFilter}
                                    <button onClick={() => setStationFilter('all')} className="ml-1.5 hover:text-blue-700">×</button>
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium text-[var(--muted-foreground)]">
                                {isLoading ? t('common.loading') : `${orders.length} ${t('operations.activeBatches')}`}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-[24px]" />
                            ))
                        ) : (
                            <AnimatePresence mode="popLayout" initial={false}>
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map((order) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            key={order.id}
                                            onClick={() => setSelectedOrderDetails(order)}
                                            className="group relative p-4 lg:p-5 bg-[var(--background)] rounded-[20px] hover:bg-[var(--secondary)]/50 transition-all border border-[var(--border)] shadow-sm overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5 hover:border-blue-500/30 cursor-pointer"
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 border",
                                                order.status === 'green' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    order.status === 'amber' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                        "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}>
                                                <QrCode size={20} strokeWidth={2} />
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">ID: {order.id}</span>
                                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)]">
                                                        {getStationById(order.currentStationId)?.name || order.currentStationId}
                                                    </span>
                                                    <Badge
                                                        className={cn(
                                                            "px-2 py-0.5 rounded-[6px] text-[10px] font-medium border-none ml-auto sm:ml-0",
                                                            order.status === 'green' ? "bg-emerald-500/10 text-emerald-500" :
                                                                order.status === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                                                    "bg-red-500/10 text-red-500"
                                                        )}
                                                    >
                                                        {order.status === 'green' ? t('operations.optimized') : order.status === 'amber' ? t('operations.transition') : t('operations.delayed')}
                                                    </Badge>
                                                </div>

                                                <h4 className="text-base sm:text-lg font-semibold text-[var(--foreground)] truncate group-hover:text-blue-500 transition-colors">
                                                    {order.customer}
                                                </h4>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[13px] font-medium text-[var(--muted-foreground)]">{order.product}</span>
                                                    <span className="hidden sm:inline text-[13px] text-[var(--border)]">•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">Volumen:</span>
                                                        <span className="text-[13px] font-semibold text-[var(--foreground)]">{order.quantity} {order.unit}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedOrderForQR(order.id)
                                                    }}
                                                    className="w-10 h-10 rounded-[10px] bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-sm"
                                                    title={t('operations.viewQR')}
                                                >
                                                    <QrCode size={18} />
                                                </button>
                                                {stations.length > 0 && order.currentStationId === stations[stations.length - 1]?.id ? (
                                                    <div className="px-3 h-10 rounded-[10px] bg-blue-500/10 text-blue-500 text-[11px] font-bold flex items-center justify-center gap-1.5 border border-blue-500/20" title={language === 'es' ? 'Completado' : 'Completed'}>
                                                        <CheckCircle2 size={16} />
                                                        <span className="hidden sm:inline">{language === 'es' ? 'COMPLETADO' : 'COMPLETED'}</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleMoveToNextStation(order)
                                                        }}
                                                        className="w-10 h-10 rounded-[10px] bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm"
                                                        title={language === 'es' ? 'Avanzar de Estación' : 'Advance Station'}
                                                    >
                                                        <ArrowRight size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 rounded-[20px] bg-[var(--secondary)] flex items-center justify-center text-[var(--muted-foreground)] border border-[var(--border)] shadow-sm">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-[var(--foreground)]">{t('operations.noBatches')}</p>
                                            <p className="text-[13px] text-[var(--muted-foreground)] mt-1">{t('operations.useCamera')}</p>
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </Card>

                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-[var(--card)] p-6 lg:p-8 space-y-6 rounded-[28px] border border-[var(--border)] shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                                <Activity size={18} strokeWidth={2} />
                            </div>
                            <h3 className="font-semibold text-lg text-[var(--foreground)] tracking-tight">{t('operations.stationDirectory')}</h3>
                        </div>
                        <div className="space-y-3">
                            {stations.map((s, idx) => {
                                const count = orders.filter(o => o.currentStationId === s.id).length
                                // Pick an icon dynamically
                                const IconComp = idx === 0 ? CheckCircle2 : idx === stations.length - 1 ? Clock : Play;
                                return (
                                    <div key={s.id} className="flex items-center justify-between p-3 rounded-[16px] bg-[var(--background)] border border-[var(--border)]">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center border bg-blue-500/10 text-blue-500", s.color)}>
                                                <IconComp size={14} strokeWidth={2.5} />
                                            </div>
                                            <p className="text-[14px] font-medium text-[var(--foreground)]">{idx + 1}. {s.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base font-semibold text-[var(--foreground)]">{count}</span>
                                            <span className="text-[11px] text-[var(--muted-foreground)] font-medium">lotes</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="pt-6 border-t border-[var(--border)]">
                            <p className="text-[13px] text-[var(--muted-foreground)] mb-4 font-medium leading-relaxed">
                                {t('sophia.subtitle')}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 lg:p-8 rounded-[28px] border border-[var(--border)] shadow-sm bg-[var(--card)] space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-[var(--secondary)] flex items-center justify-center text-[var(--foreground)] border border-[var(--border)]">
                                <Package size={18} strokeWidth={2} />
                            </div>
                            <h4 className="font-semibold text-lg text-[var(--foreground)] tracking-tight">{t('operations.summary')}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--background)] p-4 rounded-[16px] border border-[var(--border)]">
                                <p className="text-[12px] font-medium text-[var(--muted-foreground)] mb-1">{t('operations.completed')}</p>
                                <p className="text-2xl font-semibold text-[var(--foreground)]">{summary?.completedToday || 0}</p>
                            </div>
                            <div className="bg-[var(--background)] p-4 rounded-[16px] border border-[var(--border)]">
                                <p className="text-[12px] font-medium text-[var(--muted-foreground)] mb-1">{t('operations.active')}</p>
                                <p className="text-2xl font-semibold text-[var(--foreground)]">{summary?.activeOrders || 0}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 rounded-[28px] border-none ring-1 ring-[var(--border)] shadow-sm bg-[var(--card)] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                <QrCode size={18} strokeWidth={2} />
                            </div>
                            <h4 className="font-semibold text-[var(--foreground)] tracking-tight text-sm">{t('operations.trainingMaterial')}</h4>
                        </div>
                        <div className="pt-2">
                            <img
                                src="/order-qr-sample.png"
                                alt="QR Lote Maestro"
                                className="w-full aspect-square rounded-[20px] bg-white p-4 shadow-sm border cursor-zoom-in hover:scale-[1.02] transition-transform"
                                onClick={() => setSelectedOrderForQR('LOTE-MAESTRO')}
                            />
                            <p className="text-center text-[12px] font-medium text-[var(--muted-foreground)] mt-3">Lote Maestro de Pruebas</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* QR View Modal */}
            <AnimatePresence>
                {selectedOrderForQR && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-md p-6"
                        onClick={() => setSelectedOrderForQR(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[var(--card)] p-12 rounded-[40px] border border-[var(--border)] shadow-2xl max-w-sm w-full text-center relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight text-[var(--foreground)]">{t('operations.syncLabel')}</h3>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] mb-8">{selectedOrderForQR}</p>

                            <div className="bg-white p-8 rounded-[32px] inline-block mb-8 shadow-inner">
                                <QRCodeCanvas
                                    value={selectedOrderForQR}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <p className="text-[var(--muted-foreground)] text-xs font-medium leading-relaxed mb-8">
                                {t('operations.syncInstruction')}
                            </p>

                            <Button
                                onClick={() => setSelectedOrderForQR(null)}
                                className="w-full !rounded-2xl h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold"
                            >
                                {t('operations.understood')}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Batch Details Modal */}
            <AnimatePresence>
                {selectedOrderDetails && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                        onClick={handleCloseOrderDetails}
                    >
                        <motion.div
                            id="print-section"
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-[var(--card)] p-6 sm:p-8 rounded-[32px] border border-[var(--border)] shadow-xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar print:max-w-full print:max-h-none print:overflow-visible print:border-none print:shadow-none"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-6 right-6 flex gap-2 print-hide">
                                <button
                                    onClick={() => window.print()}
                                    className="p-2 rounded-full hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-blue-500 transition-colors"
                                    title={language === 'es' ? 'Imprimir Reporte' : 'Print Report'}
                                >
                                    <Printer size={20} />
                                </button>
                                <button
                                    onClick={handleCloseOrderDetails}
                                    className="p-2 rounded-full hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                                    title={language === 'es' ? 'Cerrar' : 'Close'}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-10 text-center">
                                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-[var(--border)] mb-6 print:border-none print:shadow-none print:p-0 print:mb-8">
                                    <QRCodeCanvas
                                        value={selectedOrderDetails.id}
                                        size={220}
                                        level="H"
                                        includeMargin={false}
                                        className="mx-auto print:!w-[400px] print:!h-[400px]"
                                    />
                                    <p className="text-[12px] font-bold text-black uppercase tracking-[0.3em] mt-5 print:text-[16px] print:tracking-[0.2em] break-all max-w-[280px] print:max-w-[400px] mx-auto print:mt-6">
                                        {selectedOrderDetails.id}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-[14px] font-bold text-blue-500 uppercase tracking-widest mb-2 print:text-black">
                                        Serendipity OS
                                    </p>
                                    <h3 className="text-3xl font-bold text-[var(--foreground)] tracking-tight print:text-black print:text-5xl">
                                        {selectedOrderDetails.customer}
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[var(--background)] p-4 rounded-[20px] border border-[var(--border)]">
                                        <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Producto</p>
                                        <p className="text-sm font-semibold text-[var(--foreground)] truncate print:text-black">{selectedOrderDetails.product}</p>
                                    </div>
                                    <div className="bg-[var(--background)] p-4 rounded-[20px] border border-[var(--border)]">
                                        <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Volumen</p>
                                        <p className="text-sm font-semibold text-[var(--foreground)] print:text-black">{selectedOrderDetails.quantity} {selectedOrderDetails.unit}</p>
                                    </div>
                                    <div className="bg-[var(--background)] p-4 rounded-[20px] border border-[var(--border)]">
                                        <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Estación Activa</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 print:bg-black" />
                                            <p className="text-sm font-semibold text-[var(--foreground)] truncate print:text-black">{getStationById(selectedOrderDetails.currentStationId)?.name || selectedOrderDetails.currentStationId}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--background)] p-4 rounded-[20px] border border-[var(--border)]">
                                        <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Estado</p>
                                        <Badge
                                            className={cn(
                                                "px-2 py-0.5 rounded-[6px] text-[10px] font-bold border-none print:bg-gray-200 print:text-black",
                                                selectedOrderDetails.status === 'green' ? "bg-emerald-500/10 text-emerald-500" :
                                                    selectedOrderDetails.status === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                                        "bg-red-500/10 text-red-500"
                                            )}
                                        >
                                            {selectedOrderDetails.status === 'green' ? t('operations.optimized') : selectedOrderDetails.status === 'amber' ? t('operations.transition') : t('operations.delayed')}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Trazabilidad rápida */}
                                {selectedOrderDetails.stationHistory && selectedOrderDetails.stationHistory.length > 0 && (
                                    <div className="pt-2">
                                        <h4 className="text-[13px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2 print:text-black">
                                            <Activity size={16} />
                                            {language === 'es' ? 'Trazabilidad Física' : 'Physical Traceability'}
                                        </h4>
                                        <div className="space-y-3">
                                            {selectedOrderDetails.stationHistory.slice(-3).reverse().map((hist: any, idx: number) => (
                                                <div key={idx} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500/50 mt-1 print:bg-gray-400" />
                                                        {idx !== Math.min(selectedOrderDetails.stationHistory.length, 3) - 1 && (
                                                            <div className="w-[1px] h-full bg-[var(--border)] my-1 print:bg-gray-300" />
                                                        )}
                                                    </div>
                                                    <div className="pb-3 text-sm">
                                                        <p className="font-semibold text-[var(--foreground)] print:text-black">{getStationById(hist.stationId)?.name || hist.stationId}</p>
                                                        <p className="text-[12px] text-[var(--muted-foreground)] print:text-gray-600">Ingreso: {new Date(hist.enteredAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Yield / Quality Control Modal */}
            <AnimatePresence>
                {pendingYieldCheck && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-[var(--card)] p-6 sm:p-8 rounded-[32px] border border-[var(--border)] shadow-xl max-w-sm w-full relative"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-[16px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                                    <Activity size={20} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight">Control de Calidad</h3>
                                    <p className="text-[13px] font-medium text-[var(--muted-foreground)]">Cálculo de Yield</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[var(--background)] p-5 rounded-[20px] border border-[var(--border)] space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-medium text-[var(--muted-foreground)]">Lote ID</span>
                                        <span className="text-[14px] font-semibold text-[var(--foreground)]">{pendingYieldCheck.id}</span>
                                    </div>
                                    <div className="w-full h-[1px] bg-[var(--border)]" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-medium text-[var(--muted-foreground)]">SF Recibidos (Entrada)</span>
                                        <span className="text-[15px] font-semibold text-blue-500">{pendingYieldCheck.quantity} SF</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-[var(--foreground)] ml-2">Pies Cuadrados (SF) Resultantes</label>
                                    <input
                                        type="number"
                                        value={yieldInput}
                                        onChange={e => setYieldInput(e.target.value)}
                                        placeholder="Ej. 145"
                                        className="w-full h-14 bg-[var(--background)] border border-[var(--border)] rounded-[16px] px-4 text-base font-semibold text-[var(--foreground)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-center"
                                        autoFocus
                                    />
                                    <p className="text-center text-[12px] text-[var(--muted-foreground)] font-medium mt-2">Sophia calculará automáticamente el Yield de operación.</p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => { setPendingYieldCheck(null); setYieldInput(''); }}
                                        className="flex-1 h-12 rounded-[16px] font-medium hover:text-[var(--foreground)] text-[var(--muted-foreground)]"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleYieldSubmit}
                                        disabled={!yieldInput}
                                        className="flex-1 h-12 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                                    >
                                        Validar
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Manual Batch Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="bg-[var(--card)] p-6 sm:p-8 rounded-[32px] border border-[var(--border)] shadow-xl max-w-md w-full relative"
                        >
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-[16px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                                    <Package size={20} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-semibold text-[var(--foreground)] tracking-tight">
                                        {language === 'es' ? 'Alta de Nuevo Lote' : 'Create New Batch'}
                                    </h3>
                                    <p className="text-[13px] font-medium text-[var(--muted-foreground)]">
                                        {language === 'es' ? 'Generación de QR y Registro Manual' : 'QR Generation and Manual Registration'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--foreground)] ml-1">
                                        {language === 'es' ? 'Referencia / Cliente' : 'Reference / Customer'}
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.customer}
                                        onChange={e => setCreateForm({ ...createForm, customer: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[16px] px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--foreground)] ml-1">
                                        {language === 'es' ? 'Descripción del Producto' : 'Product Description'}
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.product}
                                        onChange={e => setCreateForm({ ...createForm, product: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[16px] px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-[13px] font-medium text-[var(--foreground)] ml-1">
                                            {language === 'es' ? 'Volumen Inicial' : 'Initial Volume'}
                                        </label>
                                        <input
                                            type="number"
                                            value={createForm.quantity}
                                            onChange={e => setCreateForm({ ...createForm, quantity: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[16px] px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5 w-24 shrink-0">
                                        <label className="text-[13px] font-medium text-[var(--foreground)] ml-1">Unidad</label>
                                        <select
                                            value={createForm.unit}
                                            onChange={e => setCreateForm({ ...createForm, unit: e.target.value })}
                                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[16px] px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                                        >
                                            <option value="Kg">Kg</option>
                                            <option value="Lbs">Lbs</option>
                                            <option value="SF">SF</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--foreground)] ml-1">
                                        {language === 'es' ? 'Estación de Entrada' : 'Entry Station'}
                                    </label>
                                    <select
                                        value={createForm.currentStationId || (stations[0]?.id || '')}
                                        onChange={e => setCreateForm({ ...createForm, currentStationId: e.target.value })}
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-[16px] px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                                    >
                                        {stations.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 h-12 rounded-[16px]"
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                    <Button
                                        disabled={!createForm.customer || !createForm.quantity || !createForm.product}
                                        onClick={() => {
                                            createOrder({
                                                customer: createForm.customer,
                                                product: createForm.product,
                                                quantity: Number(createForm.quantity),
                                                unit: createForm.unit,
                                                currentStationId: createForm.currentStationId || stations[0]?.id
                                            }, {
                                                onSuccess: (newOrder) => {
                                                    setSelectedOrderDetails(newOrder)
                                                }
                                            })
                                            setIsCreateModalOpen(false)
                                            setCreateForm({ customer: '', product: '', quantity: '', unit: 'Kg', currentStationId: '' })
                                        }}
                                        className="flex-1 h-12 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                    >
                                        {language === 'es' ? 'Generar Lote' : 'Generate Batch'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
