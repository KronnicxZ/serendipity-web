import { useQuery } from '@tanstack/react-query'
import { DashboardService } from '@/services/dashboard.service'
import { DateRange } from 'react-day-picker'

export const useDashboardData = (dateRange?: DateRange) => {
    return useQuery({
        queryKey: ['dashboard-data', dateRange],
        queryFn: () => DashboardService.getDashboardData(dateRange),
        staleTime: 5 * 60 * 1000,
    })
}
