import { createClient } from '@/lib/supabase/client'
import { Order, OperationSummary, Station } from '@/types/operations'

const supabase = createClient()

export const OperationsService = {
    async getStations(): Promise<Station[]> {
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
        if (!supabase) return [];

        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                order_status_history (*),
                order_station_movements (*)
            `)
            .order('created_at', { ascending: false })

        if (ordersError) {
            console.error("Error fetching orders:", ordersError)
            throw ordersError
        }

        return ordersData.map(order => ({
            id: order.id,
            qrCode: order.qr_code,
            status: order.status,
            customer: order.customer,
            product: order.product,
            quantity: order.quantity,
            unit: order.unit,
            dueDate: order.due_date,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            currentStationId: order.current_station_id,
            notes: order.notes,
            assignedTo: order.assigned_to,
            statusHistory: order.order_status_history?.map((h: any) => ({
                status: h.status,
                timestamp: h.created_at,
                reason: h.reason,
                updatedBy: h.updated_by
            })) || [],
            stationHistory: order.order_station_movements?.map((m: any) => ({
                stationId: m.station_id,
                enteredAt: m.entered_at,
                exitedAt: m.exited_at
            })) || []
        }))
    },

    async getSummary(): Promise<OperationSummary> {
        if (!supabase) return { totalOrders: 0, activeOrders: 0, completedToday: 0, averageCycleTime: '0 días' }

        const { data: stations } = await supabase.from('stations').select('id').order('order_index', { ascending: false }).limit(1)
        const lastStationId = stations?.[0]?.id

        if (!lastStationId) {
            const { count: total } = await supabase.from('orders').select('*', { count: 'exact', head: true })
            return {
                totalOrders: total || 0,
                activeOrders: total || 0,
                completedToday: 0,
                averageCycleTime: '0 días'
            }
        }

        // Active: anything not in the last station
        const { count: active } = await supabase.from('orders').select('*', { count: 'exact', head: true }).neq('current_station_id', lastStationId)
        // Completed: anything in the last station
        const { count: completed } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('current_station_id', lastStationId)

        const total = (active || 0) + (completed || 0)

        return {
            totalOrders: total,
            activeOrders: active || 0,
            completedToday: completed || 0,
            averageCycleTime: '4.2 días'
        }
    },

    async updateStatus(orderId: string, status: Order['status'], reason?: string): Promise<Order> {
        if (!supabase) throw new Error('No supabase client');

        const { error: updateError } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', orderId)

        if (updateError) throw updateError

        const { data: userData } = await supabase.auth.getUser()

        await supabase.from('order_status_history').insert({
            order_id: orderId,
            status,
            reason,
            updated_by: userData.user?.id
        })

        const allOrders = await this.getOrders()
        return allOrders.find(o => o.id === orderId)!
    },

    async moveToStation(orderId: string, stationId: string): Promise<Order> {
        if (!supabase) throw new Error('No supabase client');

        const now = new Date().toISOString()
        const { data: userData } = await supabase.auth.getUser()

        const { error: orderError } = await supabase
            .from('orders')
            .update({
                current_station_id: stationId,
                updated_at: now
            })
            .eq('id', orderId)

        if (orderError) throw orderError

        const { data: activeMovement } = await supabase
            .from('order_station_movements')
            .select('*')
            .eq('order_id', orderId)
            .is('exited_at', null)
            .single()

        if (activeMovement) {
            await supabase.from('order_station_movements')
                .update({ exited_at: now })
                .eq('id', activeMovement.id)
        }

        await supabase.from('order_station_movements').insert({
            order_id: orderId,
            station_id: stationId,
            entered_at: now,
            handled_by: userData.user?.id
        })

        const allOrders = await this.getOrders()
        return allOrders.find(o => o.id === orderId)!
    },

    async createOrder(order: Partial<Order>): Promise<Order> {
        if (!supabase) throw new Error('No supabase client');
        const now = new Date().toISOString()
        const qrCode = `https://anthropos.io/qr/${Date.now()}`
        const { data: userData } = await supabase.auth.getUser()

        const { data, error } = await supabase.from('orders').insert({
            qr_code: qrCode,
            status: order.status || 'amber',
            customer: order.customer || 'Cliente Prototipo',
            product: order.product || 'Materia Prima',
            quantity: order.quantity || 100,
            unit: order.unit || 'Kg',
            due_date: order.dueDate || new Date(Date.now() + 86400000 * 5).toISOString(),
            current_station_id: order.currentStationId,
            assigned_to: userData.user?.id
        }).select().single()

        if (error) throw error

        await supabase.from('order_status_history').insert({
            order_id: data.id,
            status: data.status,
            reason: 'Escaneo Inicial',
            updated_by: userData.user?.id
        })

        await supabase.from('order_station_movements').insert({
            order_id: data.id,
            station_id: data.current_station_id,
            entered_at: now,
            handled_by: userData.user?.id
        })

        const allOrders = await this.getOrders()
        return allOrders.find(o => o.id === data.id)!
    }
}
