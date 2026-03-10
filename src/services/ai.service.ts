import { ChatMessage, AgentType } from '@/types/sophia';
import { FinanceSummary } from '@/types/finance';
import { Order, Station } from '@/types/operations';
import { VaultService } from './vault.service';

export class AIService {
    static async generateResponse(
        query: string,
        finance?: FinanceSummary,
        orders: Order[] = [],
        stations: Station[] = []
    ): Promise<ChatMessage> {

        // 1. Prepare Context (Snapshot of Symmetry)
        const context = this.prepareContext(finance, orders, stations);

        // 2. Fetch Vault Texts
        const vaultContext = await VaultService.getVaultContext();

        // 3. Execute call securely via backend API
        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, context, vaultContext })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reach Sophia core');
            }

            return await response.json();

        } catch (error) {
            console.error("Agent Request Error:", error);
            return {
                id: Math.random().toString(36).substr(2, 9),
                role: 'sophia',
                content: "⚠️ **Error de Conexión Neural**. No se pudo contactar al servidor central de la IA. Revisa tu conexión de red.",
                timestamp: new Date().toISOString(),
                agentSource: 'PROCESS'
            };
        }
    }

    private static prepareContext(finance?: FinanceSummary, orders: Order[] = [], stations: Station[] = []): string {
        const totalOrders = orders.length;
        const urgentOrders = orders.filter(o => o.status === 'red').length;

        let activeOrders = totalOrders;
        let completedOrders = 0;

        if (stations.length > 0) {
            const sortedStations = [...stations].sort((a, b) => (b.order_index || 0) - (a.order_index || 0));
            const lastStationId = sortedStations[0].id;
            completedOrders = orders.filter(o => o.currentStationId === lastStationId).length;
            activeOrders = totalOrders - completedOrders;
        }

        const balance = finance?.totalBalance || 0;
        const climate = finance?.climate?.season || 'SIEMBRA';
        const margin = finance?.profitMargin || 0;

        return `
            SNAPSHOT DEL SISTEMA ANTHROPOS:
            - Clima Financiero: ${climate}
            - Balance Real en Caja: $${balance.toLocaleString()}
            - Margen de Rentabilidad: ${margin}%
            - Lotes Totales Históricos: ${totalOrders}
            - Lotes Activos (En Procesamiento): ${activeOrders}
            - Lotes Completados (Almacenados): ${completedOrders}
            - Lotes Críticos (Ritmo Bloqueado): ${urgentOrders}
        `;
    }
}
