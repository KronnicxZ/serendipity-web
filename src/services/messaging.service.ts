import { createClient } from '@/lib/supabase/client';

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_critical: boolean;
    read_at: string | null;
    created_at: string;
    sender?: { name: string; role: string };
    receiver?: { name: string; role: string };
}

export const MessagingService = {
    async getMessages(userId: string, limit: number = 50) {
        const supabase = createClient();
        if (!supabase) {
            try {
                const res = await fetch('/api/local/messaging?userId=' + userId);
                const data = await res.json();
                return data.messages || [];
            } catch { return []; }
        }

        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(name, role),
                receiver:receiver_id(name, role)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }

        return data as Message[];
    },

    async getChatMessages(userId: string, otherId: string, limit: number = 20, offset: number = 0) {
        const supabase = createClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(name, role),
                receiver:receiver_id(name, role)
            `)
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching chat messages:', error);
            return [];
        }

        return data as Message[];
    },

    async sendMessage(senderId: string, receiverId: string, content: string, isCritical: boolean = false) {
        const supabase = createClient();
        if (!supabase) {
            try {
                const res = await fetch('/api/local/messaging', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channel: 'internal', sender_id: senderId, receiver_id: receiverId, content, is_critical: isCritical }),
                });
                const data = await res.json();
                return data.message as Message;
            } catch (err: any) { throw err; }
        }

        const { data, error } = await supabase
            .from('messages')
            .insert([
                { sender_id: senderId, receiver_id: receiverId, content, is_critical: isCritical }
            ])
            .select()
            .single();

        if (error) throw error;
        return data as Message;
    },

    async markAsRead(messageId: string) {
        const supabase = createClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', messageId);

        if (error) console.error('Error marking message as read:', error);
    },

    async getUsers() {
        const supabase = createClient();
        if (!supabase) {
            try {
                const res = await fetch('/api/local/messaging?type=contacts');
                const data = await res.json();
                return data.contacts || [];
            } catch { return []; }
        }


        const { data, error } = await supabase
            .from('users')
            .select('id, name, role');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data;
    }
};
