'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import {
    BarChart3,
    LayoutDashboard,
    Package,
    History,
    Settings,
    Sparkles,
    Waves,
    CloudSun,
    Cloud,
    CloudRain,
    Zap,
    Sun,
    Crosshair,
    FlaskConical,
    Wand2,
    Globe2
} from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui-library'
import { CommandPalette } from '@/components/command-palette'
import { useSophia } from '@/hooks/use-sophia'
import { useFinancialClimate } from '@/hooks/use-financial-climate'
import { useTranslation } from '@/context/language-context'

// Optimized subcomponents
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { LoadingScreen } from '@/components/loading-screen'
import { FloatingSophia } from '@/components/floating-sophia'
import { useNotifications } from '@/context/notification-context'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { MessagingWidget } from '@/components/dashboard/messaging-widget'
import { X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    useSessionTimeout()
    const { user, logout, loading } = useAuth()
    const { t } = useTranslation()
    const { notifications } = useNotifications()
    const router = useRouter()
    const pathname = usePathname()
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(true)
    const [isDarkMode, setIsDarkMode] = useState(false)
    const [isMessagingOpen, setIsMessagingOpen] = useState(false)

    const { alerts: sophiaAlerts } = useSophia()

    const mergedAlerts = useMemo(() => {
        const mappedNotifications = notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            critical: n.type === 'CRITICAL' || n.type === 'ERROR',
            timestamp: n.timestamp,
            isSophia: false,
            actionUrl: n.actionUrl
        }))
        const mappedSophia = (sophiaAlerts || []).map(a => ({
            id: a.id,
            title: t('sophia.title'),
            message: a.message,
            critical: a.type === 'CRITICAL',
            timestamp: a.timestamp,
            isSophia: true
        }))
        return [...mappedNotifications, ...mappedSophia]
    }, [notifications, sophiaAlerts, t])

    const hasAlerts = mergedAlerts.length > 0
    const criticalAlerts = mergedAlerts.filter(a => a.critical)
    const climate = useFinancialClimate()

    const ClimateIconComp = useMemo(() => {
        if (!climate) return Sun
        switch (climate.icon) {
            case 'sun': return Sun
            case 'waves': return Waves
            case 'cloud-sun': return CloudSun
            case 'cloud': return Cloud
            case 'cloud-rain': return CloudRain
            case 'zap': return Zap
            default: return Sun
        }
    }, [climate])

    // Transient alerts removed per user request to avoid UI overlap
    // Critical Sophia alerts are already included in mergedAlerts shown in Header

    useEffect(() => {
        const checkScreen = () => {
            const desktop = window.innerWidth >= 1024
            setIsDesktop(desktop)
            if (desktop) setSidebarOpen(true)
        }
        checkScreen()
        window.addEventListener('resize', checkScreen)
        return () => window.removeEventListener('resize', checkScreen)
    }, [])

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    const toggleTheme = useCallback(() => {
        setIsDarkMode(prev => {
            const next = !prev
            const theme = next ? 'dark' : 'light'
            document.documentElement.setAttribute('data-theme', theme)
            localStorage.setItem('theme', theme)
            return next
        })
    }, [])

    // #7 — Restore persisted theme on mount
    useEffect(() => {
        const stored = localStorage.getItem('theme')
        if (stored) {
            setIsDarkMode(stored === 'dark')
            document.documentElement.setAttribute('data-theme', stored)
        }
    }, [])

    const menuItems = useMemo(() => [
        {
            name: t('common.dashboard'),
            description: t('sidebar.dashboardDesc'),
            icon: LayoutDashboard,
            href: '/dashboard',
            roles: ['ADMIN', 'SUPERVISOR', 'OPERATIVO']
        },
        {
            name: t('common.operations'),
            description: t('sidebar.operationsDesc'),
            icon: Package,
            href: '/dashboard/operaciones',
            roles: ['ADMIN', 'SUPERVISOR', 'OPERATIVO']
        },
        {
            name: t('common.finances'),
            description: t('sidebar.financesDesc'),
            icon: History,
            href: '/dashboard/finanzas',
            roles: ['ADMIN']
        },
        {
            name: 'Director Board',
            description: 'Circuit monitor & simulator',
            icon: Crosshair,
            href: '/dashboard/director',
            roles: ['ADMIN']
        },
        {
            name: 'Genome',
            description: 'Costos reales x SF · Yield · Químicos',
            icon: FlaskConical,
            href: '/dashboard/genome',
            roles: ['ADMIN']
        },
        {
            name: 'Lab · Alquimia',
            description: 'Transmutación I · Pedido de fórmula y químicos',
            icon: Wand2,
            href: '/dashboard/lab',
            roles: ['ADMIN', 'SUPERVISOR']
        },
        {
            name: 'El Reino',
            description: 'Nodos · Ciudadanos · DNA Events',
            icon: Globe2,
            href: '/dashboard/reino',
            roles: ['ADMIN']
        },
    ], [t])

    const filteredMenu = useMemo(() =>
        menuItems.filter(item => user && item.roles.includes(user.role)),
        [menuItems, user])
    const isAllowed = useMemo(() => {
        const menuItem = menuItems.find(item => item.href === pathname);
        if (!menuItem) return true; // Direct dashboard or non-sidebar pages might be open
        return user && menuItem.roles.includes(user.role);
    }, [menuItems, pathname, user]);

    useEffect(() => {
        if (!loading && user && !isAllowed && pathname !== '/dashboard') {
            router.push('/dashboard');
        }
    }, [isAllowed, loading, user, pathname, router]);

    if (loading || !user || (!isAllowed && pathname !== '/dashboard')) return <LoadingScreen />

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-200 transition-colors duration-300 overflow-x-hidden">
            <CommandPalette />

            <AnimatePresence>
                {!isDesktop && isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[45]"
                    />
                )}
            </AnimatePresence>

            <Sidebar
                isOpen={isSidebarOpen}
                isDesktop={isDesktop}
                setOpen={setSidebarOpen}
                menuItems={filteredMenu}
            />

            <main className={cn(
                "transition-all duration-300 pt-32 pb-32 lg:pb-20 min-h-screen",
                isDesktop ? (isSidebarOpen ? "ml-[280px]" : "ml-[88px]") : "ml-0"
            )}>
                <Header
                    isSidebarOpen={isSidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    isDesktop={isDesktop}
                    climate={climate}
                    ClimateIcon={ClimateIconComp}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    criticalAlerts={criticalAlerts}
                    hasAlerts={hasAlerts}
                    alerts={mergedAlerts}
                    user={user}
                    logout={logout}
                />

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 relative">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <MobileNav filteredMenu={filteredMenu} />
            <FloatingSophia onOpenMessaging={() => setIsMessagingOpen(true)} />

            <AnimatePresence>
                {isMessagingOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMessagingOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="relative w-full max-w-6xl h-[92vh] lg:h-full lg:max-h-[85vh] bg-[var(--background)] rounded-[32px] lg:rounded-[40px] shadow-2xl overflow-hidden border border-white/20 lg:border-[var(--border)] ring-1 ring-black/5"
                        >
                            <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-[210]">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMessagingOpen(false)}
                                    className="!rounded-full bg-[var(--secondary)]/50 hover:bg-[var(--secondary)]/80 text-[var(--muted-foreground)] backdrop-blur-md w-8 h-8 lg:w-10 lg:h-10"
                                >
                                    <X size={18} className="lg:scale-110" />
                                </Button>
                            </div>
                            <div className="h-full overflow-hidden p-0 lg:p-4 pt-4 lg:pt-6">
                                <MessagingWidget />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
