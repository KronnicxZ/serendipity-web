# Arquitectura de Inteligencia Artificial: Alimentando a Sophia y sus Micro-Agentes

Para que Sophia pase de ser un "chatbot interactivo" a un **Sistema Nervioso Autónomo** (Anthropos Core) de tu planta, necesitamos estructurar cómo recibe, procesa y aprende de la información usando Supabase y modelos de lenguaje (RAG y Agentes Autónomos).

Aquí te detallo el flujo de alimentación inicial y continuo.

## 1. Alimentación Inicial: "El Sagrario" (Cimiento Estático)
Antes de que la planta opere, Sophia necesita saber *cómo* debe operar. Esta es la consciencia base.

*   **¿Qué subir?** Manuales de Procedimiento Operativo Estándar (SOPs), planes financieros del año, normativas de cultivo, regulaciones sanitarias, descripciones de roles, recetas o fórmulas de lotes ideales (tiempos, humedades, mermas esperadas).
*   **¿Cómo funciona?** A través de la pestaña **"El Sagrario"** en el frontend, tú subirás estos PDFs o documentos. El backend (Supabase + IA) tomará esos textos, los partirá en fragmentos y los convertirá en "Vectores" (vectores matemáticos) guardándolos en la base de datos de Supabase usando la extensión `pgvector`.
*   **Resultado:** Cuando haya una crisis, Sophia consultará automáticamente esos vectores para decirte: *"Según el manual de plagas (Sagrario, pág 14), debes aislar el lote inmediatamente"*.

## 2. Alimentación Continua: La Red de Micro-Agentes (Metabolismo de la Planta)
Sophia no debe depender de que tú le cuentes qué está pasando. Ella debe *escuchar* a la base de datos en tiempo real. Aquí entran los Micro-Agentes (pequeñas rutinas automatizadas en el backend de Supabase - *Edge Functions*).

Cada Micro-Agente es un "especialista" que vigila tablas específicas en Supabase:

*   **Agente de Operaciones (Ojo de Sophia):** Escucha la tabla `lotes`. Si ve que 3 lotes seguidos tienen una merma superior al 15% en el paso de secado, se lo reporta a Sophia.
*   **Agente Financiero (Rastreador de Rentabilidad):** Escucha la tabla `gastos` y la tabla `ventas`. Si un insumo se compró un 20% más caro que el mes pasado, envía una alerta.
*   **Agente de Calidad (Estatuto):** Mide los tiempos muertos entre estaciones.

**¿Cómo retroalimentan a Sophia?** En lugar de pasarle 10,000 registros de base de datos a la IA de golpe (lo cual es lento y caro), los Micro-Agentes hacen *resúmenes diarios*. Ej: Generan un reporte oculto a la medianoche diciendo: *"Hoy procesamos 450 lotes, eficiencia operativa del 94%. Gasto en energía alto."* Sophia lee ese resumen al despertar al día siguiente.

## 3. ¿Qué le tendrás que dar periódicamente? (Dirección Directiva)
Para que Sophia no solo sea descriptiva (decir lo que pasó) sino **prescriptiva** (decir qué hacer), debes darle contexto humano de alto nivel una vez a la semana o al mes a través del Chat de Diálogo:

*   **Nuevas Metas:** *"Sophia, este mes nuestra meta principal no es velocidad, es reducir el gasto de energía eléctrica en un 10% porque los costos subieron."* (Sophia ajustará sus alertas basándose en esa nueva prioridad).
*   **Feedback (Alineación):** Cuando Sophia proponga una solución (ej. *Despedir a un proveedor*), tú le puedes responder: *"No podemos hacer eso todavía por un contrato. Busca alternativas de renegociación"*. Sophia guardará esto en su memoria a largo plazo (Supabase) para no volver a sugerirlo hasta que el contrato acabe.
*   **Nuevos Estándares:** Si cambian las leyes de exportación o las normativas locales, se sube el nuevo documento al Sagrario para que sus micro-agentes actualicen sus métricas de validación.

## Resumen del Flujo Tecnológico en Supabase
1.  **Tablas Tradicionales:** Guardan lotes, pesos, dinero, fechas, usuarios (El día a día).
2.  **Supabase pgvector (Base de Vectores):** Guarda los documentos del Sagrario de manera semántica.
3.  **Supabase Edge Functions + Cron Jobs:** Micro-agentes que despiertan cada X horas, revisan las tablas tradicionales, buscan anomalías, formulan un resumen usando una IA económica (como Gemini Flash) y se lo entregan digerido a la mente principal de Sophia (Pro).
