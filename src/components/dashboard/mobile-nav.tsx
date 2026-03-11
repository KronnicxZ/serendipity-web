'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface MenuItem {
    name: string
    icon: LucideIcon
    href: string
}

interface MobileNavProps {
    filteredMenu: MenuItem[]
}

export function MobileNav({ filteredMenu }: MobileNavProps) {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--card)]/80 apple-blur border-t border-[var(--border)] z-50 flex items-center justify-around px-2 lg:hidden">
            <div
                className="w-full h-full grid items-center px-2 max-w-md mx-auto"
                style={{ gridTemplateColumns: `repeat(${filteredMenu.length}, minmax(0, 1fr))` }}
            >
                {filteredMenu.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            prefetch={true}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-200 relative",
                                isActive ? "text-blue-600" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-xl transition-all duration-200",
                                isActive && "bg-blue-600/10 shadow-sm"
                            )}>
                                <item.icon size={20} className={cn("transition-transform", isActive && "scale-110")} />
                            </div>
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-tighter transition-opacity truncate w-full text-center px-1",
                                isActive ? "opacity-100" : "opacity-60"
                            )}>
                                {item.name.toUpperCase().startsWith('EL ') || item.name.toUpperCase().startsWith('LA ') || item.name.toUpperCase().startsWith('THE ')
                                    ? item.name.split(' ').slice(1).join(' ')
                                    : item.name.split(' ')[0]}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-active-pill"
                                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-blue-600 rounded-full"
                                />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
