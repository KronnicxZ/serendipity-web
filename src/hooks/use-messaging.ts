import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessagingService, Message } from '@/services/messaging.service';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useNotifications } from '@/context/notification-context';

export function useMessaging() {
    const { user } = useAuth();
    const { activeChatId, setActiveChatId } = useChat();
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const MESSAGES_PER_PAGE = 20;

    const fetchMessages = useCallback(async () => {
        if (!user) return;
        const data = await MessagingService.getMessages(user.id);
        setMessages(data);
    }, [user]);

    const fetchUsers = useCallback(async () => {
        const data = await MessagingService.getUsers();
        setUsers(data.filter((u: any) => u.id !== user?.id));
    }, [user]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchMessages(), fetchUsers()]);
            setLoading(false);
        };
        init();

        const supabase = createClient();
        if (!supabase || !user) return;

        const channel = supabase
            .channel('realtime:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // Only add if it's relevant to current user
                    if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
                        // We need the sender/receiver info which isn't in payload.new
                        // So we refresh to get full data, or we could manually fetch the new one
                        fetchMessages(); 
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchMessages, fetchUsers]);

    const conversations = useMemo(() => {
        if (!user) return [];
        
        const groups: Record<string, { user: any, messages: Message[] }> = {};
        
        messages.forEach(msg => {
            const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            if (!groups[otherId]) {
                const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;
                groups[otherId] = { user: { ...otherUser, id: otherId }, messages: [] };
            }
            groups[otherId].messages.push(msg);
        });

        // Add users with no messages yet to allow starting new chats
        users.forEach(u => {
            if (!groups[u.id]) {
                groups[u.id] = { user: u, messages: [] };
            }
        });

        return Object.values(groups).sort((a, b) => {
            const aTime = a.messages[0]?.created_at || '0';
            const bTime = b.messages[0]?.created_at || '0';
            return bTime.localeCompare(aTime);
        });
    }, [messages, users, user]);

    const activeChatMessages = useMemo(() => {
        if (!activeChatId) return [];
        return messages
            .filter(m => (m.sender_id === activeChatId && m.receiver_id === user?.id) || 
                         (m.sender_id === user?.id && m.receiver_id === activeChatId))
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
    }, [messages, activeChatId, user]);

    const loadMoreMessages = useCallback(async () => {
        if (!user || !activeChatId || loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        const currentCount = activeChatMessages.length;
        const moreData = await MessagingService.getChatMessages(
            user.id, 
            activeChatId, 
            MESSAGES_PER_PAGE, 
            currentCount
        );

        if (moreData.length < MESSAGES_PER_PAGE) {
            setHasMore(false);
        }

        if (moreData.length > 0) {
            setMessages(prev => {
                // Filter out duplicates just in case
                const existingIds = new Set(prev.map(m => m.id));
                const newItems = moreData.filter(m => !existingIds.has(m.id));
                return [...prev, ...newItems];
            });
        }
        setLoadingMore(false);
    }, [user, activeChatId, loadingMore, hasMore, activeChatMessages.length]);

    // Reset hasMore when switching chats
    useEffect(() => {
        setHasMore(true);
    }, [activeChatId]);

    const sendMessage = async (content: string, isCritical: boolean = false) => {
        if (!user || !activeChatId) return;
        const newMessage = await MessagingService.sendMessage(user.id, activeChatId, content, isCritical);
        
        // Add full message data (including joined fields) to state immediately
        // Instead of global refresh, fetch the specific new message
        const fullMsg = await MessagingService.getChatMessages(user.id, activeChatId, 1, 0);
        if (fullMsg.length > 0) {
            setMessages(prev => {
                const exists = prev.find(m => m.id === fullMsg[0].id);
                if (exists) return prev;
                return [fullMsg[0], ...prev];
            });
        }
        
        return newMessage;
    };

    const markAsRead = async (msgId: string) => {
        await MessagingService.markAsRead(msgId);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read_at: new Date().toISOString() } : m));
    };

    return {
        conversations,
        activeChatMessages,
        selectedUserId: activeChatId,
        setSelectedUserId: setActiveChatId,
        loading,
        loadingMore,
        hasMore,
        sendMessage,
        loadMoreMessages,
        markAsRead,
        refresh: fetchMessages
    };
}
