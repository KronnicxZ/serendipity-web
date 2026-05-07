'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'
import { localLoginAsync, localGetSession, localLogout, LocalUser } from '@/lib/local/auth'

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATIVO'

export interface User {
    id: string
    name: string
    email: string
    personalEmail?: string
    role: UserRole
    avatar?: string
    permissions?: Record<string, any>
}

interface AuthContextType {
    user: User | null
    session: Session | null
    login: (email: string, password: string) => Promise<User>
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
    const isLocalMode = !supabase

    useEffect(() => {
        if (isLocalMode) {
            const localUser = localGetSession()
            if (localUser) setUser(localUser)
            setLoading(false)
            return
        }

        supabase!.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession)
            if (currentSession?.user) {
                const metadata = currentSession.user.user_metadata
                setUser({
                    id: currentSession.user.id,
                    email: currentSession.user.email || '',
                    name: metadata.name || currentSession.user.email?.split('@')[0] || 'User',
                    role: (metadata.role as UserRole) || 'OPERATIVO',
                })
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession)
            if (newSession?.user) {
                const metadata = newSession.user.user_metadata
                setUser({
                    id: newSession.user.id,
                    email: newSession.user.email || '',
                    name: metadata.name || newSession.user.email?.split('@')[0] || 'User',
                    role: (metadata.role as UserRole) || 'OPERATIVO',
                })
            } else {
                setUser(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const login = async (email: string, password: string): Promise<User> => {
        if (isLocalMode) {
            // Login asíncrono contra sofia_users en PostgreSQL
            const localUser = await localLoginAsync(email, password)
            setUser(localUser)
            return localUser
        }
        const { error, data } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) throw error
        const metadata = data.user.user_metadata
        const u: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: metadata.name || data.user.email?.split('@')[0] || 'User',
            role: (metadata.role as UserRole) || 'OPERATIVO',
        }
        setUser(u)
        return u
    }

    const loginWithOtp = async (_email: string, _otp: string) => {
        if (isLocalMode) throw new Error('OTP no disponible en modo local')
        const { error } = await supabase!.auth.verifyOtp({ email: _email, token: _otp, type: 'magiclink' })
        if (error) throw error
    }

    const register = async (_email: string, _password: string, _name: string, _role: UserRole) => {
        if (isLocalMode) throw new Error('Registro no disponible en modo local')
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.serendipity.vn'
        const { error } = await supabase!.auth.signUp({
            email: _email, password: _password,
            options: { emailRedirectTo: `${siteUrl}/login`, data: { name: _name, role: _role } }
        })
        if (error) throw error
    }

    const resetPassword = async (_email: string) => {
        if (isLocalMode) throw new Error('Reset no disponible en modo local')
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.serendipity.vn'
        const { error } = await supabase!.auth.resetPasswordForEmail(_email, {
            redirectTo: `${siteUrl}/login/reset-password`
        })
        if (error) throw error
    }

    const updatePassword = async (_password: string) => {
        if (isLocalMode) throw new Error('Update password no disponible en modo local')
        const { error } = await supabase!.auth.updateUser({ password: _password })
        if (error) throw error
    }

    const logout = async () => {
        if (isLocalMode) {
            localLogout()
            setUser(null)
            window.location.href = '/login'
            return
        }
        await supabase!.auth.signOut()
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
