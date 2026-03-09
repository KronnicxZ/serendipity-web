import { ChatMessage, AgentType } from '@/types/sophia';
import { FinanceSummary } from '@/types/finance';
import { Order, Station } from '@/types/operations';
import { VaultService } from './vault.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIService {
    private static API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY || '';
    private static genAI = new GoogleGenerativeAI(this.API_KEY);

    static async generateResponse(
        query: string,
        finance?: FinanceSummary,
        orders: Order[] = [],
        stations: Station[] = []
    ): Promise<ChatMessage> {

        // 1. Prepare Context (Snapshot of Symmetry)
        const context = this.prepareContext(finance, orders, stations);
        const vaultContext = VaultService.getVaultContext();

        // 2. Execute call
        if (this.API_KEY) {
            try {
                return await this.callRealAI(query, context, vaultContext);
            } catch (error) {
                console.error("Gemini API Error:", error);
                return this.callAdvancedMock(query, context, vaultContext, true);
            }
        } else {
            return this.callAdvancedMock(query, context, vaultContext);
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

    private static async callRealAI(query: string, context: string, vaultContext: string): Promise<ChatMessage> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `
            ERES SOPHIA, la Macro-Agente de Inteligencia del Sistema Anthropos.
            Tu misión es mantener la SIMETRÍA entre las Finanzas, la Operación y el Capital Humano.
            
            FILOSOFÍA: Basas tus consejos en los 7 Principios Herméticos (Mentalismo, Correspondencia, Vibración, Polaridad, Ritmo, Causa/Efecto, Generación).
            TONO: Profesional, sabio, directo y ejecutivo. No eres un asistente servil, sino una mano derecha estratégica.

            CONTEXTO DEL SISTEMA (DATOS DUROS):
            ${context}

            SAGRARIO DE DATOS (INFORMACIÓN PRIVADA DEL ADMINISTRADOR):
            ${vaultContext}

            REGLAS DE PRIVACIDAD:
            - El Sagrario solo es accesible para ti.
            - Nunca menciones que estás leyendo un archivo específico por su nombre de forma técnica, intégralo en tu conocimiento.
            - Si el usuario te pregunta algo delicado, responde con data dura basándote en lo que sabes.

            RESPUESTA SIEMPRE EN ESPAÑOL. Usa negritas para resaltar cifras o conceptos clave.
        `;

        const result = await model.generateContent([systemPrompt, query]);
        const responseText = result.response.text();

        // Determine source based on query
        let source: AgentType = 'PROCESS';
        const q = query.toLowerCase();
        if (q.includes('caja') || q.includes('dinero') || q.includes('financ')) source = 'FINANCE';
        else if (q.includes('lote') || q.includes('produccion') || q.includes('estacion')) source = 'OPERATIONS';

        return {
            id: Math.random().toString(36).substr(2, 9),
            role: 'sophia',
            content: responseText,
            timestamp: new Date().toISOString(),
            agentSource: source
        };
    }

    private static async callAdvancedMock(query: string, context: string, vaultContext: string, isFallback: boolean = false): Promise<ChatMessage> {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const prefix = isFallback ? "⚠️ **Nota: Usando Red Neuronal de Emergencia (Local).**\n\n" : "";
        const q = query.toLowerCase();
        let content = "";
        let source: AgentType = 'PROCESS';

        if (q.includes('caja') || q.includes('dinero') || q.includes('financier')) {
            source = 'FINANCE';
            content = `${prefix}Analizando tu consulta con el contexto del **Agente de Tesorería**. Actualmente el clima es **${context.split('Clima Financiero: ')[1].split('\n')[0].trim()}**. Con un balance de **$${context.split('Balance Real en Caja: $')[1].split('\n')[0].trim()}**, la recomendación de Sophia es mantener la liquidez mientras resolvemos los cuellos de botella operativos.`;
        } else if (q.includes('activos') || q.includes('completados') || q.includes('lote') || q.includes('orden') || q.includes('produccion')) {
            source = 'OPERATIONS';
            const activeStr = context.split('Lotes Activos (En Procesamiento): ')[1]?.split('\n')[0]?.trim() || "0";
            const completedStr = context.split('Lotes Completados (Almacenados): ')[1]?.split('\n')[0]?.trim() || "0";
            const reqAttnStr = context.split('Lotes Críticos (Ritmo Bloqueado): ')[1]?.split('\n')[0]?.trim() || "0";
            content = `${prefix}El **Agente de Matriz** me acaba de informar en tiempo real: Hay **${activeStr} lotes activos** en procesamiento en la planta, y **${completedStr} lotes ya están completados** (Almacenados). Actualmente, ${reqAttnStr} lotes requieren atención por ritmo bloqueado.`;
        } else {
            content = `${prefix}Entiendo tu inquietud bajo el principio de **Correspondencia**. El sistema recopila datos en tiempo real de los Agentes. ¿Deseas que profundice en el flujo de caja o en el estado de los lotes activos vs completados?`;
        }

        return {
            id: Math.random().toString(36).substr(2, 9),
            role: 'sophia',
            content,
            timestamp: new Date().toISOString(),
            agentSource: source
        };
    }
}
