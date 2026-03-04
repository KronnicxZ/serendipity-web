'use client'

/**
 * AuthControls — selector de idioma + toggle de tema reutilizable.
 * Se usa en: login, register y landing.
 * Banderas importadas desde el componente compartido /components/flags.tsx
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/context/language-context'
import { LANGUAGES } from '@/components/flags'

/* ─── Component ─────────────────────────────────────────────────── */
export function AuthControls() {
    const { language, setLanguage } = useTranslation()
    const [isLangOpen, setIsLangOpen] = useState(false)
    const [isDark, setIsDark] = useState(false)

    // Sync with stored theme on mount (persisted via localStorage)
    useEffect(() => {
        const stored = localStorage.getItem('theme')
        const theme = stored || document.documentElement.getAttribute('data-theme') || 'light'
        setIsDark(theme === 'dark')
        document.documentElement.setAttribute('data-theme', theme)
    }, [])

    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        const theme = next ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }

    const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            {/* Language selector */}
            <div className="relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLangOpen(o => !o)}
                    className="!rounded-2xl border border-[var(--border)] shadow-sm bg-[var(--card)] px-4 text-[11px] font-bold uppercase tracking-[0.2em] h-10 flex gap-3 items-center hover:bg-[var(--secondary)] overflow-hidden text-[var(--foreground)]"
                >
                    <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden rounded-full border border-white/20 shadow-sm shrink-0">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={current.code}
                                initial={{ y: 15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -15, opacity: 0 }}
                                className="absolute inset-0"
                            >
                                <current.Flag />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                    <span>{current.label}</span>
                </Button>

                <AnimatePresence>
                    {isLangOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                className="absolute right-0 mt-2 w-56 bg-[var(--card)] border border-[var(--border)] rounded-[20px] shadow-2xl z-50 overflow-hidden p-1.5"
                            >
                                <div className="space-y-0.5">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code as any)
                                                setIsLangOpen(false)
                                            }}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[11px] font-bold uppercase tracking-wider transition-all',
                                                language === lang.code
                                                    ? 'bg-[var(--secondary)] text-[var(--foreground)]'
                                                    : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                                            )}
                                        >
                                            <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--border)] shadow-sm shrink-0">
                                                <lang.Flag />
                                            </div>
                                            {lang.label} - {lang.name}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="!rounded-full border border-[var(--border)] shadow-sm bg-[var(--card)] w-10 h-10 text-[var(--foreground)] hover:bg-[var(--secondary)]"
            >
                {isDark ? <Sun size={18} className="text-blue-500" /> : <Moon size={18} />}
            </Button>
        </div>
    )
}
