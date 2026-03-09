import { FinanceSummary } from '@/types/finance';
import { Order, Station } from '@/types/operations';
import { SystemSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { SophiaAlert, MicroAgent, ChatMessage, AgentType } from '@/types/sophia';

export const PRACTICAL_AGENTS: MicroAgent[] = [
    { id: 'ag-fin', name: 'Agente 01: Tesorería', type: 'FINANCE', status: 'ACTIVE', lastReport: new Date().toISOString(), description: 'Vigila el Punto Cero y el flujo de caja.' },
    { id: 'ag-ops', name: 'Agente 02: Matriz', type: 'OPERATIONS', status: 'ACTIVE', lastReport: new Date().toISOString(), description: 'Monitorea los ritmos de producción y lotes.' },
    { id: 'ag-hum', name: 'Agente 03: El Templo', type: 'HUMAN_CAPITAL', status: 'IDLE', lastReport: new Date().toISOString(), description: 'Gestiona la energía y el valor de los colaboradores.' },
    { id: 'ag-pro', name: 'Agente 04: Procesos', type: 'PROCESS', status: 'ACTIVE', lastReport: new Date().toISOString(), description: 'Optimiza la eficiencia técnica y márgenes.' }
];

export function getPracticalAgentsStatus(finance?: FinanceSummary, orders: Order[] = [], stations: Station[] = []): MicroAgent[] {
    const activeOrders = orders.filter(o => {
        if (!stations.length) return true;
        const sorted = [...stations].sort((a, b) => (b.order_index || 0) - (a.order_index || 0));
        return o.currentStationId !== sorted[0].id;
    }).length;

    return [
        {
            id: 'ag-fin', name: 'Agente 01: Tesorería', type: 'FINANCE',
            status: finance ? 'ACTIVE' : 'IDLE',
            lastReport: new Date().toISOString(),
            description: finance ? `Monitoreando flujo: $${finance.totalBalance.toLocaleString()} en caja.` : 'Esperando conexión con el sistema financiero.'
        },
        {
            id: 'ag-ops', name: 'Agente 02: Matriz', type: 'OPERATIONS',
            status: orders.length > 0 ? 'ACTIVE' : 'IDLE',
            lastReport: new Date().toISOString(),
            description: `Supervisando ${activeOrders} lotes activos y el ritmo general.`
        },
        {
            id: 'ag-hum', name: 'Agente 03: El Templo', type: 'HUMAN_CAPITAL',
            status: 'IDLE', // TODO: connect with users/employees table when available
            lastReport: new Date().toISOString(),
            description: 'En reposo. Esperando datos de colaboradores.'
        },
        {
            id: 'ag-pro', name: 'Agente 04: Procesos', type: 'PROCESS',
            status: stations.length > 0 ? 'ACTIVE' : 'IDLE',
            lastReport: new Date().toISOString(),
            description: `Optimizando ${stations.length} estaciones de producción.`
        }
    ];
}

export const HERMETIC_PRINCIPLES = [
    { id: 'her-men', name: 'Mentalismo', frequency: 963, chakra: 'Corona', health: 70, description: 'La consciencia de Sophia y sus 10 pilares' },
    { id: 'her-cor', name: 'Correspondencia', frequency: 852, chakra: 'Tercer Ojo', health: 95, description: 'Sincronía entre el Código y la Operación' },
    { id: 'her-vib', name: 'Vibración', frequency: 741, chakra: 'Garganta', health: 60, description: 'Resonancia de servicios y disonancias' },
    { id: 'her-pol', name: 'Polaridad', frequency: 639, chakra: 'Corazón', health: 85, description: 'Equilibrio entre Acción y Reflexión' },
    { id: 'her-rit', name: 'Ritmo', frequency: 528, chakra: 'Plexo', health: 75, description: 'Heartbeat del sistema y ciclos operativos' },
    { id: 'her-cau', name: 'Causalidad', frequency: 417, chakra: 'Sacro', health: 80, description: 'Trazabilidad de acciones y consecuencias' },
    { id: 'her-gen', name: 'Generación', frequency: 396, chakra: 'Raíz', health: 50, description: 'Creación de valor y aprendizaje diario' }
];

export const MICRO_AGENTS = PRACTICAL_AGENTS; // Keep backward compatibility

export class SophiaService {
    static getGlobalAlerts(finance?: FinanceSummary, orders: Order[] = [], stations: Station[] = [], settings: SystemSettings = DEFAULT_SETTINGS): SophiaAlert[] {
        const alerts: SophiaAlert[] = [];

        // Cash threshold analysis
        if (finance && finance.totalBalance < settings.criticalCashThreshold) {
            alerts.push({
                id: 'fin-01',
                agentId: 'ag-fin',
                type: 'CRITICAL',
                message: `Oxígeno Crítico: El balance ($${finance.totalBalance.toLocaleString()}) ha caído por debajo del umbral de seguridad de $${settings.criticalCashThreshold.toLocaleString()}.`,
                category: 'FINANCE',
                timestamp: new Date().toISOString()
            });
        }

        const urgentOrders = orders.filter(o => o.status === 'red');
        if (urgentOrders.length > 0) {
            alerts.push({
                id: 'ops-01',
                agentId: 'ag-ops',
                type: 'CRITICAL',
                message: `Desequilibrio de Ritmo: Hay ${urgentOrders.length} lote(s) con retrasos críticos que requieren tu atención.`,
                category: 'OPERATIONS',
                timestamp: new Date().toISOString()
            });
        } else if (orders.filter(o => o.status === 'amber').length > 0) {
            alerts.push({
                id: 'ops-02',
                agentId: 'ag-ops',
                type: 'WARNING',
                message: `Atención Visual: Hay lotes en estado preventivo (Ámbar). Observa su flujo.`,
                category: 'OPERATIONS',
                timestamp: new Date().toISOString()
            });
        }

        // Bottleneck detection
        stations.forEach(station => {
            const count = orders.filter(o => o.currentStationId === station.id).length;
            if (count >= 3) {
                alerts.push({
                    id: `bot-${station.id}`,
                    agentId: 'ag-ops',
                    type: 'WARNING',
                    message: `Cuello de Botella: La estación ${station.name} supera su capacidad óptima con ${count} lotes en cola.`,
                    category: 'PROCESS',
                    timestamp: new Date().toISOString()
                });
            }
        });

        return alerts;
    }

    static generateProactiveAnalysis(finance?: FinanceSummary, orders: Order[] = [], stations: Station[] = [], settings: SystemSettings = DEFAULT_SETTINGS): string {
        const urgentCount = orders.filter(o => o.status === 'red').length;

        let completedCount = 0;
        let activeCount = orders.length;
        if (stations.length > 0) {
            const sortedStations = [...stations].sort((a, b) => (b.order_index || 0) - (a.order_index || 0));
            const lastStationId = sortedStations[0].id;
            completedCount = orders.filter(o => o.currentStationId === lastStationId).length;
            activeCount = orders.length - completedCount;
        }

        const balance = finance?.totalBalance || 0;
        const margin = finance?.profitMargin || 0;

        let message = `**Reporte de Simetría Sistémica** 🕯️\n\n`;

        message += `📊 **Panorama Operativo:** De los ${orders.length} lotes históricos, tenemos **${activeCount} activos** procesándose y **${completedCount} ya completados**.\n\n`;

        if (urgentCount > 0) {
            message += `🚨 **Interrupción de Ritmo:** He detectado **${urgentCount} lote(s) en estado crítico**. La energía de la planta está bloqueada en la Matriz operativa.\n\n`;
        } else if (activeCount > 0) {
            message += `✨ **Fluidez Operativa:** Los ritmos de producción están en sincronía. Los ${activeCount} lotes activos avanzan sin bloqueos significativos.\n\n`;
        }

        if (balance > settings.criticalCashThreshold * 5) {
            message += `💰 **Abundancia:** El Agente de Tesorería reporta una salud financiera robusta con un balance de **$${balance.toLocaleString()}**. Es un momento propicio para la expansión operativa.\n\n`;
        } else if (balance > settings.criticalCashThreshold) {
            message += `⚖️ **Sustento:** La caja mantiene un balance de **$${balance.toLocaleString()}**. Sugiero vigilar los ciclos de facturación.\n\n`;
        } else {
            message += `⚠️ **Oxígeno Limitado:** La presión financiera es alta. El balance está por debajo del umbral de **$${settings.criticalCashThreshold.toLocaleString()}**.\n\n`;
        }

        if (settings.productionGoal > 0) {
            const progress = (completedCount / settings.productionGoal) * 100;
            message += `🎯 **Meta de Producción:** Llevas un **${progress.toFixed(1)}%** de avance hacia la meta de **${settings.productionGoal.toLocaleString()}** unidades.\n\n`;
        }

        message += `🎯 **Acción Inspirada:** Asegúrate de revisar visualmente la correspondencia entre los lotes terminados y tu inventario final físico.`;

        return message;
    }

    static async processQuery(query: string, finance?: FinanceSummary, orders: Order[] = []): Promise<ChatMessage> {
        const q = query.toLowerCase();
        let content = '';
        let source: AgentType | undefined;

        if (q.includes('caja') || q.includes('dinero') || q.includes('financier')) {
            source = 'FINANCE';
            content = finance
                ? `El Agente de Tesorería reporta un saldo de $${finance.totalBalance.toLocaleString()}. El clima es de ${finance.climate.season} y el margen se mantiene en ${finance.profitMargin}%.`
                : 'No tengo acceso a los datos financieros en este momento.';
        } else if (q.includes('lote') || q.includes('orden') || q.includes('produccion')) {
            source = 'OPERATIONS';
            const total = orders.length;
            const red = orders.filter(o => o.status === 'red').length;
            content = `El Agente de Matriz reporta ${total} lotes activos. ${red} requieren atención inmediata por retrasos en el ritmo.`;
        } else if (q.includes('simetria') || q.includes('hermet') || q.includes('equilibrio')) {
            source = 'PROCESS';
            const lowHealth = HERMETIC_PRINCIPLES.filter(p => p.health < 65);
            if (lowHealth.length > 0) {
                content = `La simetría sistémica está comprometida. Los principios de ${lowHealth.map(p => p.name).join(' y ')} muestran una frecuencia de salud baja (${lowHealth.map(p => p.health).join('%')}). Se recomienda un ritual de activación.`;
            } else {
                content = 'La simetría sagrada del sistema está en balance óptimo. Todos los principios herméticos vibran en su frecuencia correcta.';
            }
        } else if (q.includes('hola') || q.includes('quien eres')) {
            content = 'Soy Sophia, la Macro-Agente del Sistema Anthropos. Opero bajo los 7 Principios Herméticos para mantener la simetría entre tus finanzas, operaciones y capital humano.';
        } else {
            content = 'He consultado a mis agentes prácticos y mis bases herméticas. No encuentro datos específicos sobre esa consulta. ¿Deseas que analicemos la simetría del sistema o el balance de caja?';
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
