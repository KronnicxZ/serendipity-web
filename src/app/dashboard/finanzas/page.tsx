'use client'

import { TrendingUp, ShieldCheck, Sun, Waves, CloudSun, Cloud, CloudRain, Zap, Trees as Desert } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

import { useFinance } from '@/hooks/use-finance'
import { Card, Badge, Button, Skeleton } from '@/components/ui-library'
import { ClimateIcon } from '@/types/finance'
import { useTranslation } from '@/context/language-context'

const ClimateIconMap = ({ icon, className }: { icon: ClimateIcon, className?: string }) => {
    switch (icon) {
        case 'sun': return <Sun className={className} />
        case 'waves': return <Waves className={className} />
        case 'cloud-sun': return <CloudSun className={className} />
        case 'cloud': return <Cloud className={className} />
        case 'cloud-rain': return <CloudRain className={className} />
        case 'zap': return <Zap className={className} />
        case 'desert': return <Desert className={className} />
        default: return <Sun className={className} />
    }
}

export default function FinanzasPage() {
    const { t } = useTranslation()
    const { data: finData, isLoading } = useFinance()

    if (isLoading) {
        return (
            <div className="space-y-12">
                <div className="space-y-4">
                    <Skeleton className="w-32 h-6" />
                    <Skeleton className="w-64 h-12" />
                    <Skeleton className="w-96 h-6" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <Skeleton className="h-80 rounded-[30px]" />
                    <Skeleton className="h-80 rounded-[30px]" />
                </div>
            </div>
        )
    }

    if (!finData) return null

    return (
        <div className="space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2">
                    <Badge variant="success" className="mb-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 border-none font-medium text-xs">{t('finances.solvencyGuarantee')}</Badge>
                    <h1 className="text-3xl lg:text-[36px] font-semibold tracking-tight text-[var(--foreground)]">
                        {t('finances.title')}
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-base font-medium">{t('finances.subtitle')}</p>
                </div>
                <Card className="bg-[var(--card)] py-3 px-6 rounded-[20px] border-none ring-1 ring-[var(--border)] shadow-sm flex items-center justify-center gap-3 w-full lg:w-auto">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[13px] font-semibold text-blue-500">{t('finances.leaderAccess')}</span>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                <Card className="p-8 lg:p-10 space-y-8 rounded-[28px] border-none ring-1 ring-[var(--border)] shadow-sm overflow-hidden relative bg-[var(--card)]">
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 z-0", finData.climate.weatherClass)} />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-[16px] border border-blue-500/20">
                            <ShieldCheck size={20} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--foreground)] text-xl tracking-tight transition-colors">{t('finances.reserveFund')}</h3>
                            <p className="text-sm text-[var(--muted-foreground)] font-medium whitespace-nowrap">{t('finances.projectedBacking')}</p>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-[var(--border)] pb-6">
                            <p className="text-4xl sm:text-5xl font-semibold text-[var(--foreground)] tracking-tight">${finData.reserveFund.toLocaleString()}</p>
                            <p className="text-[13px] font-medium text-[var(--muted-foreground)] mb-1">{t('finances.target')}: ${finData.reserveTarget.toLocaleString()}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="h-4 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)] p-0.5 shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(finData.reserveFund / finData.reserveTarget) * 100}%` }}
                                    transition={{ duration: 2, ease: [0.23, 1, 0.32, 1] }}
                                    className="h-full bg-blue-500 rounded-full"
                                />
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-[20px] border border-[var(--border)] relative overflow-hidden group">
                                <div className="p-2.5 bg-[var(--secondary)] rounded-[12px] text-[var(--foreground)] shrink-0 border border-[var(--border)] shadow-sm">
                                    <ClimateIconMap icon={finData.climate.icon} className="w-4 h-4" />
                                </div>
                                <p className="text-[13px] text-[var(--muted-foreground)] font-medium leading-relaxed pt-1 relative z-10">
                                    {finData.climate.message}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 lg:p-10 space-y-8 rounded-[28px] border-none ring-1 ring-[var(--border)] shadow-sm bg-[var(--card)] relative overflow-hidden transition-colors duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-[16px] border border-emerald-500/20">
                            <TrendingUp size={20} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-xl text-[var(--foreground)] tracking-tight transition-colors">{t('finances.amortization')}</h3>
                            <p className="text-sm text-[var(--muted-foreground)] font-medium">{t('finances.debtSchedule')}</p>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-end border-b border-[var(--border)] pb-6">
                            <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--foreground)] transition-colors">${finData.debtRemaining.toLocaleString()}</p>
                            <div className="text-right pb-1">
                                <p className="text-[11px] font-medium text-[var(--muted-foreground)] mb-0.5">{t('finances.remainingOf')}</p>
                                <p className="text-[14px] font-semibold text-[var(--foreground)]">${finData.debtTotal.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="h-4 bg-[var(--background)] rounded-full overflow-hidden border border-[var(--border)] p-0.5 shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(1 - finData.debtRemaining / finData.debtTotal) * 100}%` }}
                                    transition={{ duration: 2.5, ease: [0.23, 1, 0.32, 1] }}
                                    className="h-full bg-emerald-500 rounded-full"
                                />
                            </div>
                            <Button variant="ghost" className="w-full rounded-[16px] h-12 font-medium bg-[var(--background)] hover:bg-[var(--secondary)] border border-[var(--border)] shadow-sm text-[var(--foreground)] transition-all">
                                {t('finances.analyzePlan')}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Expenses Breakdown */}
            <Card className="p-8 lg:p-10 rounded-[28px] border-none ring-1 ring-[var(--border)] shadow-sm bg-[var(--card)]">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                    <h4 className="font-semibold text-[var(--foreground)] text-lg tracking-tight">{t('finances.expenseStructure')}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {finData.expensesByCategory.map((exp) => (
                        <div key={exp.category} className="space-y-3 bg-[var(--background)] p-5 rounded-[20px] border border-[var(--border)]">
                            <div className="flex justify-between items-center text-[14px] font-semibold">
                                <span className="text-[var(--foreground)]">{exp.category}</span>
                            </div>
                            <p className="text-xl font-semibold text-[var(--foreground)]">${exp.amount.toLocaleString()}</p>
                            <div className="h-2 bg-[var(--secondary)] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${exp.percentage}%` }}
                                    className={cn("h-full rounded-full", exp.color)}
                                />
                            </div>
                            <p className="text-[12px] font-medium text-[var(--muted-foreground)]">{exp.percentage}% {t('finances.totalOf')}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}
