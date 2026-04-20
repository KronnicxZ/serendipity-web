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
        try {
            // UNIFICACIÓN: Priorizamos la ruta molecular de Santiago para el dashboard
            const response = await fetch('/api/local/production')
            if (response.ok) {
                const data = await response.json()
                if (data.orders && data.orders.length > 0) {
                    return data.orders
                }
            }
        } catch (err) {
            console.warn("Ruta molecular no disponible, cayendo a Supabase:", err)
        }

        // FALLBACK: Supabase directo (como estaba antes)
        if (!supabase) return [];
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                order_status_history (*),
                order_station_movements (*)
            `)
            .order('created_at', { ascending: false })

        if (ordersError) throw ordersError

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
            statusHistory: order.order_status_history?.map((h: any) => ({
                status: h.status,
                timestamp: h.created_at,
                reason: h.reason
            })) || [],
            stationHistory: order.order_station_movements?.map((m: any) => ({
                stationId: m.station_id,
                enteredAt: m.entered_at,
                exitedAt: m.exited_at
            })) || []
        }))
    },

    async getSummary(): Promise<OperationSummary> {
        try {
            // UNIFICACIÓN: Datos de rendimiento molecular (Santiago + Sofia)
            const response = await fetch('/api/local/production')
            if (response.ok) {
                const data = await response.json()
                const s = data.summary
                return {
                    totalOrders: data.orders?.length || 0,
                    activeOrders: data.orders?.filter((o: any) => o.status !== 'green').length || 0,
                    completedToday: Math.round(s.totalSf / 1000), // Ejemplo de métrica Santiago
                    averageCycleTime: `${s.riskScore ? (10 - s.riskScore).toFixed(1) : '4.2'} días`,
                    // Metadatos extra de la arquitectura de Santiago
                    molecularMetadata: {
                        dailyVelocity: s.dailyVelocity,
                        riskLabel: s.riskLabel,
                        healthLabel: s.healthLabel
                    }
                }
            }
        } catch (err) {
            console.warn("No se pudo obtener resumen molecular:", err)
        }

        return { totalOrders: 0, activeOrders: 0, completedToday: 0, averageCycleTime: '4.2 días' }
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
