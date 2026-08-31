# ADR 002: Gmail separado de la ejecución de ingestión

Estado: aceptada — 2026-08-31

## Contexto

Una sola clase concentraba OAuth, tokens, consultas, MIME, sincronización, watches, replay y desconexión. Además, la conexión conocía cómo ejecutar jobs durables.

## Decisión

Conexiones conserva el ciclo de vida OAuth, tokens, consulta y lectura de conexiones. Ingestión posee la planificación y ejecución de sincronizaciones mediante un registro explícito de estrategias para inicial, incremental, backfill, watch y replay.

El runner embebido sigue usando leases y PostgreSQL dentro del único servicio de Render. La estrategia valida la suscripción bancaria antes de procesar y delega la normalización MIME y el procesamiento de mensajes a colaboradores separados.

## Consecuencias

Se preservan deduplicación, cursores, prioridades y concurrencia. Añadir un tipo de job requiere registrar un handler, no modificar un `switch` central ni el ciclo de vida OAuth.
