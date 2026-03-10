# Flujo de Operación: Escaneo de Lotes con Códigos QR en Serendipity

Este documento detalla el flujo de trabajo físico y digital diseñado para el manejo de lotes dentro del entorno industrial, aprovechando la integración de la base de datos Supabase y la interfaz móvil "Ojo de Sophia".

## 1. El Nacimiento del Lote (Creación y Generación)
* **Acción:** Un supervisor o administrador accede a la plataforma y da de alta un "Nuevo Lote" (por ejemplo, en la estación de Cultivo).
* **Supabase:** La base de datos guarda todos los detalles (variedad, peso inicial, fecha, responsable) y le asigna un **ID Único (UUID)** de manera automática.
* **El Código QR:** Automáticamente, la plataforma genera una imagen de Código QR. Este código no contiene la información completa, sino únicamente un identificador seguro trazable, por ejemplo: `serendipity-lote:a1b2c3d4-xxxx`.
* **Mundo Físico:** El sistema habilita la opción de **"Imprimir Etiqueta"**. Este código QR se imprime en una etiqueta adhesiva y se pega físicamente en la bandeja, caja o contenedor que transporta el producto real.

## 2. El Tránsito Físico (El Operador entra en acción)
* El lote físico viaja por el flujo de trabajo de la planta. Por ejemplo, pasa de "Cultivo" a "Cosecha".
* El operador de la estación de Cosecha recibe físicamente la bandeja con el producto y la etiqueta QR pegada.
* **Acción Operativa:** El operador saca su dispositivo móvil (o utiliza la tablet de la estación), abre la PWA de Serendipity, toca el botón flotante del **"Ojo de Sophia"** (Escáner) y apunta la cámara a la etiqueta de la bandeja.

## 3. La Lectura y Sincronización
* **Escaneo:** En milisegundos, la cámara lee el código e identifica la cadena `serendipity-lote:a1b2c3d4-xxxx`.
* **Consulta a Supabase:** De manera instantánea, la aplicación (el frontend) le envía una petición a la base de datos Supabase solicitando el historial y estado actual de ese lote específico.
* **Interfaz (UI):** En lugar de forzar al usuario a buscar manualmente en una lista extensa, se despliega automáticamente en la pantalla de su dispositivo la **tarjeta de detalles y actualización de ese lote específico**.

## 4. La Actualización del Flujo (Carga de Datos)
Al detectar el lote, la aplicación conoce exactamente su etapa actual y el usuario que lo está escaneando. En base a esto, despliega una acción contextual:
* **Contexto:** *"Este lote que acabas de escanear viene de Cultivo. ¿Deseas ingresarlo y pesarlo para iniciar la Cosecha?"*
* **Acción:** El operador introduce el valor requerido (ej. *"15 kilogramos"*) y presiona el botón **Confirmar Mermas / Avanzar Lote**.
* **Impacto en BD:** Supabase registra silenciosamente el usuario que realizó la acción, el sello de tiempo (timestamp), el nuevo peso / datos capturados, y traslada el lote a la etapa de Cosecha.
* **Tiempo Real:** Todo el panel de mando de la plataforma (incluyendo a otros usuarios en diferentes áreas) se actualiza en tiempo real reflejando el nuevo estado y posición del lote en la planta.

### Ventajas del Modelo
Este modelo enfocado en el operador soluciona el clásico cuello de botella industrial: **La captura de datos manual en medios físicos mojados, sucios o en movimiento**. El "Ojo de Sophia" convierte un proceso de registro de 2-3 minutos en una simple acción digital sin fricciones: **Escanear -> Introducir Valor -> Confirmar (3 Segundos)**.
