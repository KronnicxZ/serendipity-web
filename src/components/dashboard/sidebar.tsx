'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, LucideIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MenuItem {
    name: string
    description?: string
    icon: LucideIcon
    href: string
    roles: string[]
}

interface SidebarProps {
    isOpen: boolean
    isDesktop: boolean
    setOpen: (open: boolean) => void
    menuItems: MenuItem[]
}

export function Sidebar({ isOpen, isDesktop, setOpen, menuItems }: SidebarProps) {
    const pathname = usePathname()
    const isCompact = isDesktop && !isOpen

    return (
        <motion.aside
            initial={false}
            animate={{
                width: isOpen ? 280 : (isDesktop ? 88 : 0),
                x: !isDesktop && !isOpen ? -280 : 0
            }}
            className={cn(
                "fixed inset-y-0 left-0 bg-[var(--card)]/80 apple-blur border-r border-[var(--climate-border)] z-50 overflow-hidden",
                !isDesktop && "shadow-2xl shadow-black/20"
            )}
        >
            {/* Logo area */}
            <div className="h-24 flex items-center px-8 mb-4">
                <AnimatePresence mode="wait">
                    {(isOpen || !isDesktop) ? (
                        <motion.span
                            key="text"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-2xl font-black tracking-tighter text-blue-600"
                        >
                            Serendipity
                        </motion.span>
                    ) : (
                        <motion.span
                            key="dot"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-sm"
                        >
                            S
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            <nav className="px-4 space-y-1.5">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        // #3 — Tooltip en modo compacto
                        <div key={item.name} className="relative group/tooltip">
                            <Link
                                href={item.href}
                                prefetch={true}
                                onClick={() => {
                                    if (!isDesktop) setOpen(false)
                                }}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-[14px] transition-all group relative",
                                    isActive
                                        ? "bg-[var(--climate-primary)] text-white shadow-lg shadow-[var(--climate-glow)]"
                                        : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
                                    isCompact && "justify-center"
                                )}
                            >
                                <item.icon
                                    size={22}
                                    className={cn(
                                        "shrink-0 transition-transform",
                                        isActive ? "scale-110" : "group-hover:scale-110"
                                    )}
                                />
                                {(isOpen || !isDesktop) && (
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <span className="font-bold text-[15px] whitespace-nowrap leading-none mb-1">{item.name}</span>
                                        {item.description && (
                                            <span className={cn(
                                                "text-[10px] font-medium uppercase tracking-tight truncate",
                                                isActive ? "text-white/70" : "text-[var(--muted-foreground)]"
                                            )}>
                                                {item.description}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {(isOpen || !isDesktop) && isActive && (
                                    <motion.div layoutId="active-nav" className="absolute right-3">
                                        <ChevronRight size={16} className="opacity-50" />
                                    </motion.div>
                                )}
                            </Link>

                            {/* Tooltip visible solo en modo compacto (isDesktop && !isOpen) */}
                            {isCompact && (
                                <div className={cn(
                                    "absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[60]",
                                    "pointer-events-none opacity-0 group-hover/tooltip:opacity-100",
                                    "transition-opacity duration-150"
                                )}>
                                    <div className="bg-[var(--foreground)] text-[var(--background)] p-3 rounded-xl whitespace-nowrap shadow-xl flex flex-col gap-0.5">
                                        <span className="font-bold text-[13px]">{item.name}</span>
                                        {item.description && (
                                            <span className="text-[10px] opacity-70 font-medium uppercase tracking-wider">{item.description}</span>
                                        )}
                                        {/* Arrow pointing left */}
                                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--foreground)]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>
        </motion.aside>
    )
}
