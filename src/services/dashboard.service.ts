import { DashboardData, MetricDay } from '@/types/dashboard'

const generateMockMetrics = (): MetricDay[] => {
    const today = new Date()
    return Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() - (29 - i))
        const revenue = 40 + Math.random() * 20
        const expenses = 10 + Math.random() * 5
        return {
            date: date.toISOString().split('T')[0],
            revenue,
            expenses,
            profit: revenue - expenses,
            transactions: Math.floor(Math.random() * 15) + 5
        }
    })
}

import { DateRange } from 'react-day-picker'
import { isWithinInterval, parseISO } from 'date-fns'

export const DashboardService = {
    async getDashboardData(dateRange?: DateRange): Promise<DashboardData> {
        return new Promise((resolve) => {
            const allMetrics = generateMockMetrics();
            let filteredMetrics = allMetrics;

            if (dateRange?.from) {
                const to = dateRange.to || dateRange.from;
                filteredMetrics = allMetrics.filter(m => {
                    const date = parseISO(m.date);
                    return isWithinInterval(date, { start: dateRange.from!, end: to });
                });
            }

            setTimeout(() => {
                resolve({
                    stats: {
                        totalRevenue: 1363.75,
                        totalExpenses: 290.75,
                        totalProfit: 1073.0,
                        profitMargin: 78.7,
                        totalCustomers: 5,
                        errorRate: 2.4,
                        onTimeDeliveryRate: 98.2
                    },
                    metrics: filteredMetrics,
                    trend: {
                        status: 'subiendo',
                        liquidityLevel: 'alta',
                        season: 'cosecha',
                        messageOfTheDay: 'Época de cosecha. Días de sol sobre campos fértiles. El balance es estable y el futuro es claro.'
                    },
                    recommendations: [
                        {
                            priority: 1,
                            title: "Delegación Definitiva",
                            timeline: "URGENT - Week 1",
                            description: "Delegate authority to Thanh (Production) and Hai (Quality) by March 13, 2026",
                            impact: "40% faster decisions, 30% higher morale",
                            ethicalAlignment: "Shared leadership, distributed accountability",
                            actions: ["Announce on March 13", "Define decision framework", "Weekly syncs"]
                        }
                    ],
                    alerts: [
                        {
                            severity: "CRITICAL",
                            category: "Revenue Risk",
                            message: "PRARA represents 82% of total revenue",
                            recommendation: "Diversify customer base to reduce to 50% within 18 months",
                            injusticeType: "Centralization Risk"
                        }
                    ],
                    team: [
                        { name: "Santi", role: "Director", salary: 20.0, tier: "Leadership", valueContribution: 100, equityScore: 98 }
                    ]
                })
            }, 150)
        });
    }
}
