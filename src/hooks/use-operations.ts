import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { OperationsService } from '@/services/operations.service'
import { Order } from '@/types/operations'
import { useNotifications } from '@/context/notification-context'
import { useTranslation } from '@/context/language-context'

export const useOperations = () => {
    const queryClient = useQueryClient()
    const { addNotification } = useNotifications()
    const { t } = useTranslation()

    const stationsQuery = useQuery({
        queryKey: ['stations'],
        queryFn: () => OperationsService.getStations(),
        staleTime: 1000 * 60 * 60, // 1 hour (stations rarely change)
    })

    const ordersQuery = useQuery({
        queryKey: ['orders'],
        queryFn: () => OperationsService.getOrders(),
        staleTime: 1000 * 30, // 30 seconds
    })

    const summaryQuery = useQuery({
        queryKey: ['orders-summary'],
        queryFn: () => OperationsService.getSummary(),
        staleTime: 1000 * 60, // 1 minute
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, status, reason }: { orderId: string, status: Order['status'], reason?: string }) =>
            OperationsService.updateStatus(orderId, status, reason),
        onSuccess: (updatedOrder) => {
            queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
                if (!old) return [updatedOrder]
                return old.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            })
            queryClient.invalidateQueries({ queryKey: ['orders-summary'] })
            addNotification({
                type: updatedOrder.status === 'red' ? 'CRITICAL' : 'SUCCESS',
                title: `${t('operations.batch')} ${updatedOrder.id}`,
                message: `${t('operations.statusUpdatedTo')} ${updatedOrder.status}`,
                actionUrl: `/dashboard/operaciones?order=${updatedOrder.id}`
            })
        },
        onError: () => {
            addNotification({
                type: 'ERROR',
                title: t('common.error'),
                message: t('operations.errorUpdatingStatus')
            })
        }
    })

    const createOrderMutation = useMutation({
        mutationFn: (order: Partial<Order>) => OperationsService.createOrder(order),
        onSuccess: (newOrder) => {
            queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
                if (!old) return [newOrder]
                return [newOrder, ...old]
            })
            queryClient.invalidateQueries({ queryKey: ['orders-summary'] })
            addNotification({
                type: 'SUCCESS',
                title: t('operations.newBatchIdentified'),
                message: `${t('operations.batch')} ${newOrder.id} ${t('operations.sophiaRegistered')}`,
                actionUrl: `/dashboard/operaciones?order=${newOrder.id}`
            })
        }
    })

    const moveStationMutation = useMutation({
        mutationFn: ({ orderId, stationId }: { orderId: string, stationId: string }) =>
            OperationsService.moveToStation(orderId, stationId),
        onSuccess: (updatedOrder) => {
            queryClient.setQueryData(['orders'], (old: Order[] | undefined) => {
                if (!old) return [updatedOrder]
                return old.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            })
            queryClient.invalidateQueries({ queryKey: ['orders-summary'] })
            const stationName = stationsQuery.data?.find(s => s.id === updatedOrder.currentStationId)?.name || updatedOrder.currentStationId
            addNotification({
                type: 'INFO',
                title: t('operations.transitLabel'),
                message: `${updatedOrder.id} ${t('operations.movedTo')} ${stationName}`,
                actionUrl: `/dashboard/operaciones?order=${updatedOrder.id}`
            })
        }
    })

    const getStationById = (id: string) => {
        return stationsQuery.data?.find(s => s.id === id)
    }

    return {
        stations: stationsQuery.data || [],
        isStationsLoading: stationsQuery.isLoading,
        getStationById,
        orders: ordersQuery.data || [],
        isLoading: ordersQuery.isLoading,
        summary: summaryQuery.data,
        updateStatus: updateStatusMutation.mutate,
        isUpdating: updateStatusMutation.isPending,
        createOrder: createOrderMutation.mutate,
        isCreating: createOrderMutation.isPending,
        moveToStation: moveStationMutation.mutate,
        isMoving: moveStationMutation.isPending
    }
}
