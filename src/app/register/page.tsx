'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserRole } from '@/context/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, ArrowRight, ChevronDown, Mail, User, Shield, ChevronLeft, Lock, Eye, EyeOff } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useTranslation } from '@/context/language-context'
import { AuthControls } from '@/components/auth-controls'
import { useNotifications } from '@/context/notification-context'

export default function RegisterPage() {
    const { t, language } = useTranslation()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState<UserRole>('OPERATIVO')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const { register } = useAuth()
    const router = useRouter()

    const { addNotification } = useNotifications()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await register(email, password, name, role)
            router.push('/dashboard')
            addNotification({
                type: 'SUCCESS',
                title: t('auth.accountCreatedTitle'),
                message: t('auth.accountCreatedMessage')
            })
        } catch (error: any) {
            console.error(error)
            addNotification({
                type: 'ERROR',
                title: t('auth.accountErrorTitle') || 'Error',
                message: error.message || 'Failed to create account. Please try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--background)] transition-colors duration-500 font-sans overflow-hidden">
            {/* Split Layout: Left Side (Visual Branding) */}
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-600 items-center justify-center p-12 lg:p-20"
            >
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900" />

                    {/* Floating Orbs */}
                    <motion.div
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-400 rounded-full blur-[100px] opacity-30"
                    />
                    <motion.div
                        animate={{
                            y: [0, 30, 0],
                            opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-400 rounded-full blur-[120px] opacity-20"
                    />

                    {/* Grid Overlay */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 text-white max-w-lg">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        <div className="flex items-center gap-3 mb-8 outline outline-1 outline-white/20 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                            <UserPlus size={18} className="text-blue-200" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Join Anthropos</span>
                        </div>

                        <p className="text-blue-100/80 text-lg font-medium mb-2">{t('auth.registerSubtitle')}</p>
                        <h2 className="text-6xl font-bold tracking-tighter mb-6 leading-tight uppercase">
                            {t('auth.startYour')} <span className="text-blue-300">{t('auth.journey')}</span>
                        </h2>

                        <div className="w-16 h-1 w-20 bg-blue-400/50 rounded-full mb-8" />

                        <p className="text-blue-100/60 leading-relaxed text-sm lg:text-base font-medium">
                            {t('auth.registerDescription')}
                        </p>
                    </motion.div>
                </div>

                {/* Footer Brand */}
                <div className="absolute bottom-12 left-12 lg:left-20 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
                    Serendipity Bros © 2026
                </div>
            </motion.div>

            {/* Right Side (Form) */}
            <div className="flex-1 flex flex-col relative overflow-y-auto">
                {/* Mobile Header (Hidden on Desktop) */}
                <div className="lg:hidden h-24 bg-blue-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500 to-indigo-900" />
                    <h1 className="relative z-10 text-white font-bold tracking-widest text-sm uppercase">Anthropos Core</h1>
                </div>

                {/* Floating Controls */}
                <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-50">
                    <AuthControls />
                </div>

                <div className="flex-1 flex items-center justify-center p-6 lg:p-12 mt-8 lg:mt-0">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full max-w-[420px] space-y-10"
                    >
                        <header className="space-y-3">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg lg:hidden mb-6">
                                <UserPlus size={24} />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--foreground)]">
                                {t('auth.registerTitle') || 'Get Started'}
                            </h1>
                            <p className="text-[var(--muted-foreground)] text-sm font-medium leading-relaxed">
                                {t('auth.registerSubtitle') || 'Create your account to start managing the plant operations with Sophia.'}
                            </p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">{t('auth.nameLabel')}</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-blue-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <Input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('auth.namePlaceholder')}
                                        className="pl-12 !h-14 !rounded-2xl !bg-[var(--secondary)]/50 border-[var(--border)] focus:!bg-[var(--card)] focus:ring-2 focus:ring-blue-600/20 text-base"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">{t('auth.emailLabel')}</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-blue-600 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <Input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('auth.emailPlaceholder')}
                                        className="pl-12 !h-14 !rounded-2xl !bg-[var(--secondary)]/50 border-[var(--border)] focus:!bg-[var(--card)] focus:ring-2 focus:ring-blue-600/20 text-base"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">{t('auth.password') || 'Password'}</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-12 pr-12 !h-14 !rounded-2xl !bg-[var(--secondary)]/50 border-[var(--border)] focus:!bg-[var(--card)] focus:ring-2 focus:ring-blue-600/20 text-base"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">{t('auth.authority')}</label>
                                <button
                                    type="button"
                                    onClick={() => !isLoading && setIsDropdownOpen(!isDropdownOpen)}
                                    className={cn(
                                        "w-full bg-[var(--secondary)]/50 border border-[var(--border)] rounded-[18px] px-5 h-14 text-sm text-left flex items-center justify-between transition-all outline-none text-[var(--foreground)]",
                                        isDropdownOpen ? "ring-2 ring-blue-600 bg-[var(--card)]" : "hover:bg-[var(--secondary)]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-blue-600"><Shield size={18} /></div>
                                        <span className="font-bold">
                                            {role === 'ADMIN' ? t('auth.admin') : role === 'SUPERVISOR' ? t('auth.supervisor') : t('auth.plant')}
                                        </span>
                                    </div>
                                    <ChevronDown size={18} className={cn("text-[var(--muted-foreground)] transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                </button>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full mb-3 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-[24px] shadow-2xl z-20 overflow-hidden p-2"
                                            >
                                                {[
                                                    { value: 'SUPERVISOR', label: t('auth.supervisor'), desc: t('auth.supervisorDesc') },
                                                    { value: 'OPERATIVO', label: t('auth.plant'), desc: t('auth.plantDesc') }
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setRole(option.value as UserRole)
                                                            setIsDropdownOpen(false)
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-5 py-4 rounded-[18px] text-sm transition-all flex items-center justify-between group mb-1 last:mb-0",
                                                            role === option.value ? "bg-blue-600 text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                                                        )}
                                                    >
                                                        <div>
                                                            <p className={cn("font-bold text-base", role === option.value ? "text-white" : "text-[var(--foreground)]")}>{option.label}</p>
                                                            <p className={cn("text-[10px] uppercase font-bold tracking-wider mt-0.5", role === option.value ? "text-white/70" : "text-[var(--muted-foreground)]")}>{option.desc}</p>
                                                        </div>
                                                        {role === option.value && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Button
                                type="submit"
                                className="w-full !h-14 text-base !rounded-[20px] bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
                                isLoading={isLoading}
                            >
                                {t('auth.createAccount') || 'SIGN UP'}
                                {!isLoading && <ArrowRight size={18} className="ml-2" />}
                            </Button>
                        </form>

                        <footer className="pt-8 border-t border-[var(--border)] flex flex-col items-center gap-6">
                            <p className="text-sm font-medium text-[var(--muted-foreground)]">
                                {t('auth.alreadyHaveAccount') || "Already have an account?"}{' '}
                                <Link href="/login" className="font-bold text-blue-600 hover:underline decoration-2 underline-offset-4">
                                    {t('auth.loginAction') || 'Log in'}
                                </Link>
                            </p>

                            <Link href="/landing">
                                <Button variant="ghost" size="sm" className="!rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                                    <ChevronLeft size={14} className="mr-1" /> {t('common.backToStart') || 'Back to Start'}
                                </Button>
                            </Link>
                        </footer>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
