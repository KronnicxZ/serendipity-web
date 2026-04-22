import { createClient } from '@/lib/supabase/client'
import { Order, OperationSummary, Station } from '@/types/operations'

const supabase = createClient()

export const OperationsService = {
    async getStations(): Promise<Station[]> {
        // Por ahora mantenemos Supabase para estaciones si no se ha migrado
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('stations')
            .select('*')
            .order('order_index', { ascending: true })

        if (error) {
            console.error("Error fetching stations:", error);
            throw error;
        }
        return data as Station[];
    },

    async getOrders(): Promise<Order[]> {
        try {
            const response = await fetch('/api/serendipity/orders')
            if (response.ok) {
                const data = await response.json()
                if (data.orders) {
                    return data.orders.map((order: any) => ({
                        id: order.id,
                        qrCode: order.qr_code || `QR-${order.id}`,
                        status: order.status === 'NEW' ? 'amber' : (order.status === 'DELIVERED' ? 'green' : 'amber'),
                        customer: order.customer,
                        product: order.article, // Mapeo: article -> product
                        quantity: order.qty,     // Mapeo: qty -> quantity
                        unit: order.unit || 'SF',
                        dueDate: order.eta,      // Mapeo: eta -> dueDate
                        createdAt: order.created_at,
                        updatedAt: order.updated_at,
                        currentStationId: order.current_station_id,
                        notes: order.notes,
                        statusHistory: [], // Se llenaría con otro fetch si es necesario
                        stationHistory: []
                    }))
                }
            }
        } catch (err) {
            console.error("Error fetching orders from PostgreSQL API:", err)
        }
        return [];
    },

    async getSummary(): Promise<OperationSummary> {
        const orders = await this.getOrders();
        return {
            totalOrders: orders.length,
            activeOrders: orders.filter(o => o.status !== 'green').length,
            completedToday: orders.filter(o => {
                const today = new Date().toISOString().split('T')[0];
                return o.status === 'green' && o.updatedAt.startsWith(today);
            }).length,
            averageCycleTime: '4.2 días'
        };
    },

    async updateStatus(orderId: string, status: Order['status'], reason?: string): Promise<Order> {
        // Usamos el endpoint de QR para actualizar estado (según arquitectura de Santiago)
        const response = await fetch('/api/serendipity/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                order_id: orderId, 
                action: status === 'green' ? 'DELIVERED' : 'MOVE_TO_STATION',
                station: 'Dashboard', // Placeholder o estación actual
                notes: reason 
            })
        });

        if (!response.ok) throw new Error('Error updating status');

        const allOrders = await this.getOrders()
        return allOrders.find(o => o.id === orderId)!
    },

    async moveToStation(orderId: string, stationId: string): Promise<Order> {
        const response = await fetch('/api/serendipity/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                order_id: orderId, 
                action: 'MOVE_TO_STATION', 
                station: stationId 
            })
        });

        if (!response.ok) throw new Error('Error moving to station');

        const allOrders = await this.getOrders()
        return allOrders.find(o => o.id === orderId)!
    },

    async createOrder(order: Partial<Order>): Promise<Order> {
        const response = await fetch('/api/serendipity/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: order.customer,
                article: order.product,
                qty: order.quantity,
                unit: order.unit,
                eta: order.dueDate,
                notes: order.notes
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error creating order');
        }

        const data = await response.json();
        // Mapeamos el retorno
        return {
            id: data.order.id,
            qrCode: data.order.qr_code,
            status: 'amber',
            customer: data.order.customer,
            product: data.order.article,
            quantity: data.order.qty,
            unit: data.order.unit,
            dueDate: data.order.eta,
            createdAt: data.order.created_at,
            updatedAt: data.order.updated_at,
            currentStationId: data.order.current_station_id,
            notes: data.order.notes,
            statusHistory: [],
            stationHistory: []
        };
    },

    async syncFromSheets(): Promise<{ message: string; data: any[] }> {
        const response = await fetch('/api/serendipity/sheets/sync');
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error sincronizando con Google Sheets');
        }
        return response.json();
    }
}
