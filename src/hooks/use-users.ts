import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'SUPERVISOR' | 'OPERATIVO'
    created_at: string
}

export function useUsers() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchUsers = async () => {
        if (!supabase) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const updateUserRole = async (userId: string, role: string) => {
        if (!supabase) return { success: false, error: 'Supabase not initialized' }
        try {
            const { error } = await supabase
                .from('users')
                .update({ role })
                .eq('id', userId)

            if (error) throw error

            // Also update auth metadata if possible, but usually role transitions should be handled carefully
            // For now we just update the public table
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as any } : u))
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    }

    const createUser = async (userData: { email: string, password: string, name: string, role: string }) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');
            
            await fetchUsers();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    const deleteUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete user');
            
            setUsers(prev => prev.filter(u => u.id !== userId));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    return { users, loading, error, refresh: fetchUsers, updateUserRole, createUser, deleteUser }
}
