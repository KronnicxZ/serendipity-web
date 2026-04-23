import { useQuery } from '@tanstack/react-query'
// import { FinanceService } from '@/services/finance.service'

export function useFinance() {
    return useQuery({
        queryKey: ['finance-summary'],
        queryFn: async () => {
            const response = await fetch('/api/serendipity/finance')
            if (!response.ok) throw new Error('Network response was not ok')
            return response.json()
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
