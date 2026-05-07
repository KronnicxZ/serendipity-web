/**
 * Sofia Local API Client
 * Server-side: calls .NET backend directly at localhost:5001
 * Client-side (browser): uses Next.js rewrite proxy /sofia-api/* → localhost:5001/*
 * This avoids CORS issues when the browser calls port 5001 from port 3000.
 */

const isServer = typeof window === 'undefined'
const BACKEND = isServer
    ? (process.env.SOFIA_BACKEND_URL || 'http://localhost:5001')
    : '/sofia-api'

export async function localFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${BACKEND}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    })
    if (!res.ok) throw new Error(`LocalAPI ${path} → ${res.status}`)
    return res.json()
}

export const isLocal = () =>
    !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === ''
