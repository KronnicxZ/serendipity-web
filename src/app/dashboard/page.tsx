'use client'

import { useAuth } from '@/context/auth-context'
import { motion } from 'framer-motion'
import {
    TrendingUp,
    Users,
    Package,
    DollarSign,
    ArrowUpRight,
    Clock,
    Sparkles,
    ArrowRight,
    Inbox,
    Activity,
    Zap,
    RefreshCcw
} from 'lucide-react'
import { Card, Badge, Button, Skeleton, EmptyState, StatCardSkeleton } from '@/components/ui-library'
import { cn } from '@/lib/utils'

import { useDashboardData } from '@/hooks/use-dashboard-data'
import { toast } from 'sonner'
import { useTranslation } from '@/context/language-context'
import { PerformanceChart } from '@/components/dashboard/performance-chart'

export default function DashboardPage() {
    const { user } = useAuth()
    const { t, language } = useTranslation()
    const { data: dashData, isLoading } = useDashboardData()

    if (!user) return null

    const handleAction = () => {
        toast.success(t('common.active'), {
            description: t('sophia.reasoning'),
            duration: 4000
        })
    }

    const stats = [
        { name: t('dashboard.cashBalance'), value: `$${dashData?.stats.totalProfit.toLocaleString() || '0'}`, icon: DollarSign, trend: '+12%', color: 'bg-blue-500', bg: 'bg-blue-500/10', note: t('common.dashboard') },
        { name: t('dashboard.sfProcessed'), value: '108.000', icon: Package, trend: `${dashData?.stats.onTimeDeliveryRate}%`, color: 'bg-red-500', bg: 'bg-red-500/10', note: t('common.operations') },
        { name: t('dashboard.pendingPayroll'), value: `$${dashData?.stats.totalExpenses.toLocaleString() || '0'}`, icon: Users, trend: '-5%', color: 'bg-blue-500', bg: 'bg-blue-500/10', note: t('common.settings') },
        { name: t('dashboard.prariaAmortization'), value: '$15,000', icon: ArrowUpRight, trend: '37%', color: 'bg-blue-500', bg: 'bg-blue-500/10', note: t('common.finances') },
    ]

    const chartData = dashData?.metrics.slice(-7) || []

    return (
        <div className="space-y-14">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-3">
                    <Badge variant="success" className="mb-2">{t('common.systemConnected')}</Badge>
                    <h1 className="text-[36px] sm:text-[40px] lg:text-[48px] font-bold tracking-tight text-[var(--foreground)] transition-colors duration-500 leading-[1.1] text-balance">
                        {t('common.greeting')}, {user.name}
                    </h1>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 mt-0.5 shrink-0 shadow-sm shadow-blue-500/10">
                            <Sparkles size={18} />
                        </div>
                        <p className="text-[var(--muted-foreground)] transition-colors duration-500 text-lg sm:text-lg font-medium max-w-2xl leading-relaxed">
                            {t('dashboard.messageOfTheDay')}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Card glass className="!py-4 !px-6 flex items-center gap-5 border-none w-full md:min-w-[200px] hover:ring-1 ring-blue-500/20 transition-all cursor-pointer" onClick={() => window.location.href = '/dashboard/sophia'}>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Activity size={18} className="animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">{t('dashboard.coherence')}: 82%</span>
                            <span className="text-sm font-bold text-[var(--foreground)]">{t('dashboard.sacredSymmetry')}</span>
                        </div>
                    </Card>
                    <Card glass className="!py-4 !px-6 flex items-center gap-5 border-none w-full md:min-w-[240px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-1">Status: {dashData?.trend.season.toUpperCase() || 'NORMAL'}</span>
                            <span className="text-base font-bold text-[var(--foreground)]">
                                {new Date().toLocaleDateString(
                                    language === 'en' ? 'en-US' : language === 'vn' ? 'vi-VN' : 'es-ES',
                                    { weekday: 'long', day: 'numeric', month: 'long' }
                                )}
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Quick Metrics (Stats) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, idx) => <StatCardSkeleton key={idx} />)
                    : stats.map((m, idx) => {
                        const isPositive = m.trend.startsWith('+')
                        const isNegative = m.trend.startsWith('-')
                        return (
                            <Card key={idx} className="p-8 space-y-6 group hover:translate-y-[-4px] transition-all duration-500 border-none ring-1 ring-[var(--border)] shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className={cn("p-3 rounded-2xl transition-colors", m.bg)}>
                                        <m.icon className={cn("w-5 h-5", m.color.replace('bg-', 'text-'))} />
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold",
                                        isPositive ? "bg-emerald-500/10 text-emerald-600" :
                                            isNegative ? "bg-red-500/10 text-red-500" :
                                                "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                                    )}>
                                        {isPositive && <span>↑</span>}
                                        {isNegative && <span>↓</span>}
                                        {m.trend}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-[0.2em]">{m.name}</p>
                                    <h3 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{m.value}</h3>
                                    <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{m.note}</p>
                                </div>
                            </Card>
                        )
                    })
                }
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Chart Area */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="p-10 border-none ring-1 ring-[var(--border)] shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--foreground)] text-xl tracking-tight">{t('dashboard.performance')}</h3>
                                    <p className="text-sm text-[var(--muted-foreground)] font-medium">{t('dashboard.dailyProfitMargin')}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" className="h-10 px-4 !rounded-xl">{t('common.sevenDays')}</Button>
                                <Button variant="ghost" size="sm" className="h-10 px-4 !rounded-xl">{t('common.thirtyDays')}</Button>
                            </div>
                        </div>

                        <div className="h-64 px-2">
                            <PerformanceChart data={chartData} type="area" />
                        </div>
                    </Card>

                    {/* Messages Demo */}
                    <div className="space-y-6">
                        <h3 className="font-bold text-[var(--foreground)] text-xl tracking-tight">{t('dashboard.directMessaging')}</h3>
                        <Card className="border-none ring-1 ring-[var(--border)] shadow-sm">
                            <EmptyState
                                icon={Inbox}
                                title={t('dashboard.noNewMessages')}
                                description={t('dashboard.noPendingMessages')}
                                action={
                                    <Button variant="secondary" onClick={() => toast.info(t('common.loading'))}>
                                        {t('dashboard.composeMessage')}
                                    </Button>
                                }
                            />
                        </Card>
                    </div>
                </div>

                {/* Sidebar area */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="p-8 border-none ring-1 ring-[var(--border)] shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[var(--foreground)] text-lg">{t('dashboard.plantActivity')}</h3>
                            <Badge>{t('common.realtime')}</Badge>
                        </div>
                        <div className="space-y-6">
                            {[
                                { t: `${t('dashboard.batchScan')} #452`, time: '5m atrás', user: 'Marcos P.', icon: Package, c: 'text-blue-500' },
                                { t: t('dashboard.materialArrival'), time: '45m atrás', user: 'Lucía M.', icon: Clock, c: 'text-blue-500' },
                                { t: t('dashboard.approvedExpense'), time: '3h atrás', user: 'Santiago', icon: Activity, c: 'text-blue-500' },
                            ].map((a, i) => (
                                <div key={i} className="flex gap-4 items-start group cursor-pointer">
                                    <div className={cn("p-2 rounded-lg bg-[var(--secondary)]", a.c)}>
                                        <a.icon size={18} />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <p className="text-sm font-bold text-[var(--foreground)] group-hover:text-blue-600 transition-colors">{a.t}</p>
                                        <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-tight">{a.time} • {a.user}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest bg-[var(--secondary)] hover:bg-[var(--border)] h-12 !rounded-xl" onClick={handleAction}>
                            {t('dashboard.auditHistory')}
                        </Button>
                    </Card>

                    <Card className="p-8 border-none bg-blue-500/5 ring-1 ring-blue-500/20 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{t('dashboard.goal')}: 150.000 SF</span>
                            <span className="text-xl font-bold tracking-tighter">72%</span>
                        </div>
                        <div className="h-3 bg-blue-500/10 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} className="h-full bg-blue-500 shadow-lg shadow-blue-500/20" />
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <div>
                                <p className="text-2xl font-black text-[var(--foreground)] tracking-tighter">108.000</p>
                                <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">{t('dashboard.sfProcessed')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-[var(--foreground)] tracking-tight">42.000</p>
                                <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">{t('dashboard.remaining')}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
