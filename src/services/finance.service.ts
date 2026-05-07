import { FinanceSummary, FinancialClimate } from '@/types/finance';
import { createClient } from '@/lib/supabase/client';
import { localFetch } from '@/lib/local/client';

interface SofiaBackendDashboard {
    success: boolean;
    financial: {
        totalIncome: number;
        totalExpenses: number;
        cashFlow: number;
        margin: number;
        payroll: number;
        customerCount: number;
    };
    production: {
        pendingPayablesUsd: number;
    };
}

interface SofiaPraraBalance {
    remainingBalanceUSD: number;
    totalAdvanceUSD: number;
}

interface SofiaDaemonRevenue {
    success: boolean;
    period: string;
    totalVnd: number;
    totalUsd: number;
    praraUsd: number;
    praraPercent: string;
    pending: boolean;
}

export class FinanceService {
    static async getSummary(): Promise<FinanceSummary> {
        const supabase = createClient();

        // === MODO LOCAL: datos reales desde nuestro backend ===
        if (!supabase) {
            try {
                const [dash, prara, revenue] = await Promise.all([
                    localFetch<SofiaBackendDashboard>('/api/serendipity/dashboard'),
                    localFetch<SofiaPraraBalance>('/api/serendipity/prara-balance'),
                    fetch('/sofia-daemon/api/revenue').then(r => r.json()).catch(() => null) as Promise<SofiaDaemonRevenue | null>,
                ]);

                const f = dash.financial;
                // Use daemon revenue (March real) if available, else fallback to dashboard
                const monthlyRevenue = revenue?.success && revenue.totalUsd > 0
                    ? revenue.totalUsd
                    : f.totalIncome / 25000;
                const payrollUsd = f.payroll / 25000;
                const monthlyExpenses = payrollUsd + 30000000 / 25000; // payroll + overhead
                const netProfit = monthlyRevenue - monthlyExpenses;
                const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
                const totalBalance = netProfit;
                const debtRemaining = prara.remainingBalanceUSD;
                const debtTotal = prara.totalAdvanceUSD;

                const climate = FinanceService.calculateClimate(monthlyRevenue, monthlyExpenses, totalBalance);

                return {
                    totalBalance,
                    monthlyRevenue,
                    monthlyExpenses,
                    netProfit,
                    profitMargin,
                    reserveFund: totalBalance * 0.1,
                    reserveTarget: 10000,
                    debtRemaining,
                    debtTotal,
                    climate,
                    expensesByCategory: [
                        { category: 'Nómina', amount: payrollUsd, percentage: 60, color: 'bg-[var(--foreground)]' },
                        { category: 'Operativos', amount: monthlyExpenses - payrollUsd, percentage: 40, color: 'bg-blue-500' },
                    ],
                };
            } catch (err) {
                console.error('[LocalMode] Finance fetch failed:', err);
                return FinanceService.emptyState();
            }
        }

        // === MODO SUPABASE (producción) ===
        let stateData = null;
        try {
            const { data, error } = await supabase.from('finances_state').select('*').eq('id', 1).single();
            if (!error) stateData = data;
        } catch {}

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', firstDayOfMonth.toISOString());

        let monthlyRevenue = 0;
        let monthlyExpenses = 0;
        const expensesMap: Record<string, number> = {};

        (txs || []).forEach((tx: any) => {
            const amount = Number(tx.amount);
            if (tx.type === 'INCOME') monthlyRevenue += amount;
            else if (tx.type === 'EXPENSE') {
                monthlyExpenses += amount;
                const cat = tx.category || 'Otros';
                expensesMap[cat] = (expensesMap[cat] || 0) + amount;
            }
        });

        const netProfit = monthlyRevenue - monthlyExpenses;
        const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
        const totalBalance = Number(stateData?.total_balance || 0);
        const climate = FinanceService.calculateClimate(monthlyRevenue, monthlyExpenses, totalBalance);

        const colors = ['bg-[var(--foreground)]', 'bg-blue-500', 'bg-red-500', 'bg-[var(--secondary)]'];
        const expensesByCategory = Object.entries(expensesMap)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amt], i) => ({
                category: cat,
                amount: amt,
                percentage: monthlyExpenses > 0 ? (amt / monthlyExpenses) * 100 : 0,
                color: colors[i % colors.length]
            }));

        return {
            totalBalance,
            monthlyRevenue,
            monthlyExpenses,
            netProfit,
            profitMargin,
            reserveFund: totalBalance * 0.1,
            reserveTarget: 50000,
            debtRemaining: 0,
            debtTotal: 0,
            climate,
            expensesByCategory,
        };
    }

    static calculateClimate(revenue: number, expenses: number, balance: number): FinancialClimate {
        const margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

        if (balance < 2000 || margin < 0) {
            return { icon: 'zap', season: 'TORMENTA', message: 'Liquidez crítica. Acción inmediata requerida.', weatherClass: 'weather-storm', liquidityLevel: 'CRÍTICA', flowTrend: 'BAJANDO' };
        }
        if (margin < 20) {
            return { icon: 'cloud-rain', season: 'SEQUÍA', message: 'Margen ajustado. Controlar gastos.', weatherClass: 'weather-drought', liquidityLevel: 'BAJA', flowTrend: 'BAJANDO' };
        }
        if (margin < 40) {
            return { icon: 'cloud-sun', season: 'SIEMBRA', message: 'Crecimiento en curso. Sostener el ritmo.', weatherClass: 'weather-planting', liquidityLevel: 'MEDIA', flowTrend: 'ESTABLE' };
        }
        return { icon: 'sun', season: 'COSECHA', message: 'Flujo positivo. Momentun operativo activo.', weatherClass: 'weather-harvest', liquidityLevel: 'ALTA', flowTrend: 'SUBIENDO' };
    }

    private static emptyState(): FinanceSummary {
        return {
            totalBalance: 0, monthlyRevenue: 0, monthlyExpenses: 0,
            netProfit: 0, profitMargin: 0, reserveFund: 0, reserveTarget: 10000,
            debtRemaining: 0, debtTotal: 0,
            climate: { icon: 'cloud', season: 'SIEMBRA', message: 'Conectando con el sistema...', weatherClass: 'weather-planting', liquidityLevel: 'MEDIA', flowTrend: 'ESTABLE' },
            expensesByCategory: [],
        };
    }
}
