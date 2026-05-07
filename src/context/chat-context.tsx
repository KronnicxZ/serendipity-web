'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { useNotifications } from '@/context/notification-context'
import { MessagingService, Message } from '@/services/messaging.service'

interface ChatContextType {
    activeChatId: string | null
    setActiveChatId: (id: string | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
    const [activeChatId, setActiveChatId] = useState<string | null>(null)
    const { user } = useAuth()
    const { addNotification } = useNotifications()

    useEffect(() => {
        if (!user) return

        const supabase = createClient()
        if (!supabase) return

        const channel = supabase
            .channel('global:messaging')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                async (payload) => {
                    const newMsg = payload.new as Message
                    if (newMsg.receiver_id === user.id && newMsg.sender_id !== activeChatId) {
                        // Get sender details for a better notification
                        const users = await MessagingService.getUsers()
                        const sender = users.find((u: any) => u.id === newMsg.sender_id)
                        
                        addNotification({
                            type: newMsg.is_critical ? 'CRITICAL' : 'INFO',
                            title: `Nuevo mensaje de ${sender?.name || 'un colega'}`,
                            message: newMsg.content,
                            actionUrl: `/dashboard?chat=${newMsg.sender_id}`
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, activeChatId, addNotification])

    return (
        <ChatContext.Provider value={{ activeChatId, setActiveChatId }}>
            {children}
        </ChatContext.Provider>
    )
}

export function useChat() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider')
    }
    return context
}
