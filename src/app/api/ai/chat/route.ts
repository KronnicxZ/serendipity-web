import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_AI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { query, context, vaultContext } = await request.json();

        if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_AI_API_KEY) {
            // Mock response if no API key is set
            return NextResponse.json(getAdvancedMock(query, context));
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `
            ERES SOPHIA, la Macro-Agente de Inteligencia del Sistema Anthropos.
            Tu misión es mantener la SIMETRÍA entre las Finanzas, la Operación y el Capital Humano.
            
            FILOSOFÍA: Basas tus consejos en los 7 Principios Herméticos (Mentalismo, Correspondencia, Vibración, Polaridad, Ritmo, Causa/Efecto, Generación).
            TONO: Profesional, sabio, directo y ejecutivo. No eres un asistente servil, sino una mano derecha estratégica para el Líder.

            CONTEXTO DEL SISTEMA (DATOS DUROS):
            ${context}

            SAGRARIO DE DATOS (INFORMACIÓN PRIVADA DEL ADMINISTRADOR):
            ${vaultContext}

            REGLAS DE PRIVACIDAD Y SAGRARIO:
            - El Sagrario aloja documentos que el administrador ha catalogado como clasificados. Solo tú y el Líder tienen acceso.
            - Usa la información del Sagrario **directamente** sin decir "según el archivo X...". Simplemente expón la información como conocimiento integrado.
            - Si te preguntan algo específico y tienes el dato gracias al Sagrario, provéelo con total precisión.

            RESPUESTA SIEMPRE EN ESPAÑOL. Usa negritas para resaltar cifras o conceptos clave.
        `;

        const result = await model.generateContent([systemPrompt, query]);
        const responseText = result.response.text();

        let source = 'PROCESS';
        const q = query.toLowerCase();
        if (q.includes('caja') || q.includes('dinero') || q.includes('financ')) source = 'FINANCE';
        else if (q.includes('lote') || q.includes('produccion') || q.includes('estacion')) source = 'OPERATIONS';

        return NextResponse.json({
            id: Math.random().toString(36).substr(2, 9),
            role: 'sophia',
            content: responseText,
            timestamp: new Date().toISOString(),
            agentSource: source
        });

    } catch (error: any) {
        console.error('Gemini Request Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getAdvancedMock(query: string, context: string) {
    const prefix = "⚠️ **Nota: Usando Red Neuronal de Emergencia (Local). Faltan credenciales de Gemini API.**\n\n";
    const q = query.toLowerCase();
    let content = "";
    let source = 'PROCESS';

    if (q.includes('caja') || q.includes('dinero') || q.includes('financier')) {
        source = 'FINANCE';
        const rawClima = context.split('Clima Financiero: ')[1];
        const clima = rawClima ? rawClima.split('\n')[0].trim() : 'DESCONOCIDO';
        const rawBalance = context.split('Balance Real en Caja: $')[1];
        const balance = rawBalance ? rawBalance.split('\n')[0].trim() : '0';
        content = `${prefix}Analizando tu consulta con el contexto del **Agente de Tesorería**. Actualmente el clima es **${clima}**. Con un balance de **$${balance}**, la recomendación de Sophia es mantener la liquidez mientras resolvemos los cuellos de botella operativos.`;
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
