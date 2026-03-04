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
    Sun
} from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CommandPalette } from '@/components/command-palette'
import { useSophia } from '@/hooks/use-sophia'
import { useFinancialClimate } from '@/hooks/use-financial-climate'
import { toast } from 'sonner'
import { useTranslation } from '@/context/language-context'

// Optimized subcomponents
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { LoadingScreen } from '@/components/loading-screen'
import { FloatingSophia } from '@/components/floating-sophia'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth()
    const { t } = useTranslation()
    const router = useRouter()
    const pathname = usePathname()
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(true)
    const [isDarkMode, setIsDarkMode] = useState(false)

    const { alerts, hasAlerts, criticalAlerts } = useSophia()
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

    useEffect(() => {
        if (criticalAlerts.length > 0) {
            toast.error('Sophia: Anomalías críticas detectadas', {
                description: criticalAlerts[0].message,
                duration: 4000
            })
        }
    }, [criticalAlerts])

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
        { name: t('common.dashboard'), icon: LayoutDashboard, href: '/dashboard', roles: ['ADMIN', 'SUPERVISOR', 'OPERATIVO'] },
        { name: t('common.operations'), icon: Package, href: '/dashboard/operaciones', roles: ['ADMIN', 'SUPERVISOR', 'OPERATIVO'] },
        { name: t('common.reports'), icon: BarChart3, href: '/dashboard/reportes', roles: ['ADMIN', 'SUPERVISOR'] },
        { name: t('common.finances'), icon: History, href: '/dashboard/finanzas', roles: ['ADMIN'] },
        { name: t('common.sophia'), icon: Sparkles, href: '/dashboard/sophia', roles: ['ADMIN', 'SUPERVISOR'] },
        { name: t('common.settings'), icon: Settings, href: '/dashboard/configuracion', roles: ['ADMIN'] },
    ], [t])

    const filteredMenu = useMemo(() =>
        menuItems.filter(item => user && item.roles.includes(user.role)),
        [menuItems, user])

    if (loading || !user) return <LoadingScreen />

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
                    alerts={alerts}
                    user={user}
                    logout={logout}
                />

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 relative">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <MobileNav filteredMenu={filteredMenu} />
            <FloatingSophia />
        </div>
    )
}
