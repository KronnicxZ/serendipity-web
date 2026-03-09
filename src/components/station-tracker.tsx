'use client'

import React from 'react'
import { Card, Badge } from './ui-library'
import { CheckCircle2, Play, Clock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Order } from '@/types/operations'
import { useTranslation } from '@/context/language-context'
import { useOperations } from '@/hooks/use-operations'

export function StationTracker({ orders, onStationClick }: { orders: Order[], onStationClick?: (stationId: string) => void }) {
    const { t } = useTranslation()
    const { stations } = useOperations()
    const getCount = (id: string) => orders.filter(o => o.currentStationId === id).length

    if (!stations || stations.length === 0) return null

    return (
        <Card bio className="p-8 border-none ring-1 ring-[var(--climate-border)] shadow-sm overflow-x-auto hide-scrollbar">
            <div className="flex items-center justify-between mb-8 min-w-max">
                <div>
                    <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{t('operations.physicalSyncMap')}</h3>
                    <p className="text-sm text-[var(--muted-foreground)] font-medium">{t('operations.stationDistribution')}</p>
                </div>
                <Badge variant="success">{t('common.realtime')}</Badge>
            </div>

            <div className="flex gap-6 relative min-w-max pb-2">
                {stations.map((station, idx) => {
                    const count = getCount(station.id)
                    const isLast = idx === stations.length - 1
                    const IconComp = idx === 0 ? CheckCircle2 : idx === stations.length - 1 ? Clock : Play;

                    return (
                        <div key={station.id} className="relative flex min-w-[280px] flex-col items-center flex-1">
                            <motion.div
                                onClick={() => onStationClick?.(station.id)}
                                whileHover={{ scale: 1.02 }}
                                className={cn(
                                    "w-full h-full p-6 rounded-[28px] border transition-all duration-500 cursor-pointer group flex flex-col justify-between",
                                    count > 0 ? "bg-[var(--secondary)]/40 border-[var(--climate-primary)]/20 shadow-lg shadow-[var(--climate-glow)]" : "bg-transparent border-[var(--border)] opacity-60"
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={cn("p-2 rounded-xl bg-[var(--background)] shadow-sm text-blue-500", station.color)}>
                                        <IconComp size={20} />
                                    </div>
                                    <span className="text-2xl font-black text-[var(--foreground)]">{count}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-[var(--foreground)]">{station.name}</h4>
                                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mt-1 line-clamp-2">{station.description}</p>
                                </div>
                            </motion.div>

                            {!isLast && (
                                <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] items-center justify-center text-[var(--muted-foreground)] shadow-sm">
                                    <ArrowRight size={14} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
