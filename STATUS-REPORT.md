# 🚀 Serendipity Anthropos OS — Status Report

**Última actualización**: 2026-05-04
**Estado global**: ✅ OPERATIVO — Listo para prueba de validación con el equipo
**Branch**: `main` — último commit `fcbbcb3`

---

## 🏗️ Arquitectura del Sistema

| Capa | Tecnología | Estado |
|---|---|---|
| Frontend | Next.js 14 (App Router) | ✅ |
| Autenticación | PostgreSQL local (`GoogleUsers` + bcrypt) | ✅ |
| Base de datos | PostgreSQL local (localhost:5432, DB: postgres) | ✅ |
| Despliegue | Vercel (`app.serendipity.vn`) | ✅ Build en verde |
| IA / Sophia | OpenRouter (Gemini Flash) + Anthropic Claude | ✅ |
| Sincronización | Google Sheets API (Sophia sync en background) | ✅ |

---

## ✅ Módulos Completados

### Sistema de Autenticación (Local PG)
- Auth migrado de Supabase → PostgreSQL local
- Tabla `GoogleUsers`: `id, email, password_hash, name, role, created_at`
- Endpoint `POST /api/auth/login` — verifica email + bcrypt hash
- Endpoint `POST /api/admin/users` — creación de usuarios (solo ADMIN)
- Roles disponibles: `ADMIN | SUPERVISOR | OPERATIVO`
- Context `AuthProvider` lee de localStorage + PG, compatible con Supabase fallback

### Usuarios del Equipo Creados (04-May-2026)
Seed script: `scripts/seed-users.js` (idempotente, usa `ON CONFLICT DO UPDATE`)

| Nombre | Email | Contraseña inicial | Rol | Área |
|---|---|---|---|---|
| Vu | vu@serendipity.vn | Serendipity2026! | SUPERVISOR | Logistics |
| Thuy | thuy@serendipity.vn | Serendipity2026! | OPERATIVO | Customer Service |
| Tuyen | tuyen@serendipity.vn | Serendipity2026! | SUPERVISOR | RRHH |
| Thanh | thanh@serendipity.vn | Serendipity2026! | OPERATIVO | Technician/Lab |

> Para recrear en cualquier momento: `node scripts/seed-users.js`

### Lab Mobile (`/lab/mobile`)
- Interfaz 100% responsiva para técnicos en taller
- **Fix 04-May**: rol y nombre del usuario ahora leen del `AuthContext` real (no hardcodeado)
- Creación de **lotes manuales** (cliente + producto) sin necesidad de orden previa
- Creación de **lotes vinculados** a órdenes de producción existentes
- Flujo de lote con pesaje de químicos por capa
- Verificación de stock antes de producción (`/inventory-check`)
- Flujo de packing (`/packing`) con registro de SF empacado
- Buildear fórmulas desde el móvil (`/formula-builder`)

### Dashboard de Operaciones (`/dashboard/operaciones`)
- Listado de órdenes en tiempo real desde `production_orders`
- Filtrado por estado: PENDING (gris), IN_PROGRESS (ámbar), PACKING (azul), COMPLETED (verde)
- Modal de detalle con historial de lotes y QR
- Sincronización instantánea: lote creado en Lab Mobile → aparece en Ámbar aquí

### Sistema MES Completo
- **Chemicals**: catálogo con 20 químicos seed, control de stock automático
- **Formulas**: diseñador de recetas con capas químicas y mecánicas
- **Production Orders**: ciclo completo PENDING → IN_PROGRESS → PACKING → COMPLETED
- **Batches**: registro de lotes con capas, consumo real vs preparado, cálculo de merma
- **Batch Layers**: trigger automático de descuento de stock al registrar uso
- **Stock Movements**: log completo de entradas/salidas/ajustes

### Módulos Adicionales
- `/dashboard/finanzas` — libro de cuentas, balance, amortización PRARA
- `/dashboard/configuracion` — gestión de usuarios, roles
- `/dashboard/sophia` — chat con IA Sophia (OpenRouter)
- `/dashboard/notificaciones` — centro de notificaciones
- `/lab/formulas` — vista completa de recetas
- `/lab/quimicos` — inventario de químicos
- `/lab/import` — importación de facturas con Claude AI
- `/lab/scale` — motor de escalado de mezclas por SF

---

## 🗄️ Esquema de Base de Datos (PostgreSQL local)

