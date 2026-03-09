import { ReportData } from '@/types/reports';

const MOCK_REPORTS: ReportData = {
    historicalMetrics: Array.from({ length: 30 }, (_, i) => ({
        date: `2024-02-${String(i + 1).padStart(2, '0')}`,
        revenue: 1000 + Math.random() * 500,
        expenses: 600 + Math.random() * 300,
        profit: 400 + Math.random() * 200,
        efficiency: 85 + Math.random() * 10,
    })),
    insights: [
        {
            id: '1',
            title: 'Optimización de Consumo Eléctrico',
            description: 'El turno de noche está consumiendo un 15% más de lo proyectado per capita.',
            type: 'OPTIMIZATION',
            impact: 'MEDIUM',
        },
        {
            id: '2',
            title: 'Riesgo de Dependencia PRARA',
            description: 'Un solo cliente representa el 78% del flujo actual. Sophia recomienda diversificar.',
            type: 'RISK',
            impact: 'HIGH',
        }
    ],
    summary: {
        avgProfitMargin: 32.5,
        totalVolume: 145000,
        growthRate: 12.4,
    }
};

import { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO } from 'date-fns';

export class ReportsService {
    static async getReportData(dateRange?: DateRange): Promise<ReportData> {
        return new Promise((resolve) => {
            let data = { ...MOCK_REPORTS };

            if (dateRange?.from) {
                const to = dateRange.to || dateRange.from;
                data.historicalMetrics = MOCK_REPORTS.historicalMetrics.filter(m => {
                    const date = parseISO(m.date);
                    return isWithinInterval(date, { start: dateRange.from!, end: to });
                });
            }

            setTimeout(() => resolve(data), 150);
        });
    }
}
