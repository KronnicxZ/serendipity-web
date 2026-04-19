# Serendipity Anthropos OS — Estado del Proyecto

**Para:** Jose (Integración Sofia)
**Fecha:** 19 de Abril, 2026
**Branch activo:** `main`
**Deploy:** Vercel + VPS Binh Duong (`dashboard.serendipity.vn`)

---

## Resumen Ejecutivo

El sistema está dividido en tres capas:

| Capa | Tecnología | Ubicación | Estado |
|------|-----------|-----------|--------|
| **Frontend** | Next.js 14 (App Router) | Vercel / `/opt/serendipity-web` | Desplegado |
| **Sofia Backend** | Node.js (sofia-inbox, sofia-reporter, sofia-daemon) | VPS `/opt/sofia/` | Corriendo |
| **API Core** | .NET 8 — ElMediadorDeSofia | VPS `/opt/sofia-build/` | Corriendo |

---

## Cambios de las últimas 2 semanas (5 – 19 Abril 2026)

### Frontend — serendipity-web

#### Nuevas rutas API moleculares
- **`/api/local/production`** — Nueva ruta que consume `/api/molecules/all` del backend C# y devuelve órdenes y summary para el dashboard de producción. Reemplaza las llamadas dispersas anteriores por un endpoint molecular unificado.
- **`/api/local/batches`** — Proxy dinámico al backend para registros de producción por mes. Usa mes actual automáticamente (`new Date().toISOString().slice(0,7)`), eliminando el hardcoded `2026-03`.

#### Motor de IA Sophia (ai/chat/route.ts — ya estaba)
- **SofiaProxyProvider** como primario (llama a `dashboard.serendipity.vn/api/ai/proxy` — Claude en servidor)
- Fallback en cascada: `sofia` → `claude` → `groq` → `openrouter` → `gemini`
- Contexto en tiempo real: `getSofiaLiveContext()` trae producción + payables del VPS en cada consulta

---

### Backend Sofia — Node.js (`/opt/sofia/`)

#### Synapse Footer + Node Identity (7 Abril)
- **`sofia-inbox.js`** actualizado: cada email de auto-respuesta ahora incluye un *Synapse Footer* dinámico con `nodeId`, `countryCode`, `synapseCount` y `trustScore`.
- **`synapse_footer.js`** (nuevo archivo en server): genera el bloque HTML del footer a partir de la tabla `node_identity` en PostgreSQL.
- **`node_identity`**: al enviar una respuesta, se incrementa `synapse_count` y se actualiza `last_synapse` para ese contacto.

#### CortexEvent Bus (11 Abril)
- **`sofia-daemon.js`** actualizado: emite eventos al bus interno (`/api/sofia/events/ingest` en el .NET API) para cada acción operativa relevante.
- **`sofia-reporter.js`** actualizado: emite `DailyReportGenerated` y `WeeklyReportGenerated` al completar cada cron job.
- Esto permite que los eventos del sistema queden registrados y disponibles para consulta desde Sophia.

#### Email SF Loader v4 (9 Abril)
- **`sofia_email_sf_loader_v4.js`**: carga datos de SF desde emails (adjuntos) y los inserta en la BD de producción. Versión corregida con mejor manejo de IMAP y parsing de XLS.

---

### API Core — .NET ElMediadorDeSofia (`/opt/sofia-build/`)

#### MoleculesController.cs (14 Abril)
Correcciones críticas a los átomos moleculares:
- **`client_rates`**: columna corregida de `rate_usd` → `rate_per_sqft`
- **`employees`**: columnas corregidas (`full_name`, `position`, `base_salary` en lugar de `name`, `role`, `monthly_salary`)
- **`payables`**: columna `category` → `concept`; eliminado `is_urgent` (no existe en schema); ordenado por `amount_usd DESC`
- **PRARA Bond (M5)**: conectado a `postgres` DB (tabla `PraraAmortization`) en lugar de `sofia` DB para obtener `TotalAdvance`, `CurrentBalance`, `MonthlyQuota`
- **Financial Health (M4)**: amortización mensual PRARA ahora viene de `PraraAmortization.MonthlyQuota`

---

### Base de Datos

#### kingdom_migration_v2.sql (13 Abril)
Nueva migración en `postgres` DB con el schema actualizado para PRARA y módulos de Kingdom.

#### migrate_client_rates.sql (15 Abril)
Crea/actualiza la tabla `client_rates` con columna `rate_per_sqft` para cálculo correcto de margen bruto en moléculas.

---

## Lo que queda pendiente — Tarea de Jose

### 1. DNS en Cloudflare (BLOQUEANTE para dominio público)
Entrar a Cloudflare con la cuenta de `serendipity.vn` y agregar:

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| A | `@` | `76.76.21.21` | DNS Only (gris) |
| CNAME | `www` | `cname.vercel-dns.com` | DNS Only (gris) |
| CNAME | `app` | `cname.vercel-dns.com` | DNS Only (gris) |

Después esperar ~10 min a que Vercel genere los certificados SSL.

### 2. Variables de Entorno en Vercel
Verificar que estén configuradas:

