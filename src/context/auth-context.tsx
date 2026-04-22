'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATIVO'

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
}

interface AuthContextType {
    user: User | null
    session: Session | null
    login: (email: string, password: string) => Promise<void>
    loginWithOtp: (email: string, otp: string) => Promise<void>
    register: (email: string, password: string, name: string, role: UserRole) => Promise<void>
    resetPassword: (email: string) => Promise<void>
    updatePassword: (password: string) => Promise<void>
    logout: () => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        // Inicialización: intentamos recuperar usuario de localStorage si no hay session de Supabase
        const savedUser = localStorage.getItem('anthropos_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }

        if (!supabase) {
            setLoading(false)
            return
        }

        // Mantenemos Supabase para compatibilidad si hay sesión activa
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession)
            if (currentSession?.user && !savedUser) {
                const metadata = currentSession.user.user_metadata
                const u: User = {
                    id: currentSession.user.id,
                    email: currentSession.user.email || '',
                    name: metadata.name || currentSession.user.email?.split('@')[0] || 'User',
                    role: (metadata.role as UserRole) || 'OPERATIVO',
                }
                setUser(u);
                localStorage.setItem('anthropos_user', JSON.stringify(u));
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession)
            if (newSession?.user) {
                const metadata = newSession.user.user_metadata
                const u: User = {
                    id: newSession.user.id,
                    email: newSession.user.email || '',
                    name: metadata.name || newSession.user.email?.split('@')[0] || 'User',
                    role: (metadata.role as UserRole) || 'OPERATIVO',
                }
                setUser(u);
                localStorage.setItem('anthropos_user', JSON.stringify(u));
            } else if (!_event.includes('SIGNED_IN')) {
                // Solo limpiamos si no hay un usuario local (de PG)
                if (!localStorage.getItem('anthropos_user')) {
                    setUser(null)
                }
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    const login = async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Fallo en la autenticación');

        const u: User = {
            id: data.user.id.toString(),
            email: data.user.email,
            name: data.user.name,
            role: data.user.role
        };

        setUser(u);
        localStorage.setItem('anthropos_user', JSON.stringify(u));
    }

    const loginWithOtp = async (email: string, otp: string) => {
        // Implementación pendiente para PG si es necesario
        if (!supabase) throw new Error('Supabase Client not initialized')
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'magiclink' })
        if (error) throw error
    }

    const register = async (email: string, password: string, name: string, role: UserRole) => {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, role })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en el registro');
    }

    const resetPassword = async (email: string) => {
        if (!supabase) throw new Error('Supabase Client not initialized')
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.serendipity.vn'
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/login/reset-password`
        })
        if (error) throw error
    }

    const updatePassword = async (password: string) => {
        if (!supabase) throw new Error('Supabase Client not initialized')
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
    }

    const logout = async () => {
        if (supabase) await supabase.auth.signOut()
        localStorage.removeItem('anthropos_user');
        setUser(null);
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, session, login, loginWithOtp, register, resetPassword, updatePassword, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
