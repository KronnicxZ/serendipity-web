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

        // UNIFICACIÓN: Intentamos obtener la "Verdad Molecular" de Santiago primero
        let molecularData: any = null;
        try {
            const molRes = await fetch('/api/local/production');
            if (molRes.ok) {
                molecularData = await molRes.json();
            }
        } catch (err) {
            console.warn("No se pudo obtener data molecular para el Dashboard:", err);
        }

        // Fetch basic summaries from connected services (Fallback/Complemento)
        const [financeSummary, operationsSummary] = await Promise.all([
            FinanceService.getSummary(),
            OperationsService.getSummary()
        ]);

        const s = molecularData?.summary || {};

        // Get transactions for metrics (Chart)
        const endDate = dateRange?.to || new Date();
        const startDate = dateRange?.from || subDays(endDate, 30);
        
        const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startOfDay(startDate).toISOString())
            .lte('date', endDate.toISOString());

        const metricsMap = new Map<string, MetricDay>();
        let current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = format(current, 'yyyy-MM-dd');
            metricsMap.set(dateStr, {
                date: dateStr, revenue: 0, expenses: 0, profit: 0, transactions: 0
            });
            current.setDate(current.getDate() + 1);
        }

        (txs || []).forEach(tx => {
            const dateStr = Array.from(metricsMap.keys()).find(k => tx.date.startsWith(k)) || tx.date.split('T')[0];
            const amount = Number(tx.amount);
            if (metricsMap.has(dateStr)) {
                const day = metricsMap.get(dateStr)!;
                if (tx.type === 'INCOME') day.revenue += amount;
                else if (tx.type === 'EXPENSE') day.expenses += amount;
                day.profit = day.revenue - day.expenses;
                day.transactions += 1;
            }
        });

        const metricsArray = Array.from(metricsMap.values());

        // Mapeo selectivo de la arquitectura de Santiago al Dashboard
        return {
            stats: {
                totalRevenue: s.totalSf ? s.totalSf * 0.85 : financeSummary.monthlyRevenue, // Precio base SF aprox
                totalExpenses: s.pendingPayablesUsd || financeSummary.monthlyExpenses,
                totalProfit: financeSummary.netProfit,
                profitMargin: s.grossMarginPct || financeSummary.profitMargin,
                totalCustomers: Object.keys(s.byClient || {}).length || operationsSummary.activeOrders,
                errorRate: s.riskScore || 1.2,
                onTimeDeliveryRate: s.progressPct || 98.2 
            },
            metrics: metricsArray,
            trend: {
                status: s.riskLabel === 'low' ? 'estable' : 'bajando',
                liquidityLevel: s.healthLabel === 'excellent' ? 'alta' : 'media',
                season: (s.pulseLabel as any) || 'cosecha',
                messageOfTheDay: molecularData ? `Velocidad actual: ${s.dailyVelocity} SF/día. Proyectado mes: ${s.projectedMonth} SF.` : 'Sistema operando en parámetros de respaldo.'
            },
            recommendations: [
                {
                    priority: 1,
                    title: "Ajuste de Carga de Planta",
                    timeline: "PRÓXIMOS 3 DÍAS",
                    description: `Según el riesgo de ${s.riskLabel}, se recomienda optimizar la estación de QC.`,
                    impact: "Mejora de flujo en un 12%",
                    ethicalAlignment: "Eficiencia consciente",
                    actions: ["Revisar cuellos de botella", "Asignar soporte a QC"]
                }
            ],
            alerts: s.riskScore > 7 ? [
                {
                    severity: "CRITICAL",
                    category: "Operaciones",
                    message: "Riesgo operativo elevado detectado por Sofia.",
                    recommendation: "Revisar logs de estaciones inmediatamente.",
                }
            ] : [],
            team: []
        };
    }
}
