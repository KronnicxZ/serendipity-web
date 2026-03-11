import { DashboardData, MetricDay, FinancialTrend } from '@/types/dashboard'
import { DateRange } from 'react-day-picker'
import { isWithinInterval, parseISO, subDays, startOfDay, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { FinanceService } from './finance.service'
import { OperationsService } from './operations.service'

export const DashboardService = {
    async getDashboardData(dateRange?: DateRange): Promise<DashboardData> {
        const supabase = createClient();
        if (!supabase) throw new Error('Supabase client not available');

        // Fetch basic summaries from connected services
        const [financeSummary, operationsSummary] = await Promise.all([
            FinanceService.getSummary(),
            OperationsService.getSummary()
        ]);

        // Get transactions for the past 30 days or the given range for metrics
        const endDate = dateRange?.to || new Date();
        const startDate = dateRange?.from || subDays(endDate, 30);
        
        const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startOfDay(startDate).toISOString())
            .lte('date', endDate.toISOString());

        // Group by day for the chart
        const metricsMap = new Map<string, MetricDay>();
        let current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = format(current, 'yyyy-MM-dd');
            metricsMap.set(dateStr, {
                date: dateStr,
                revenue: 0,
                expenses: 0,
                profit: 0,
                transactions: 0
            });
            current.setDate(current.getDate() + 1);
        }

        // Fill chart data with transactions
        (txs || []).forEach(tx => {
            const dateStr = Array.from(metricsMap.keys()).find(k => tx.date.startsWith(k)) || tx.date.split('T')[0];
            const amount = Number(tx.amount);
            if (metricsMap.has(dateStr)) {
                const day = metricsMap.get(dateStr)!;
                if (tx.type === 'INCOME') {
                    day.revenue += amount;
                } else if (tx.type === 'EXPENSE') {
                    day.expenses += amount;
                }
                day.profit = day.revenue - day.expenses;
                day.transactions += 1;
            }
        });

        const metricsArray = Array.from(metricsMap.values());

        // Determine trend from finance climate
        let season: FinancialTrend['season'] = 'cosecha';
        let liquidityLevel: FinancialTrend['liquidityLevel'] = 'alta';
        let status: FinancialTrend['status'] = 'estable';

        if (financeSummary.climate.season === 'TORMENTA') {
            season = 'tormenta';
            status = 'bajando';
            liquidityLevel = 'critica';
        } else if (financeSummary.climate.season === 'SIEMBRA') {
            season = 'siembra';
            liquidityLevel = 'media';
        }

        return {
            stats: {
                totalRevenue: financeSummary.monthlyRevenue,
                totalExpenses: financeSummary.monthlyExpenses,
                totalProfit: financeSummary.netProfit,
                profitMargin: financeSummary.profitMargin,
                totalCustomers: operationsSummary.activeOrders, // Usado como proxy operativo
                errorRate: 1.2, 
                onTimeDeliveryRate: 98.2 
            },
            metrics: metricsArray,
            trend: {
                status,
                liquidityLevel,
                season,
                messageOfTheDay: financeSummary.climate.message || 'Sistema operando en parámetros óptimos.'
            },
            recommendations: [
                {
                    priority: 1,
                    title: "Revisión de Flujo",
                    timeline: "URGENTE",
                    description: "Analizar el margen de beneficio respecto a los gastos operativos recientes.",
                    impact: "Optimización de costos en un 15%",
                    ethicalAlignment: "Responsabilidad financiera compartida",
                    actions: ["Analizar últimos gastos", "Definir presupuesto de área"]
                }
            ],
            alerts: financeSummary.totalBalance < 5000 ? [
                {
                    severity: "CRITICAL",
                    category: "Liquidez",
                    message: "El balance actual es inferior a los parámetros de seguridad.",
                    recommendation: "Revisar ingresos pendientes y pausar gastos no esenciales.",
                }
            ] : [],
            team: []
        };
    }
}
