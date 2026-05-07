import { createClient } from '@/lib/supabase/client'
import { localFetch } from '@/lib/local/client'
import { Order, OperationSummary, Station } from '@/types/operations'

interface SofiaProductionSummary {
    success: boolean;
    data: {
        totalSqftMonth: number;
        monthlyTarget: number;
        progressPct: number;
        orderCount: number;
        byClient: Record<string, number>;
        byDay: Array<{ date: string; sqftProcessed: number }>;
    };
}

const SERENDIPITY_STATIONS: Station[] = [
    { id: 'spray', name: 'Spraying', status: 'in-progress', color: '#6366f1', description: 'Aplicacion de acabado', orderCount: 0, order_index: 1 },
    { id: 'emboss', name: 'Embossing', status: 'in-progress', color: '#8b5cf6', description: 'Grabado de textura', orderCount: 0, order_index: 2 },
    { id: 'buff', name: 'Buffing', status: 'in-progress', color: '#a78bfa', description: 'Pulido y acabado', orderCount: 0, order_index: 3 },
    { id: 'pack', name: 'Packing', status: 'in-progress', color: '#c4b5fd', description: 'Empaque y exportacion', orderCount: 0, order_index: 4 },
];

export const OperationsService = {
    async getStations(): Promise<Station[]> {
        const supabase = createClient();
        if (!supabase) {
            try {
                const res = await localFetch<{stations: Station[]}>('/api/local/production');
                return res.stations || SERENDIPITY_STATIONS;
            } catch { return SERENDIPITY_STATIONS; }
        }
        const { data, error } = await supabase.from('stations').select('*').order('order_index', { ascending: true });
        if (error || !data || data.length === 0) return SERENDIPITY_STATIONS;
        return data as Station[];
    },

    async getOrders(): Promise<Order[]> {
        const supabase = createClient();
        if (!supabase) {
            try {
                const res = await fetch('/api/local/batches?month='+new Date().toISOString().slice(0,7)+'&limit=100');
                const data = await res.json();
                return data.orders || [];
            } catch { return []; }
        }
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_status_history (*), order_station_movements (*)')
            .order('created_at', { ascending: false });
        if (error || !data) return [];
        return data.map((order: any) => ({
            id: order.id, qrCode: order.qr_code, status: order.status,
            customer: order.customer, product: order.product,
            quantity: order.quantity, unit: order.unit,
            dueDate: order.due_date, createdAt: order.created_at,
            updatedAt: order.updated_at, currentStationId: order.current_station_id,
            notes: order.notes, assignedTo: order.assigned_to,
            statusHistory: (order.order_status_history || []).map((h: any) => ({
                status: h.status, timestamp: h.created_at, reason: h.reason, updatedBy: h.updated_by
            })),
            stationHistory: (order.order_station_movements || []).map((m: any) => ({
                stationId: m.station_id, enteredAt: m.entered_at, exitedAt: m.exited_at
            })),
        }));
    },

    async getSummary(): Promise<OperationSummary> {
        const supabase = createClient();
        if (!supabase) {
            try {
                const now = new Date(); const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
                const res = await fetch(`/api/local/batches?month=${month}`);
                const data = await res.json();
                const s = data.summary || {};
                return {
                    totalOrders: s.batchCount || 0,
                    activeOrders: Object.keys(s.byClient || {}).length,
                    completedToday: Math.round((s.totalSf || 0) / 30),
                    averageCycleTime: '1.8 dias',
                };
            } catch {
                return { totalOrders: 0, activeOrders: 0, completedToday: 0, averageCycleTime: 'N/A' };
            }
        }
        const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        return { totalOrders: count || 0, activeOrders: count || 0, completedToday: 0, averageCycleTime: '2.4 dias' };
    },

    async createOrder(orderData: Partial<Order>): Promise<Order> {
        const supabase = createClient();
        if (!supabase) {
            const res = await fetch('/api/local/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer: orderData.customer,
                    sqftProcessed: orderData.quantity,
                    source: 'manual',
                    notes: orderData.notes,
                }),
            });
            if (!res.ok) throw new Error('Error creando lote en modo local');
            const created = await res.json();
            return {
                id: created.id || String(Date.now()),
                qrCode: created.batchCode || created.id,
                status: 'amber',
                customer: created.customer || orderData.customer,
                quantity: created.sqftProcessed || orderData.quantity,
                unit: 'SF',
                createdAt: created.createdAt || new Date().toISOString(),
                updatedAt: created.createdAt || new Date().toISOString(),
            } as Order;
        }
        const { data, error } = await supabase.from('orders').insert([{
            qr_code: orderData.qrCode, status: orderData.status || 'amber',
            customer: orderData.customer, product: orderData.product,
            quantity: orderData.quantity, unit: orderData.unit,
            due_date: orderData.dueDate, notes: orderData.notes,
            assigned_to: orderData.assignedTo, current_station_id: orderData.currentStationId,
        }]).select().single();
        if (error) throw error;
        return data as Order;
    },

    async updateOrderStatus(orderId: string, status: Order['status'], reason?: string): Promise<void> {
        const supabase = createClient();
        if (!supabase) {
            await fetch(`/api/local/batches/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, reason }),
            }).catch(() => {}); // best-effort in local mode
            return;
        }
        await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
        await supabase.from('order_status_history').insert([{ order_id: orderId, status, reason }]);
    },

    async moveOrderToStation(orderId: string, stationId: string): Promise<void> {
        const supabase = createClient();
        if (!supabase) {
            await fetch(`/api/local/batches/${orderId}/station`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stationId }),
            }).catch(() => {}); // best-effort in local mode
            return;
        }
        await supabase.from('orders').update({ current_station_id: stationId }).eq('id', orderId);
        await supabase.from('order_station_movements').insert([{ order_id: orderId, station_id: stationId, entered_at: new Date().toISOString() }]);
    },

    async updateStatus(orderId: string, status: Order['status'], reason?: string): Promise<Order> {
        const supabase = createClient();
        if (!supabase) {
            await this.updateOrderStatus(orderId, status, reason);
            return { id: orderId, status } as Order;
        }
        await this.updateOrderStatus(orderId, status, reason);
        const orders = await this.getOrders();
        return orders.find(o => o.id === orderId) || { id: orderId, status } as Order;
    },

    async moveToStation(orderId: string, stationId: string): Promise<Order> {
        const supabase = createClient();
        if (!supabase) {
            await this.moveOrderToStation(orderId, stationId);
            return { id: orderId, currentStationId: stationId } as Order;
        }
        await this.moveOrderToStation(orderId, stationId);
        const orders = await this.getOrders();
        return orders.find(o => o.id === orderId) || { id: orderId, currentStationId: stationId } as Order;
    },
};