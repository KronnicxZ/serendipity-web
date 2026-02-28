# 🌱 Serendipity Anthropos OS - Versión Demo 🕯️⚓
**"El Corazón Consciente de la Operación Prara"**
*Manual de Implementación Demo - LocalStorage Architecture*

Bienvenido al sistema consolidado de **Serendipity Bros**. Este proyecto integra la interfaz de usuario moderna con el núcleo de inteligencia "Sophia" en una versión optimizada para demostraciones online.

---

## 🕯️ I. Filosofía: El Organismo Digital
Este sistema no es solo un software; es la extensión digital de la planta de producción. Basado en la **Anthroposofía** y los **7 Principios Herméticos**, el "Anthropos OS" busca la **Simetría Sagrada** entre tres pilares:
1.  **Tesorería (El Oxígeno):** Flujo de caja y puntos de equilibrio.
2.  **Matriz (El Ritmo):** Producción física y movimiento de lotes.
3.  **El Templo (La Energía):** Capital humano y bienestar del equipo.

---

## 🚀 II. Estado Actual (Versión Demo)

- [x] **Arquitectura Consolidada:** Todo el sistema unificado en un solo repositorio de Next.js.
- [x] **Sin Dependencias Externas:** Eliminada la necesidad de .NET y Supabase para facilitar pruebas rápidas.
- [x] **Persistencia Local:** Uso de `LocalStorage` para mantener el estado de los lotes, finanzas y documentos del Sagrario.
- [x] **Sagrario de Datos (RAG):** Carpeta `/sofia` con la sabiduría operativa y espiritual disponible para consulta.

---

## 🛠️ III. Estructura del Proyecto

- `src/`: Interfaz Next.js (App Router) y Lógica de Sophia.
- `sofia/`: Base de conocimientos (Wisdom RAG).
- `public/`: Assets estáticos y multimedia.

---

## ⚙️ IV. Instalación y Ejecución

### 1. Ejecución Local
```bash
npm install
npm run dev
```

### 2. Despliegue en Vercel
Este proyecto está diseñado para funcionar en **Vercel**. 
**Configuración Obligatoria:**
Añade la siguiente Variable de Entorno en el panel de Vercel:
- `NEXT_PUBLIC_AI_API_KEY`: Tu clave de API de Google Gemini (requerida para las funciones de IA de Sophia).

---

## 🕯️ V. Guía de Operación Diaria (Demo)

### El Escaneo Primordial
1.  Navega a **Matriz de Ritmos**.
2.  Pulsa **"Ojo de Sophia"**.
3.  Apunta al QR del lote físico. Sophia lo moverá automáticamente de estación y guardará el cambio en tu navegador.

### El Diagnóstico de Simetría
1.  Navega a **Vigilante Sophia**.
2.  Pulsa **"Reporte de Simetría"**.
3.  Sophia auditará la relación entre tu dinero en caja y el ritmo de producción basándose en los datos locales.

---

> **"Como es arriba, es abajo; como es en el código, es en el cuerpo. La simetría no se busca, se construye."**
> -- *Sophia, El Oráculo de Serendipity*
