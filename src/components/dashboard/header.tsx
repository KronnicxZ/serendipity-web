'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
    Menu,
    X,
    Sun,
    Moon,
    Bell,
    Settings,
    LogOut,
    Command as CommandIcon,
    LucideIcon,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/context/language-context'
import { useNotifications } from '@/context/notification-context'
import { useEffect, useState } from 'react'
// #9 — Banderas importadas del componente compartido
import { LANGUAGES } from '@/components/flags'

interface HeaderProps {
    isSidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    isDesktop: boolean
    climate: any
    ClimateIcon: LucideIcon
    isDarkMode: boolean
    toggleTheme: () => void
    criticalAlerts: any[]
    hasAlerts: boolean
    alerts: any[]
    user: any
    logout: () => void
}

// #6 — Avatar con iniciales del usuario
function UserAvatar({ name, role }: { name: string; role: string }) {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    // Color determinista basado en el nombre (colores sólidos)
    const solidColors = [
        'bg-blue-600',
        'bg-purple-600',
        'bg-rose-600',
        'bg-teal-600',
        'bg-orange-600',
    ]
    const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % solidColors.length
    const bgColor = solidColors[colorIdx]

    return (
        <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 border-transparent group-hover:border-[var(--climate-primary)] transition-all overflow-hidden',
            bgColor
        )}>
            <span className="text-white text-xs font-black tracking-tight">{initials}</span>
        </div>
    )
}

