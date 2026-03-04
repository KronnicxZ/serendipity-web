'use client'

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-[var(--primary)] text-white hover:opacity-90 shadow-sm',
            secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--border)]',
            ghost: 'bg-transparent text-[var(--foreground)] hover:bg-[var(--secondary)]',
            destructive: 'bg-[var(--destructive)] text-white hover:opacity-90',
            glass: 'apple-blur subtle-ring text-[var(--foreground)] hover:bg-white/40'
        }

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-5 py-2.5 text-sm',
            lg: 'px-8 py-3.5 text-base',
            icon: 'p-2.5'
        }

        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    'inline-flex items-center justify-center rounded-[12px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    children
                )}
            </motion.button>
        )
    }
)
Button.displayName = 'Button'

export const Card = ({
    children,
    className,
    glass = false,
    bio = false,
    ...props
}: {
    children: React.ReactNode,
    className?: string,
    glass?: boolean,
    bio?: boolean
} & React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'rounded-[20px] p-6 transition-all',
            glass ? 'apple-blur border border-[var(--climate-border)]' : 'bg-[var(--card)] border border-[var(--climate-border)] shadow-sm',
            bio && 'animate-breathing',
            className
        )}
        {...props}
    >
        {children}
    </div>
)

// #1 — Badge con colores semánticos correctos
export const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'critical', className?: string }) => {
    const variants = {
        default: 'bg-[var(--secondary)] text-[var(--muted-foreground)]',
        // ✅ success = emerald (positivo / online / activo)
        success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400',
        // ✅ warning = amber (advertencia, atención)
        warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400',
        // critical = rojo (error, crítico)
        critical: 'bg-red-500/10 text-red-500 border border-red-500/20',
    }
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap', variants[variant], className)}>
            {children}
        </span>
    )
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input
            ref={ref}
            className={cn(
                'w-full bg-[var(--secondary)] border border-[var(--border)] rounded-[12px] px-4 py-3 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all placeholder:text-[var(--muted-foreground)]',
                className
            )}
            {...props}
        />
    )
)
Input.displayName = 'Input'

// #11 — Skeletons con formas más descriptivas
export const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn('animate-pulse bg-gradient-to-r from-[var(--muted)] via-[var(--secondary)] to-[var(--muted)] bg-[length:200%_100%] rounded-[12px]', className)}
        style={{ animation: 'skeleton-shimmer 1.6s ease-in-out infinite' }}
    />
)

export const StatCardSkeleton = () => (
    <div className="rounded-[20px] p-8 space-y-6 bg-[var(--card)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between">
            <Skeleton className="w-12 h-12 !rounded-2xl" />
            <Skeleton className="w-8 h-8 !rounded-full" />
        </div>
        <div className="space-y-2">
            <Skeleton className="w-24 h-3" />
            <Skeleton className="w-32 h-8" />
            <Skeleton className="w-16 h-3" />
        </div>
    </div>
)

export const EmptyState = ({
    title,
    description,
    icon: Icon,
    action
}: {
    title: string,
    description: string,
    icon: any,
    action?: React.ReactNode
}) => (
    <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center space-y-6">
        <div className="w-20 h-20 bg-[var(--secondary)] flex items-center justify-center rounded-[32px] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
            <Icon size={40} />
        </div>
        <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{title}</h3>
            <p className="text-sm text-[var(--muted-foreground)] font-medium leading-relaxed">{description}</p>
        </div>
        {action && <div className="pt-4">{action}</div>}
    </div>
)
