import { useQuery } from '@tanstack/react-query'
import { ReportsService } from '@/services/reports.service'

import { DateRange } from 'react-day-picker'

export function useReports(dateRange?: DateRange) {
    return useQuery({
        queryKey: ['reports-data', dateRange],
        queryFn: () => ReportsService.getReportData(dateRange),
        staleTime: 1000 * 60 * 15, // 15 minutes
    })
}