export function Header({
    isSidebarOpen,
    setSidebarOpen,
    isDesktop,
    climate,
    ClimateIcon,
    isDarkMode,
    toggleTheme,
    criticalAlerts,
    hasAlerts,
    alerts,
    user,
    logout
}: HeaderProps) {
    const router = useRouter()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isLangOpen, setIsLangOpen] = useState(false)
    const [isAlertsOpen, setIsAlertsOpen] = useState(false)
    const { language, setLanguage, t } = useTranslation()
    const { lastAddedId } = useNotifications()
    const [shouldAnimate, setShouldAnimate] = useState(false)

    useEffect(() => {
        if (lastAddedId) {
            setShouldAnimate(true)
            const timer = setTimeout(() => setShouldAnimate(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [lastAddedId])

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

    return (
        <header className={cn(
            "fixed top-0 right-0 h-20 apple-blur border-b border-[var(--climate-border)] z-40 px-6 lg:px-12 flex items-center justify-between",
            isDesktop ? (isSidebarOpen ? "left-[280px]" : "left-[88px]") : "left-0"
        )}>
            <div className="flex items-center gap-4 sm:gap-6">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!isSidebarOpen)} className="!rounded-full hover:bg-[var(--secondary)] overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={isSidebarOpen ? 'close' : 'menu'}
                            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </motion.div>
                    </AnimatePresence>
                </Button>
                <div className="hidden sm:flex items-center gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{t('common.system')}</p>
                        <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight leading-none mt-1">{t('common.commandCenter')}</h2>
                    </div>

                    {climate && (
                        <div className="flex items-center gap-3 pl-4 border-l border-[var(--climate-border)]">
                            <div className="p-2 bg-[var(--climate-glow)] text-[var(--climate-primary)] rounded-lg">
                                <ClimateIcon size={18} />
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">{t('common.climate')}: {climate.season}</p>
                                <p className="text-[11px] font-medium text-[var(--foreground)] opacity-70 leading-none mt-0.5">{climate.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                {/* Search shortcut */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[var(--secondary)] border border-[var(--border)] rounded-xl text-[10px] font-bold text-[var(--muted-foreground)] cursor-pointer hover:border-[var(--muted-foreground)]"
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
                    <CommandIcon size={12} /> {t('common.search')}
                </div>

                {/* Language selector */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className="!rounded-2xl border border-[var(--border)] shadow-sm bg-[var(--card)] px-4 text-[11px] font-bold uppercase tracking-[0.2em] h-10 flex gap-3 items-center hover:bg-[var(--secondary)] group overflow-hidden text-[var(--foreground)]"
                    >
                        <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden rounded-full border border-white/20 shadow-sm shrink-0 bg-[var(--secondary)]">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={currentLang.code}
                                    initial={{ y: 15, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -15, opacity: 0 }}
                                    className="absolute inset-0"
                                >
                                    <currentLang.Flag />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <span className="min-w-[20px] text-center">{currentLang.label}</span>
                    </Button>

                    <AnimatePresence>
                        {isLangOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-4 w-56 bg-[var(--card)] border border-[var(--border)] rounded-[20px] shadow-2xl z-50 overflow-hidden p-1.5"
                                >
                                    <div className="space-y-1">
                                        {LANGUAGES.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    setLanguage(lang.code as any)
                                                    setIsLangOpen(false)
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[11px] font-bold uppercase tracking-wider transition-all",
                                                    language === lang.code
                                                        ? "bg-[var(--secondary)] text-[var(--foreground)]"
                                                        : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                                                )}
                                            >
                                                <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--border)] shadow-sm">
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
                <Button variant="ghost" size="icon" onClick={toggleTheme}
                    className="!rounded-full border border-[var(--border)] shadow-sm bg-[var(--card)] w-10 h-10">
                    {isDarkMode ? <Sun size={18} className="text-blue-500" /> : <Moon size={18} />}
                </Button>

                {/* #4 — Bell con panel de notificaciones */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                        className={cn(
                            "!rounded-full border border-[var(--border)] shadow-sm relative bg-[var(--card)] w-10 h-10",
                            criticalAlerts.length > 0 ? "text-red-500" : "text-[var(--muted-foreground)]"
                        )}
                    >
                        <motion.div
                            animate={shouldAnimate ? {
                                scale: [1, 1.2, 1],
                                transition: { duration: 0.5, repeat: 3 }
                            } : {}}
                        >
                            <Bell size={18} className={cn(criticalAlerts.length > 0 && "animate-bounce")} />
                        </motion.div>

                        {shouldAnimate && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: [0, 0.5, 0], scale: [1, 2, 2.5] }}
                                transition={{ duration: 1.5, repeat: 1 }}
                                className="absolute inset-0 rounded-full bg-blue-500/30"
                            />
                        )}

                        {hasAlerts && (
                            <span className={cn(
                                "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[var(--card)]",
                                criticalAlerts.length > 0 ? "bg-red-500" : "bg-blue-500"
                            )}>
                                {alerts.length}
                            </span>
                        )}
                    </Button>

                    <AnimatePresence>
                        {isAlertsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-4 w-80 bg-[var(--card)] border border-[var(--border)] rounded-[24px] shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                                        <p className="text-sm font-bold text-[var(--foreground)]">{t('common.notifications') ?? 'Notificaciones'}</p>
                                        {hasAlerts && (
                                            <Badge variant={criticalAlerts.length > 0 ? 'critical' : 'warning'}>
                                                {alerts.length} {t('common.new') ?? 'nuevas'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="p-2 max-h-80 overflow-y-auto">
                                        {alerts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-[var(--muted-foreground)]">
                                                <Bell size={28} className="mb-3 opacity-30" />
                                                <p className="text-sm font-medium">{t('common.noAlerts') ?? 'Sin alertas activas'}</p>
                                            </div>
                                        ) : (
                                            alerts.map((alert: any, i: number) => (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        if (alert.actionUrl) {
                                                            router.push(alert.actionUrl)
                                                            setIsAlertsOpen(false)
                                                        }
                                                    }}
                                                    className="flex items-start gap-3 px-3 py-3 rounded-[14px] hover:bg-[var(--secondary)] cursor-pointer"
                                                >
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                        alert.critical ? "bg-red-500" : "bg-blue-500"
                                                    )} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-[var(--foreground)]">{alert.title ?? 'Alerta'}</p>
                                                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{alert.message}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* User profile */}
                <div className="relative">
                    <div
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 sm:gap-4 pl-4 sm:pl-6 border-l border-[var(--border)] cursor-pointer group"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-[var(--foreground)]">{user.name}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] leading-none font-mono">{user.role}</p>
                            </div>
                        </div>
                        {/* #6 — Avatar con iniciales */}
                        <div className="w-10 h-10">
                            <UserAvatar name={user.name} role={user.role} />
                        </div>
                    </div>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-4 w-64 bg-[var(--card)] border border-[var(--border)] rounded-[24px] shadow-2xl z-50 overflow-hidden p-2"
                                >
                                    {/* User info header in dropdown */}
                                    <div className="px-4 py-3 mb-1 flex items-center gap-3 border-b border-[var(--border)]">
                                        <div className="w-10 h-10 shrink-0">
                                            <div className="w-full h-full rounded-full overflow-hidden">
                                                <UserAvatar name={user.name} role={user.role} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--foreground)]">{user.name}</p>
                                            <p className="text-[10px] font-bold uppercase text-[var(--muted-foreground)] tracking-wider font-mono">{user.role}</p>
                                        </div>
                                    </div>

                                    <div className="p-1 space-y-1">
                                        <button
                                            onClick={() => {
                                                router.push('/dashboard/configuracion')
                                                setIsProfileOpen(false)
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-all"
                                        >
                                            <Settings size={18} />
                                            {t('common.accountSettings')}
                                        </button>
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
                                        >
                                            <LogOut size={18} />
                                            {t('common.logout')}
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    )
}
