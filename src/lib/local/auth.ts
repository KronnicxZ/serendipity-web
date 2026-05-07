/**
 * Sofia Local Auth — Conectado a sofia_users via API
 * Las raíces del árbol: cada operador del Templo tiene su acceso
 */

export interface LocalUser {
    id: string
    name: string
    email: string
    personalEmail?: string
    role: 'ADMIN' | 'SUPERVISOR' | 'OPERATIVO'
    avatar?: string
    permissions?: Record<string, any>
}

const SESSION_KEY = 'sofia_local_session'

export function localLogin(email: string, password: string): LocalUser {
    // Fallback síncrono — el auth-context usará loginAsync por defecto
    // Este solo se mantiene por compatibilidad
    const fallbacks = [
        { id: 'SRN-NV01', name: 'Santiago Campanera', email: 'santi@serendipity.vn', password: 'Abundancia2026', role: 'ADMIN' as const },
    ]
    const found = fallbacks.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (!found) throw new Error('Credenciales incorrectas — usa loginAsync para autenticación completa')
    const { password: _, ...user } = found
    if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    }
    return user
}

// Login asíncrono contra la DB via API route
export async function localLoginAsync(email: string, password: string): Promise<LocalUser> {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        const data = await res.json()

        if (!data.success) {
            throw new Error(data.error || 'Error de autenticación')
        }

        const user: LocalUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            personalEmail: data.user.personalEmail,
            role: data.user.role,
            avatar: data.user.avatar,
            permissions: data.user.permissions,
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem(SESSION_KEY, JSON.stringify(user))
        }

        return user
    } catch (fetchError) {
        // Si el API no responde, fallback a login síncrono
        console.warn('[Auth] API unavailable, using fallback:', fetchError)
        return localLogin(email, password)
    }
}

export function localGetSession(): LocalUser | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    try { return JSON.parse(stored) } catch { return null }
}

export function localLogout(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_KEY)
    }
}
