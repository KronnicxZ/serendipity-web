'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING' | 'CRITICAL'

export interface AppNotification {
    id: string
    type: NotificationType
    title: string
    message: string
    timestamp: string
    read: boolean
    actionUrl?: string
}

interface NotificationContextType {
    notifications: AppNotification[]
    lastAddedId: string | null
    addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
    markAsRead: (id: string) => void
    clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [lastAddedId, setLastAddedId] = useState<string | null>(null)

    const addNotification = useCallback((params: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
        const id = Math.random().toString(36).substring(2, 11)
        const timestamp = new Date().toISOString()

        const newNotification: AppNotification = {
            ...params,
            id,
            timestamp,
            read: false,
        }

        setNotifications(prev => [newNotification, ...prev])
        setLastAddedId(id)
    }, [])

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }, [])

    const clearAll = useCallback(() => {
        setNotifications([])
    }, [])

    return (
        <NotificationContext.Provider value={{ notifications, lastAddedId, addNotification, markAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
