# Serendipity Lab Mobile - Guía de Integración

Esta es la capa visual (UI) para la operación táctica del laboratorio. Está diseñada para ser reactiva, responsiva y orientada a roles.

## Estructura de la Aplicación
El archivo principal es `src/app/lab/mobile/page.tsx`. Utiliza una arquitectura de **Máquina de Estados Simple** para gestionar las pantallas (`Screen`).

### Componentes Clave:
- **`Header`**: Gestiona sincronización, cambio de empresa (Serendipity/PRARA), idioma y perfil.
- **`BottomNav`**: Navegación principal persistente.
- **`HomeScreen`**: Dashboard de KPIs y gráficos (MSP/Admin focus).
- **`OrdersScreen`**: Listado de batches activos (Nodo focus).
- **`BatchScreen` (Pedido al Lab)**: Flujo de pesaje y formulación.
- **`InventoryScreen`**: Control de stock crítico.

## Conexión con el Backend (Sofía)
La aplicación consume datos a través de `operationsService`. Para conectar la base de datos local de Santiago o los datos procesados por Sofía:

1. **Endpoints**: Modificar las rutas en `src/services/operationsService.ts`.
2. **Polling**: Actualmente la sincronización es manual (botón Refresh). Se puede activar polling automático en el `useEffect` principal del `page.tsx`.
3. **Roles**: La UI se adapta según la propiedad `role` del objeto `user`.
   - `ADMIN`: Acceso a métricas globales y configuraciones.
   - `TECHNICIAN`: Acceso a ejecución de lotes y empaque.
   - `MSP`: Vista de rendimiento y supervisión.

## Datos de Prueba (Mock Data)
Los datos de ejemplo están definidos al inicio de `page.tsx`. Para pruebas reales, reemplazar estos arrays con llamadas a `fetch()` dentro del método `load`.

---
*Diseño y UI desarrollados por Antigravity AI.*