```
postgres (localhost:5432)
│
├── "GoogleUsers"          ← Auth local (4 usuarios activos ✅)
├── "Orders"               ← Órdenes de cliente (sincronizadas con Google Sheets)
├── "QrScans"              ← Log de escaneos QR físicos
├── "OrderStatusHistory"   ← Audit trail de cambios de estado
│
├── production_orders      ← Órdenes MES (ligadas a "Orders")
├── batches                ← Lotes de laboratorio
├── batch_layers           ← Capas ejecutadas por lote
├── stock_movements        ← Movimientos de inventario (auto-trigger)
│
├── chemicals              ← Catálogo de 20 químicos seed
├── formulas               ← Recetas de producción
├── formula_layers         ← Pasos de cada receta
├── articles               ← Catálogo de artículos aprobados
│
├── transactions           ← Libro contable (INCOME / EXPENSE)
└── finances_state         ← Estado financiero global (fila única)
```

### Migraciones aplicadas (en orden)
1. `sql/kingdom_migration_v2.sql`
2. `sql/phase2_finance_and_sheets.sql` ← Incluye `GoogleUsers`
3. `sql/phase3_mes_schema.sql` ← MES core
4. `sql/phase4_inventory_and_purchasing.sql`
5. `sql/phase5_recipe_designer.sql`
6. `sql/phase5_legacy_deprecation.sql`

---

## 🔄 Flujo de Datos Lab → Dashboard (Validado)

```
Thanh inicia sesión (/login)
        ↓
Va a /lab/mobile → presiona "Nuevo Lote"
        ↓
POST /api/batches (transacción atómica)
    ├── INSERT "Orders"            (status: IN_PROCESS)
    ├── INSERT production_orders   (status: IN_PROGRESS)
    ├── INSERT batches             (executed_by: Thanh)
    └── INSERT OrderStatusHistory
        ↓
Dashboard /dashboard/operaciones (Vu)
    └── GET /api/production-orders?status=IN_PROGRESS
        └── Orden aparece en color ÁMBAR ✅
```

**Nota sobre estados:**
- `"Orders".status` = `'IN_PROCESS'` (sin D) — tabla del cliente/dashboard Santiago
- `production_orders.status` = `'IN_PROGRESS'` (con D) — tabla MES interna

---

## 📡 API Endpoints Principales

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login con email + password |
| GET/POST/DELETE | `/api/admin/users` | Gestión de usuarios |
| GET/POST | `/api/batches` | Lotes de producción |
| GET/PATCH | `/api/production-orders` | Órdenes MES |
| GET/POST | `/api/formulas` | Recetas |
| GET | `/api/chemicals` | Catálogo de químicos |
| POST | `/api/sheets/sync` | Sync Google Sheets (Sophia) |
| GET/POST | `/api/finance` | Módulo financiero |
| GET/POST | `/api/purchase-requests` | Solicitudes de compra |

---

## 🔧 Variables de Entorno Requeridas (`.env.local`)

```env
# PostgreSQL Local
PG_HOST=localhost
PG_PORT=5432
PG_DB=postgres
PG_USER=postgres
PG_PASSWORD=Abundancia2026

# IA
ACTIVE_AI_PROVIDER=openrouter
OPEN_ROUTER_API_KEY=...
GEMINI_API_KEY=...

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_ORDERS_SHEET_ID=...

# Supabase (fallback, no requerido para auth)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 📋 Pendientes Post-Validación

- [ ] Flujo de cambio de contraseña en primer login (actualmente no existe)
- [ ] Permisos granulares por rol (qué secciones ve OPERATIVO vs SUPERVISOR vs ADMIN)
- [ ] Impresión de QR desde el dashboard (modal ya existe, validar impresión física)
- [ ] Google Sheets sync — confirmar con Sofía que los lotes manuales aparecen en el Sheet
- [ ] Deploy en Vercel con `.env.local` de producción (actualmente DB es solo local)
- [ ] Actividad del dashboard en tiempo real (actualmente hardcodeada, conectar a eventos reales)

---

## 🗂️ Historial de Sesiones

| Fecha | Commits clave | Descripción |
|---|---|---|
| 22-Abr | `ba8b0279` | Migración Supabase → PostgreSQL local |
| 23-Abr | `826c3144` | Despliegue fase 2, Google Sheets sync |
| 27-Abr | `a5f665c` | Rediseño App Mobile Lab premium |
| 27-Abr | `22bdc87` | Integración lotes mobile → dashboard |
| 04-May | `19e1d82` | Seed 4 usuarios del equipo |
| 04-May | `fcbbcb3` | Fix: rol real de auth en /lab/mobile |

---

*Reporte mantenido por Antigravity · Serendipity Anthropos OS*
