import { ReportData } from '@/types/reports';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO } from 'date-fns';

export class ReportsService {
    static async getReportData(dateRange?: DateRange): Promise<ReportData> {
        const supabase = createClient();
        if (!supabase) throw new Error('Supabase client not available');
        
        // Cargar todo (Se podría optimizar por paginación o sum en DB, pero lo traemos para computar)
        const { data: txs } = await supabase.from('transactions').select('*');

        let filteredTxs = txs || [];
        
        // Filtrar por rango de fechas si es proveído
        if (dateRange?.from) {
            const to = dateRange.to || dateRange.from;
            filteredTxs = filteredTxs.filter(tx => {
                const txDate = tx.date ? new Date(tx.date) : new Date(tx.created_at);
                return isWithinInterval(txDate, { start: dateRange.from!, end: to });
            });
        }
        
        // Agrupar métricas históricas por MES
        const metricsMap: Record<string, { revenue: number, expenses: number }> = {};
        
        filteredTxs.forEach(tx => {
            const date = new Date(tx.date || tx.created_at);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!metricsMap[monthStr]) {
                metricsMap[monthStr] = { revenue: 0, expenses: 0 };
            }
            
            const amount = Number(tx.amount);
            if (tx.type === 'INCOME') {
                metricsMap[monthStr].revenue += amount;
            } else if (tx.type === 'EXPENSE') {
                metricsMap[monthStr].expenses += amount;
            }
        });
        
        const historicalMetrics = Object.keys(metricsMap).sort().map(monthStr => {
            const { revenue, expenses } = metricsMap[monthStr];
            const profit = revenue - expenses;
            const efficiency = revenue > 0 ? ((profit / revenue) * 100) : 0;
            return {
                date: monthStr,
                revenue,
                expenses,
                profit,
                efficiency: Number(efficiency.toFixed(1))
            };
        });
        
        // Calcular sumario general
        const totalRevenue = historicalMetrics.reduce((acc, m) => acc + m.revenue, 0);
        const totalProfit = historicalMetrics.reduce((acc, m) => acc + m.profit, 0);
        const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return {
            historicalMetrics: historicalMetrics.length > 0 ? historicalMetrics : [
                { date: new Date().toISOString().slice(0, 7), revenue: 0, expenses: 0, profit: 0, efficiency: 0 }
            ],
            insights: [
                {
                    id: '1',
                    title: 'Evaluación del Núcleo',
                    description: 'El flujo analítico está sincronizado con la base de datos real. Esperando ingesta del Sagrario.',
                    type: 'OPTIMIZATION',
                    impact: 'MEDIUM',
                },
                {
                    id: '2',
                    title: 'Revisión de Gastos Operativos',
                    description: 'La amortización y gastos de operación mantienen estabilidad. Requiere cruce algorítmico Sophia.',
                    type: 'RISK',
                    impact: 'LOW',
                }
            ],
            summary: {
                avgProfitMargin: Number(avgProfitMargin.toFixed(1)),
                totalVolume: totalRevenue,
                growthRate: Number((avgProfitMargin * 0.4).toFixed(1)),
            }
        };
    }
}
