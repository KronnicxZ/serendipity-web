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
        if (!supabase) {
            setLoading(false)
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
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

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
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
    }, [supabase])

    const login = async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase Client not initialized')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) throw error
    }

    const loginWithOtp = async (email: string, otp: string) => {
        if (!supabase) throw new Error('Supabase Client not initialized')

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'magiclink'
        })

        if (error) throw error
    }

    const register = async (email: string, password: string, name: string, role: UserRole) => {
        if (!supabase) throw new Error('Supabase Client not initialized')

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    role
                }
            }
        })

        if (error) throw error
    }

    const logout = async () => {
        if (!supabase) return
        await supabase.auth.signOut()
        
        // Force a hard reload to clear any remaining cache and state
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, session, login, loginWithOtp, register, logout, loading }}>
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