```
NEXT_PUBLIC_LANDING_URL=https://serendipity.vn
NEXT_PUBLIC_APP_URL=https://app.serendipity.vn
SOFIA_API_URL=https://dashboard.serendipity.vn
SOFIA_BACKEND_URL=http://localhost:5001          # solo en VPS, no en Vercel
ANTHROPIC_API_KEY=sk-ant-...                     # para ClaudeProvider fallback
GROQ_API_KEY=gsk_...                             # para GroqProvider fallback
OPEN_ROUTER_API_KEY=sk-or-...                    # para OpenRouterProvider fallback
GEMINI_API_KEY=AIza...                           # para GeminiProvider fallback
```

> **Nota:** `SOFIA_BACKEND_URL` solo funciona cuando Next.js corre en el mismo VPS que el .NET API. Las rutas `/api/local/*` son para el deploy en VPS, no para Vercel.

### 3. Aplicar Migraciones de BD
En el VPS, ejecutar en orden:

```bash
psql -U postgres -d postgres -f /path/to/kingdom_migration_v2.sql
psql -U postgres -d sofia -f /path/to/migrate_client_rates.sql
```

Verificar que `client_rates` tenga la columna `rate_per_sqft` poblada con valores correctos.

### 4. Tabla `node_identity` para Synapse Footer
La tabla necesita estar creada en `postgres` para que el footer de emails funcione:

```sql
CREATE TABLE IF NOT EXISTS node_identity (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    db_code     TEXT,
    node_id     TEXT NOT NULL,
    country_code TEXT DEFAULT 'VN',
    country_flag TEXT DEFAULT '🇻🇳',
    synapse_count INT DEFAULT 0,
    trust_score  INT DEFAULT 1,
    last_synapse TIMESTAMP
);
```

### 5. Verificar Sofia Backend en VPS

```bash
# Estado de los procesos Node.js
pm2 status

# Revisar logs
pm2 logs sofia-inbox --lines 50
pm2 logs sofia-reporter --lines 20
pm2 logs sofia-daemon --lines 20
```

Asegurarse de que los tres servicios estén `online`. Si hay errores en `sofia-inbox.js` relacionados con `synapse_footer`, confirmar que `/opt/sofia/synapse_footer.js` existe.

### 6. Endpoint Proxy de Sofia para Sophia AI
El endpoint `GET/POST /api/ai/proxy` en el .NET API debe estar respondiendo. Este es el que usa `SofiaProxyProvider` en el frontend. Verificar:

```bash
curl https://dashboard.serendipity.vn/api/ai/proxy -X POST \
  -H "Content-Type: application/json" \
  -d '{"systemPrompt":"Eres Sophia","userMessage":"hola"}'
```

Si responde 200 con `{"text":"..."}`, el frontend puede usar Claude via servidor sin exponer la API key.

### 7. Conectar Frontend con Datos Moleculares
Las rutas `/api/local/production` y `/api/local/batches` son proxies al backend .NET. Para el dashboard de operaciones (`/dashboard/operaciones`), los componentes deben ser actualizados para llamar a `/api/local/production` en lugar del endpoint hardcodeado anterior.

Revisar `src/app/dashboard/operaciones/page.tsx` y conectar el fetch a `/api/local/production`.

### 8. Test End-to-End de Sophia con Datos Reales

1. Ir a `app.serendipity.vn/dashboard/sophia`
2. Preguntar: *"¿Cuál es el estado de producción este mes?"*
3. Sophia debe responder con datos reales (SF procesados, clientes, margen) — no datos de mock
4. Si responde con el mensaje de "Modo Seguridad", revisar que `SOFIA_API_URL` esté configurado en Vercel y que el proxy responda

---

## Arquitectura Sofia — Flujo Completo

```
Usuario (Browser)
    │
    ▼
Next.js Frontend (Vercel)
    │
    ├── /api/ai/chat ──────────────────────────► SofiaProxyProvider
    │                                                    │
    │                                                    ▼
    │                                         dashboard.serendipity.vn
    │                                         /api/ai/proxy (Claude server-side)
    │
    ├── /api/local/production ─────────────────► localhost:5001
    │                                            /api/molecules/all
    │                                            (ElMediadorDeSofia .NET)
    │
    └── /api/local/batches ───────────────────► localhost:5001
                                                 /api/serendipity/production-records

VPS Binh Duong (dashboard.serendipity.vn)
    ├── ElMediadorDeSofia (.NET 8) — :5001
    │     └── MoleculesController (5 moléculas)
    │           ├── M1: ProductionPulse
    │           ├── M2: FinancialHealth
    │           ├── M3: TeamPerformance
    │           ├── M4: OperationalRisk
    │           └── M5: PraraBond
    │
    ├── sofia-inbox.js (Node.js / PM2)
    │     ├── Auto-responde emails entrantes con Sophia
    │     └── Synapse Footer con node_identity
    │
    ├── sofia-reporter.js (Node.js / PM2)
    │     ├── Cron diario: DailyReport → CortexEvent
    │     └── Cron semanal: WeeklyReport → CortexEvent
    │
    └── sofia-daemon.js (Node.js / PM2)
          └── Emite CortexEvents al bus de eventos
```

---

## Instalación Local (desarrollo)

```bash
npm install
npm run dev
```

Variables mínimas en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...     # fallback si Sofia proxy no responde
```

---

## Deploy en VPS (producción)

```bash
cd /opt/serendipity-web
git pull origin main
npm install
npm run build
pm2 restart serendipity-web
```

---

*Última actualización: 19 Abril 2026 — Commit: molecular API routes + Jose handoff docs*
