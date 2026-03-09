'use client'

import React, { useState, useRef, useEffect } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { es, enUS, vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui-library'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/language-context'

import 'react-day-picker/style.css'

interface DateRangePickerProps {
    date: DateRange | undefined
    onDateChange: (date: DateRange | undefined) => void
    className?: string
}

const localeMap = {
    es: es,
    en: enUS,
    vn: vi
}

export function DateRangePicker({ date, onDateChange, className }: DateRangePickerProps) {
    const { t, language } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const currentLocale = localeMap[language] || es

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={cn("relative", className)} ref={ref}>
            <Button
                variant={date ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                    "h-10 px-4 !rounded-[14px] text-[13px] font-medium transition-all flex items-center gap-2",
                    date ? "border border-[var(--border)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <CalendarIcon size={14} className={date ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"} />
                {date?.from ? (
                    date.to ? (
                        <>
                            {format(date.from, "LLL dd, y", { locale: currentLocale })} -{" "}
                            {format(date.to, "LLL dd, y", { locale: currentLocale })}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y", { locale: currentLocale })
                    )
                ) : (
                    <span>{t('common.customRange')}</span>
                )}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 mt-2 right-0 p-4 bg-[var(--card)] border border-[var(--border)] shadow-2xl rounded-[24px]"
                    >
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border)]">
                            <h4 className="font-semibold text-sm">{t('common.selectRange')}</h4>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[var(--secondary)] rounded-full text-[var(--muted-foreground)]">
                                <X size={16} />
                            </button>
                        </div>
                        <DayPicker
                            mode="range"
                            selected={date}
                            onSelect={onDateChange}
                            locale={currentLocale}
                            numberOfMonths={2}
                            classNames={{
                                selected: "opacity-100",
                                range_start: "!bg-blue-600 !text-white !rounded-l-full",
                                range_end: "!bg-blue-600 !text-white !rounded-r-full",
                                range_middle: "rdp-range-mid !bg-blue-600/10 !rounded-none",
                                day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 hover:bg-blue-500/10 hover:text-blue-600 rounded-lg transition-all",
                                day_button: "h-9 w-9 p-0 font-normal aria-selected:rounded-full",
                                today: "text-blue-600 font-bold underline decoration-2 underline-offset-4",
                            }}
                            styles={{
                                caption: { color: 'var(--foreground)', fontWeight: 'bold' },
                                nav_button: { color: 'var(--foreground)' },
                                head_cell: { color: 'var(--muted-foreground)' },
                            }}
                        />
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .rdp-range-mid .rdp-day_button {
                                color: #000000 !important;
                            }
                            .dark .rdp-range-mid .rdp-day_button {
                                color: #dbeafe !important;
                            }
                        `}} />
                        <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="!rounded-xl text-xs" onClick={() => { onDateChange(undefined); setIsOpen(false); }}>
                                {t('common.clear')}
                            </Button>
                            <Button variant="secondary" size="sm" className="!rounded-xl text-xs bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90" onClick={() => setIsOpen(false)}>
                                {t('common.apply')}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
