'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, ArrowRight, Eye, EyeOff, Save } from 'lucide-react'
import { Button, Input } from '@/components/ui-library'
import { useTranslation } from '@/context/language-context'
import { AuthControls } from '@/components/auth-controls'
import { useNotifications } from '@/context/notification-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const { t } = useTranslation()
    const { addNotification } = useNotifications()
    const router = useRouter()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            addNotification({
                type: 'ERROR',
                title: 'Error de Simetría',
                message: 'Las contraseñas no coinciden.'
            })
            return
        }

        setIsLoading(true)

        // Simulating password reset
        setTimeout(() => {
            setIsLoading(false)
            setIsSuccess(true)
            addNotification({
                type: 'SUCCESS',
                title: t('auth.resetSuccessTitle') || 'Clave Actualizada',
                message: t('auth.resetSuccessMessage') || 'Tu clave ha sido restablecida con éxito.'
            })
        }, 1500)
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
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900" />
                    <motion.div
                        animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full blur-[100px] opacity-30"
                    />
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        <div className="flex items-center gap-3 mb-8 outline outline-1 outline-white/20 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                            <Shield size={18} className="text-blue-200" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Security Core</span>
                        </div>
                        <h2 className="text-6xl font-bold tracking-tighter mb-6 leading-tight uppercase">
                            {t('auth.new') || 'Nueva'} <span className="text-blue-300">{t('auth.identity') || 'Identidad'}</span>
                        </h2>
                        <p className="text-blue-100/60 leading-relaxed text-sm lg:text-base font-medium">
                            {t('auth.resetPasswordDescription') || 'Restablece tu clave de acceso para asegurar la integridad de tu cuenta en Anthropos Core.'}
                        </p>
                    </motion.div>
                </div>
                <div className="absolute bottom-12 left-12 lg:left-20 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
                    Serendipity Bros © 2026
                </div>
            </motion.div>

            {/* Right Side (Form) */}
            <div className="flex-1 flex flex-col relative overflow-y-auto">
                <div className="lg:hidden h-24 bg-blue-600 flex items-center justify-start px-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500 to-indigo-900" />
                    <h1 className="relative z-10 text-white font-bold tracking-widest text-sm uppercase">Anthropos OS</h1>
                </div>

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
                        {!isSuccess ? (
                            <>
                                <header className="space-y-3">
                                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg lg:hidden mb-6">
                                        <Lock size={24} />
                                    </div>
                                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--foreground)]">
                                        {t('auth.resetPasswordTitle') || 'Restablecer Clave'}
                                    </h1>
                                    <p className="text-[var(--muted-foreground)] text-sm font-medium leading-relaxed">
                                        {t('auth.resetPasswordSubtitle') || 'Crea una nueva clave de acceso que sea fuerte y segura.'}
                                    </p>
                                </header>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">{t('auth.newPassword') || 'Nueva Clave'}</label>
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

                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[var(--muted-foreground)] ml-1 uppercase tracking-wider">{t('auth.confirmPassword') || 'Confirmar Clave'}</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-blue-600 transition-colors">
                                                    <Lock size={18} />
                                                </div>
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="pl-12 pr-12 !h-14 !rounded-2xl !bg-[var(--secondary)]/50 border-[var(--border)] focus:!bg-[var(--card)] focus:ring-2 focus:ring-blue-600/20 text-base"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full !h-14 text-base !rounded-[20px] bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
                                        isLoading={isLoading}
                                    >
                                        {t('auth.updatePassword') || 'ACTUALIZAR CLAVE'}
                                        {!isLoading && <Save size={18} className="ml-2" />}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                    <Shield size={40} />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                                    {t('auth.passwordUpdatedTitle') || '¡Clave Actualizada!'}
                                </h1>
                                <p className="text-[var(--muted-foreground)] text-sm font-medium leading-relaxed max-w-sm mx-auto">
                                    {t('auth.passwordUpdatedMessage') || 'Tu identidad ha sido asegurada. Ahora ya puedes entrar al sistema con tu nueva clave de acceso.'}
                                </p>
                                <Link href="/login" className="block">
                                    <Button className="w-full !h-14 text-sm !rounded-[20px] bg-blue-600 text-white font-bold uppercase tracking-widest">
                                        {t('auth.backToLogin') || 'VOLVER AL LOGIN'}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
