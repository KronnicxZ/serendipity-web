import { useQuery } from '@tanstack/react-query'
import type { FinanceSummary } from '@/types/finance'

export function useFinance() {
    return useQuery<FinanceSummary>({
        queryKey: ['finance-summary'],
        queryFn: () => fetch('/api/finance/summary').then(r => r.json()),
        staleTime: 1000 * 60 * 5,
    })
}
