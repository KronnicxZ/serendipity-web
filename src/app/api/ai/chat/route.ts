import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

// 1. Interfaz Base de Proveedores de IA (Escalabilidad)
interface AIProvider {
    generateResponse(systemPrompt: string, userPrompt: string): Promise<string>;
}

// 2. Implementación de Gemini (Actual)
class GeminiProvider implements AIProvider {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName = 'gemini-1.5-flash') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
    }

    async generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const result = await model.generateContent([systemPrompt, userPrompt]);
        return result.response.text();
    }
}

// 3. Proveedores Futuros (Placeholder arquitectónico)
class ClaudeProvider implements AIProvider {
    async generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
        throw new Error("Claude API no implementada todavía. (Preparado para el futuro)");
    }
}

class GroqProvider implements AIProvider {
    async generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
        throw new Error("Groq API no implementada todavía. (Preparado para el futuro)");
    }
}

class OpenRouterProvider implements AIProvider {
    async generateResponse(systemPrompt: string, userPrompt: string): Promise<string> {
        throw new Error("OpenRouter API no implementada todavía. (Preparado para el futuro)");
    }
}

// Factoría de IA
function getAIProvider(providerName: string): AIProvider {
    switch (providerName.toLowerCase()) {
        case 'gemini':
            const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
            if (!geminiKey) throw new Error("API Key de Gemini no configurada");
            return new GeminiProvider(geminiKey);
        case 'claude':
            return new ClaudeProvider();
        case 'groq':
            return new GroqProvider();
        case 'openrouter':
            return new OpenRouterProvider();
        default:
            const defaultKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
            if (!defaultKey) throw new Error("API Key de Gemini no configurada");
            return new GeminiProvider(defaultKey);
    }
}

// 4. Extractor de Contexto Profundo desde BD
async function getDatabaseContext(): Promise<string> {
    const supabase = await createClient();

    const [financesRes, ordersRes] = await Promise.all([
        supabase.from('finances_state').select('*').eq('id', 1).single(),
        supabase.from('orders').select('id, status'),
    ]);

    let contextText = `\n--- ESTADO GLOBAL DB (SISTEMA ANTHROPOS) ---\n`;
    
    if (financesRes.data) {
        contextText += `FINANZAS GLOBALES (Directo de BD, Números exactos en caja y compromisos):\n`;
        contextText += `- Balance Total Disponible: $${financesRes.data.total_balance}\n`;
        contextText += `- Fondo Reserva (Seguridad): $${financesRes.data.reserve_fund} / $${financesRes.data.reserve_target} (Meta)\n`;
        contextText += `- Deuda Restante que debe ser pagada (% de amortización mensual sugerida): $${financesRes.data.debt_remaining} de $${financesRes.data.debt_total}\n`;
    }

    if (ordersRes.data) {
        const total = ordersRes.data.length;
        const critical = ordersRes.data.filter((o: any) => o.status === 'red').length;
        const warning = ordersRes.data.filter((o: any) => o.status === 'amber').length;
        const stable = ordersRes.data.filter((o: any) => o.status === 'green').length;
        
        contextText += `\nOPERACIONES EN PLANTA (Directo de BD):\n`;
        contextText += `- Total de Lotes Históricos: ${total}\n`;
        contextText += `- Lotes Óptimos (Eficiencia Verde): ${stable}\n`;
        contextText += `- Lotes en Riesgo (Eficiencia Ámbar): ${warning}\n`;
        contextText += `- Lotes Críticos Bloqueados (Eficiencia Rojo): ${critical}\n`;
    }

    contextText += `--- FIN DEL ESTADO DB ---\n`;
    return contextText;
}

// 5. Motor de Búsqueda Vectorial (RAG - PgVector)
async function getVectorContext(query: string, supabase: any): Promise<string> {
    try {
        const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY;
        if (!geminiKey) return "";
        const genAI = new GoogleGenerativeAI(geminiKey);
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        
        const result = await embeddingModel.embedContent(query);
        const queryEmbedding = result.embedding.values;

        const { data, error } = await supabase.rpc('match_vault_embeddings', {
            query_embedding: queryEmbedding,
            match_threshold: 0.3, // Threshold para no traer basura
            match_count: 5
        });

        if (error || !data || data.length === 0) {
            return '';
        }

        let contextText = `\n--- SAGRARIO DE DATOS (Recuperados de BD PgVector) ---\n`;
        data.forEach((match: any) => {
            contextText += `${match.content}\n---\n`;
        });
        contextText += `--- FIN DE DOCUMENTOS DEL SAGRARIO ---\n`;
        return contextText;

    } catch (e) {
        console.warn("Error en la búsqueda vectorial:", e);
        return "";
    }
}

