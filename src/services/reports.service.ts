import { localFetch } from '@/lib/local/client';
import { ReportData, ReportInsight } from '@/types/reports';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO } from 'date-fns';

export class ReportsService {
    static async getReportData(dateRange?: DateRange): Promise<ReportData> {
        const supabase = createClient();

        // === LOCAL MODE ===
        if (!supabase) {
            try {
                const [dash, prod, prara] = await Promise.all([
                    localFetch<any>('/api/serendipity/dashboard'),
                    localFetch<any>('/api/production/records/summary'),
                    localFetch<any>('/api/serendipity/prara-balance'),
                ]);
                const f = dash.financial;
                const p = dash.production;
                const totalRevUsd = f.totalIncome / 25000;
                const totalExpUsd = f.totalExpenses / 25000;
                const netProfit = totalRevUsd - totalExpUsd;
                const margin = f.margin;
                const byClient: Record<string,number> = prod.data?.byClient || {};

                // Build historical metrics per client
                const historicalMetrics = [{
                    date: '2026-03',
                    revenue: totalRevUsd,
                    expenses: totalExpUsd,
                    profit: netProfit,
                    efficiency: Number(margin.toFixed(1)),
                }, {
                    date: '2026-02',
                    revenue: (p.sfFeb || 0) * 0.22,
                    expenses: (p.sfFeb || 0) * 0.09,
                    profit: (p.sfFeb || 0) * 0.13,
                    efficiency: 59.1,
                }];

                const insights: any[] = [];
                if (margin > 50) {
                    insights.push({ id: '1', title: 'Margen Excepcional', description: 'Margen operativo ' + margin.toFixed(1) + '% — muy por encima del objetivo del 35%.', type: 'OPTIMIZATION', impact: 'HIGH' });
                }
                if (p.sfMar > p.target) {
                    insights.push({ id: '2', title: 'Meta 150K Superada', description: p.sfMar.toLocaleString() + ' SF procesados (' + p.progressPct.toFixed(0) + '% de meta). Capacidad operativa demostrada.', type: 'OPTIMIZATION', impact: 'HIGH' });
                }
                insights.push({ id: '3', title: 'Amortizacion PRARA activa', description: 'USD 5,000/mes en descuento. Saldo restante: USD ' + prara.remainingBalanceUSD + '.', type: 'INFO', impact: 'MEDIUM' });

                const clientBreakdown = Object.entries(byClient).map(([name, sf]) => ({
                    client: name,
                    sf: sf,
                    revenue: (sf as number) * 0.22,
                    percentage: prod.data?.totalSqftMonth > 0 ? ((sf as number) / prod.data.totalSqftMonth * 100).toFixed(1) : '0',
                })).sort((a: any, b: any) => b.sf - a.sf);

                const totalVolume = prod.data?.totalSqftMonth || p.sfMar || 0;
                const sfFeb = p.sfFeb || 0;
                const growthRate = sfFeb > 0 ? Math.round(((totalVolume - sfFeb) / sfFeb) * 100) : 0;

                return {
                    historicalMetrics,
                    insights,
                    summary: {
                        totalRevenue: totalRevUsd,
                        totalExpenses: totalExpUsd,
                        avgProfitMargin: Number(margin.toFixed(1)),
                        totalVolume,
                        growthRate,
                        bestMonth: '2026-03',
                        worstMonth: '2026-02',
                    },
                    clientBreakdown,
                } as any;
            } catch (err) {
                console.error('[LocalMode] Reports fetch failed:', err);
            }
        }
        
        if (!supabase) return { historicalMetrics: [], insights: [], summary: { totalRevenue: 0, totalExpenses: 0, avgProfitMargin: 0, totalVolume: 0, growthRate: 0, bestMonth: '', worstMonth: '' }, clientBreakdown: [] } as any;
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

        // Calcular insights dinámicos
        const insights: ReportInsight[] = [];
        
        if (avgProfitMargin < 30) {
            insights.push({
                id: '1',
                title: 'Alerta de Margen',
                description: `El margen actual del ${avgProfitMargin.toFixed(1)}% está por debajo del objetivo óptimo del 35%.`,
                type: 'RISK',
                impact: 'HIGH',
            });
        } else {
            insights.push({
                id: '1',
                title: 'Eficiencia de Capital',
                description: 'El margen operativo muestra una salud robusta. Sophia detecta sincronía financiera.',
                type: 'OPTIMIZATION',
                impact: 'MEDIUM',
            });
        }

        if (totalRevenue > 10000) {
            insights.push({
                id: '2',
                title: 'Abundancia en el Jardín',
                description: 'El volumen de SF procesado ha superado el umbral de expansión. Momento de reinversión.',
                type: 'OPTIMIZATION',
                impact: 'LOW',
            });
        }

        return {
            historicalMetrics: historicalMetrics.length > 0 ? historicalMetrics : [
                { date: new Date().toISOString().slice(0, 7), revenue: 0, expenses: 0, profit: 0, efficiency: 0 }
            ],
            insights: insights.length > 0 ? insights : [
                {
                    id: '1',
                    title: 'Sincronización Inicial',
                    description: 'Esperando más ciclos de datos para generar un análisis profundo de Sophia.',
                    type: 'OPTIMIZATION' as const,
                    impact: 'LOW' as const,
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
