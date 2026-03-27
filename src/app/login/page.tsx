'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, ChevronLeft, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react'
import { Button, Input } from '@/components/ui-library'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useTranslation } from '@/context/language-context'
import { AuthControls } from '@/components/auth-controls'
import { useNotifications } from '@/context/notification-context'
import { useSettings } from '@/hooks/use-settings'
import { sendMfaEmail, verifyMfaCode } from '@/app/actions/mfa'

const REMEMBER_KEY = 'anthropos_remembered_email'

export default function LoginPage() {
    const { login, loading } = useAuth()
    const { t, language } = useTranslation()
    const { addNotification } = useNotifications()
    const { settings } = useSettings()
    const router = useRouter()

    const [step, setStep] = useState<'LOGIN' | 'MFA'>('LOGIN')
    const [otpCode, setOtpCode] = useState('')
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
    const [pendingMfaAuth, setPendingMfaAuth] = useState<{ hash: string; expiration: number } | null>(null)
    const [mfaError, setMfaError] = useState<string | null>(null)

    const [identity, setIdentity] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    // Pre-fill email si estaba guardado
    useEffect(() => {
        const saved = localStorage.getItem(REMEMBER_KEY)
        if (saved) {
            setIdentity(saved)
            setRememberMe(true)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Guardar o borrar email según el checkbox
        if (rememberMe) {
            localStorage.setItem(REMEMBER_KEY, identity)
        } else {
            localStorage.removeItem(REMEMBER_KEY)
        }

        try {
            await login(identity, password)

            // Si 2FA está habilitado en configuración del sistema
            if (settings.security.twoFactorEnabled) {
                const todayStr = new Date().toISOString().split('T')[0]
                const lastVerified = localStorage.getItem('anthropos_mfa_last_verified')

                if (lastVerified === todayStr) {
                    handleSuccess()
                    return
                }

                setStep('MFA')

                const res = await sendMfaEmail(identity)
                if (res.success && res.hash && res.expiration) {
                    setPendingMfaAuth({ hash: res.hash, expiration: res.expiration })
                } else {
                    addNotification({
                        type: 'ERROR',
                        title: t('auth.oracleSophia') || 'Sophia Oracle',
                        message: res.error || t('auth.loginErrorMessage'),
                    })
                }
                return
            }

            handleSuccess()
        } catch (error: any) {
            console.error(error)
            addNotification({
                type: 'ERROR',
                title: t('auth.loginErrorTitle'),
                message: error.message || t('auth.loginErrorMessage'),
            })
        }
    }

    const handleMFA = async (e: React.FormEvent) => {
        e.preventDefault()
        setMfaError(null)
        setIsVerifyingOtp(true)
        try {
            if (otpCode.length === 6) {
                if (!pendingMfaAuth) {
                    throw new Error('Parámetros de seguridad faltantes. Refresca la página e intenta de nuevo.')
                }
                const res = await verifyMfaCode(identity, otpCode, pendingMfaAuth.hash, pendingMfaAuth.expiration)
                if (res.success) {
                    const todayStr = new Date().toISOString().split('T')[0]
                    localStorage.setItem('anthropos_mfa_last_verified', todayStr)
                    handleSuccess()
                } else {
                    throw new Error(res.error || 'Código incorrecto o expirado')
                }
            } else {
                throw new Error('El código debe ser de 6 dígitos')
            }
        } catch (error: any) {
            setMfaError(error.message || 'Código incorrecto')
            setOtpCode('')
            addNotification({
                type: 'ERROR',
                title: t('auth.adminCodeErrorTitle'),
                message: error.message || t('auth.loginErrorMessage'),
            })
        } finally {
            setIsVerifyingOtp(false)
        }
    }

    const handleSuccess = () => {
        addNotification({
            type: 'SUCCESS',
            title: t('auth.loginSuccessTitle'),
            message: t('auth.loginSuccessMessage', { user: identity }),
        })
        router.push('/dashboard')
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--background)] transition-colors duration-500 font-sans overflow-hidden">
            {/* Panel izquierdo visual — solo desktop */}
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-600 items-center justify-center p-12 lg:p-20"
            >
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900" />
                    <motion.div
                        animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full blur-[100px] opacity-30"
                    />
                    <motion.div
                        animate={{ y: [0, 20, 0], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-[120px] opacity-20"
                    />
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>
                        <div className="flex items-center gap-3 mb-8 outline outline-1 outline-white/20 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                            <Shield size={18} className="text-blue-200" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Anthropos Core OS</span>
                        </div>
                        <p className="text-blue-100/80 text-lg font-medium mb-2">{t('auth.loginSubtitle')}</p>
                        <h2 className="text-6xl font-bold tracking-tighter mb-6 leading-tight">
                            {t('auth.loginWelcomeTitle')} <span className="text-blue-300">{t('auth.loginWelcomeBack')}</span>
                        </h2>
                        <div className="w-16 h-1 bg-blue-400/50 rounded-full mb-8" />
                        <p className="text-blue-100/60 leading-relaxed text-sm lg:text-base font-medium">
                            {t('auth.welcomeDescription')}
                        </p>
                    </motion.div>
                </div>

                <div className="absolute bottom-12 left-12 lg:left-20 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
                    Serendipity OS © 2026
                </div>
            </motion.div>

            {/* Panel derecho — formulario */}
            <div className="flex-1 flex flex-col relative overflow-y-auto">
                {/* Header mobile */}
                <div className="lg:hidden h-24 bg-blue-600 flex items-center justify-between px-6 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500 to-indigo-900" />
                    <h1 className="relative z-10 text-white font-bold tracking-widest text-xs uppercase truncate pr-4">Anthropos OS</h1>
                    <div className="relative z-10 scale-90 origin-right">
                        <AuthControls />
                    </div>
                </div>

                {/* Controles desktop */}
                <div className="hidden lg:flex absolute top-10 right-10 z-50 items-center gap-4">
                    <AuthControls />
                </div>

                <div className="flex-1 flex items-center justify-center p-6 lg:p-12 mt-8 lg:mt-0">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full max-w-[420px] space-y-10"
                    >
                        <AnimatePresence mode="wait">
                            {step === 'LOGIN' ? (
                                <motion.div
                                    key="login-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-10"
                                >
                                    <header className="space-y-3">
                                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg lg:hidden mb-6">
                                            <Shield size={24} />
                                        </div>
                                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--foreground)]">
                                            {t('auth.loginAction')}
                                        </h1>
                                        <p className="text-[var(--muted-foreground)] text-sm font-medium leading-relaxed">
                                            {t('auth.subtitle')}
                                        </p>
                                    </header>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Email */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">
                                                {t('auth.identity')}
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-blue-600 transition-colors">
                                                    <Mail size={18} />
                                                </div>
                                                <Input
                                                    type="email"
                                                    required
                                                    value={identity}
                                                    onChange={(e) => setIdentity(e.target.value)}
                                                    placeholder={t('auth.emailPlaceholder') || 'nombre@serendipity.com'}
                                                    className="pl-12 !h-14 !rounded-2xl !bg-[var(--secondary)]/50 border-[var(--border)] focus:!bg-[var(--card)] focus:ring-2 focus:ring-blue-600/20 text-base"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">
                                                {t('auth.password')}
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-blue-600 transition-colors">
                                                    <Lock size={18} />
                                                </div>
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
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

                                        {/* Remember me + Forgot password */}
                                        <div className="flex items-center justify-between px-1">
                                            <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                                                <div
                                                    onClick={() => setRememberMe(r => !r)}
                                                    className={cn(
                                                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0',
                                                        rememberMe
                                                            ? 'bg-blue-600 border-blue-600'
                                                            : 'border-[var(--border)] group-hover:border-blue-400'
                                                    )}
                                                >
                                                    {rememberMe && (
                                                        <motion.svg
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            width="10" height="8" viewBox="0 0 10 8" fill="none"
                                                        >
                                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </motion.svg>
                                                    )}
                                                </div>
                                                <span className="text-[13px] font-bold text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors uppercase tracking-wide">
                                                    {t('auth.rememberMe') || 'Recordar datos'}
                                                </span>
                                            </label>

                                            <Link
                                                href="/login/forgot-password"
                                                className="text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                                            >
                                                {t('auth.forgotPasswordAction') || '¿Olvidaste tu clave?'}
                                            </Link>
                                        </div>

                                        {/* Submit */}
                                        <Button
                                            type="submit"
                                            className="w-full !h-14 text-base !rounded-[20px] bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
                                            isLoading={loading}
                                        >
                                            {t('auth.loginAction') || 'INGRESAR'}
                                            {!loading && <ArrowRight size={18} className="ml-2" />}
                                        </Button>
                                    </form>

                                    <footer className="pt-8 border-t border-[var(--border)] flex flex-col items-center gap-6">
                                        <p className="text-sm font-medium text-[var(--muted-foreground)]">
                                            {t('auth.noAccount') || "¿No tienes cuenta?"}{' '}
                                            <Link href="/register" className="font-bold text-blue-600 hover:underline decoration-2 underline-offset-4">
                                                {t('auth.register') || 'Regístrate'}
                                            </Link>
                                        </p>
                                        <Link href={`${process.env.NEXT_PUBLIC_LANDING_URL || "/"}?lang=${language}`}>
                                            <Button variant="ghost" size="sm" className="!rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                                                <ChevronLeft size={14} className="mr-1" /> {t('common.backToStart') || 'Volver al inicio'}
                                            </Button>
                                        </Link>
                                    </footer>
                                </motion.div>
                            ) : (
                                /* Paso MFA — sin cambios */
                                <motion.div
                                    key="mfa-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-10"
                                >
                                    <header className="space-y-3">
                                        <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg mb-6">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--foreground)]">
                                            {t('auth.mfaTitle') || 'Verificación Ritual'}
                                        </h1>
                                        <p className="text-[var(--muted-foreground)] text-sm font-medium leading-relaxed">
                                            {t('auth.mfaDescription') || 'El Templo requiere una segunda llave de paso enviada a tu correo electrónico.'}
                                        </p>
                                    </header>

                                    <form onSubmit={handleMFA} className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-widest block text-center">
                                                {t('auth.mfaCodeLabel') || 'Código de Sincronía'}
                                            </label>
                                            <div className="relative group max-w-[280px] mx-auto">
                                                <div className={cn('absolute left-4 top-1/2 -translate-y-1/2 transition-transform', mfaError ? 'text-red-500' : 'text-amber-500 group-focus-within:scale-110')}>
                                                    <KeyRound size={22} />
                                                </div>
                                                <Input
                                                    type="text"
                                                    required
                                                    maxLength={6}
                                                    value={otpCode}
                                                    onChange={(e) => {
                                                        setOtpCode(e.target.value.replace(/\D/g, ''))
                                                        if (mfaError) setMfaError(null)
                                                    }}
                                                    placeholder="000000"
                                                    className={cn(
                                                        'pl-14 !h-16 !rounded-2xl focus:!bg-[var(--card)] text-center text-3xl font-black tracking-[0.3em] overflow-hidden',
                                                        mfaError
                                                            ? '!bg-red-500/10 border-red-500/50 focus:ring-4 focus:ring-red-500/20 text-red-500'
                                                            : '!bg-amber-500/5 border-amber-500/20 focus:ring-4 focus:ring-amber-500/10'
                                                    )}
                                                />
                                            </div>
                                            {mfaError ? (
                                                <p className="text-[11px] font-bold text-center text-red-500 uppercase tracking-tighter animate-pulse">{mfaError}</p>
                                            ) : (
                                                <p className="text-[10px] text-center text-[var(--muted-foreground)] uppercase tracking-tighter">
                                                    {t('auth.mfaCodeHelp') || 'Ingresa los 6 dígitos enviados a tu correo'}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <Button
                                                type="submit"
                                                className="w-full !h-14 text-base !rounded-[20px] bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
                                                isLoading={isVerifyingOtp}
                                            >
                                                {t('auth.mfaAction') || 'Verificar Identidad'}
                                                {!isVerifyingOtp && <CheckCircle2 size={18} className="ml-2" />}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setStep('LOGIN')}
                                                className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]"
                                            >
                                                {t('common.backToStart') || 'Volver al inicio'}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