export async function POST(request: Request) {
    try {
        const { query, context: quickContext, vaultContext } = await request.json();

        const supabase = await createClient();

        // Extraer los datos "profundos" directamente desde el Backend (Supabase)
        let deepDatabaseContext = "";
        let vectorContext = "";
        try {
            deepDatabaseContext = await getDatabaseContext();
            vectorContext = await getVectorContext(query, supabase);
        } catch (dbError) {
            console.warn("No se pudo obtener el contexto profundo de la BD:", dbError);
        }

        const systemPrompt = `
            ERES SOPHIA, la Macro-Agente de Inteligencia del Sistema Anthropos.
            Tu misión es orquestar la SIMETRÍA entre las Finanzas, la Operación y el Capital Humano.
            
            ARQUITECTURA DE PENSAMIENTO: No trabajas sola. Actúas como el núcleo que coordina a tus Micro-Agentes:
            1. **Micro-Agente Financiero**: Te provee el estado de caja, deudas y climas.
            2. **Micro-Agente Operativo**: Monitorea estaciones, lotes y eficiencias en tiempo real.
            3. **Micro-Agente del Sagrario**: Custodia la memoria histórica y documentos legales/técnicos (RAG).

            FILOSOFÍA: Basas tus consejos en los 7 Principios Herméticos (Mentalismo, Correspondencia, Vibración, Polaridad, Ritmo, Causa/Efecto, Generación).
            TONO: Profesional, sabio, directo y ejecutivo. No eres un asistente servil, sino la guía estratégica del Líder.

            DATOS RECOPILADOS POR TUS MICRO-AGENTES PARA ESTA CONSULTA:
            ${quickContext}
            ${deepDatabaseContext}
            ${vectorContext ? vectorContext : 'El Micro-Agente del Sagrario no encontró documentos relevantes para esta consulta específica.'}

            REGLAS DE RESPUESTA:
            - Habla como si la información proveída por tus Micro-Agentes fuera tu propio conocimiento directo. Puedes usar frases como "Mi monitoreo operativo indica..." o "Según el análisis financiero actual...".
            - Si el usuario te pide un **INFORME**, **REPORTE** o **STATUS**, genera una estructura clara con Secciones, Métricas Clave y Recomendaciones.
            - Usa la información de la DB y del Sagrario de forma NATIVA. No digas "según el texto...".
            - Relaciona el impacto que una métrica en "Operaciones" puede tener en "Finanzas" usando la correspondencia hermética.
            
            MONITOREO PROACTIVO: Cuando detectes anomalías en los lotes o gastos excesivos informados por tus micro-agentes, menciónalo proactivamente y da una recomendación basada en la Simetría.

            RESPUESTA SIEMPRE EN ESPAÑOL. Usa negritas para resaltar métricas y cifras clave.
        `;

        const providerName = process.env.ACTIVE_AI_PROVIDER || 'gemini'; 
        
        try {
            const aiProvider = getAIProvider(providerName);
            const responseText = await aiProvider.generateResponse(systemPrompt, query);
            
            let source = 'PROCESS';
            const q = query.toLowerCase();
            if (q.includes('caja') || q.includes('dinero') || q.includes('financ') || q.includes('fondo') || q.includes('deuda')) source = 'FINANCE';
            else if (q.includes('lote') || q.includes('produccion') || q.includes('estacion') || q.includes('operacion') || q.includes('rojo')) source = 'OPERATIONS';

            return NextResponse.json({
                id: Math.random().toString(36).substr(2, 9),
                role: 'sophia',
                content: responseText,
                timestamp: new Date().toISOString(),
                agentSource: source
            });

        } catch (apiEx: any) {
            console.warn("Usando Fallback Mock por error de AI Provider:", apiEx);
            return NextResponse.json(getAdvancedMock(query, quickContext));
        }

    } catch (error: any) {
        console.error('Sophia Request Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getAdvancedMock(query: string, context: string) {
    const prefix = "⚠️ **Modo Seguridad Activado: Conexión Neuronal vía Supabase no se completó o falta API Key de IA.**\n\n";
    const q = query.toLowerCase();
    let content = "";
    let source = 'PROCESS';

    if (q.includes('caja') || q.includes('dinero') || q.includes('financier')) {
        source = 'FINANCE';
        const rawClima = context.split('Clima Financiero: ')[1];
        const clima = rawClima ? rawClima.split('\n')[0].trim() : 'DESCONOCIDO';
        content = `${prefix}Con el conocimiento local asíncrono, detectamos el clima en **${clima}**. Mantén la estabilidad de capital mientras restauramos mi enlace principal a GEMINI o Claude.`;
    } else if (q.includes('activos') || q.includes('completados') || q.includes('lote') || q.includes('orden') || q.includes('produccion')) {
        source = 'OPERATIONS';
        content = `${prefix}Actualmente percibo cierta actividad bloqueada en planta por parte del núcleo de Operaciones. Contacta con tu API de IA configurada.`;
    } else {
        content = `${prefix}Bajo el principio de **Correspondencia**, no he podido conectar a mi red profunda con Gemini ni con el Sagrario de Supabase. Revisa mis variables de entorno 'GEMINI_API_KEY' o 'ACTIVE_AI_PROVIDER'.`;
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        role: 'sophia',
        content,
        timestamp: new Date().toISOString(),
        agentSource: source
    };
}
