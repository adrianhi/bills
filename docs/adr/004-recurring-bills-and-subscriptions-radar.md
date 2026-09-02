# ADR 004: Radar de gastos recurrentes, suscripciones y proyección de cobros

Estado: propuesta — 2026-09-02

## Contexto

`bills.` captura gastos con precisión mediante ingestión de correos bancarios y reglas de categorización, pero funciona como un sistema pasivo de contabilidad retrospectiva. El usuario debe ingresar a revisar qué gastó, sin anticipación de compromisos futuros ni detección de pagos repetitivos que erosionan su liquidez.

En el mercado dominicano, los débitos automáticos y suscripciones recurrentes (servicios públicos como Edeeste/Claro/Altice, plataformas de streaming, membresías de gimnasios, cuotas de préstamos y seguros) se dispersan entre múltiples tarjetas y cuentas. El usuario suele enterarse del cargo cuando ya impactó su balance, sin visibilidad de su carga fija mensual ni alertas ante incrementos de tarifas.

## Decisión

Implementar un **Radar de Gastos Recurrentes y Suscripciones** impulsado por un motor de detección por cadencia determinista en el dominio, sin dependencias de servicios externos ni IA opaca.

1. **Motor de Detección de Cadencia (`apps/api/src/modules/recurring`)**:
   - Agrupa movimientos por identidad de comercio normalizada (`merchantKey` o `categoryRule`), moneda e importe dentro de una tolerancia paramétrica (±10% para consumos de servicios con variación de tarifa).
   - Identifica intervalos cíclicos: mensuales (28-32 días), quincenales (14-16 días, común en nómina dominicana) y anuales (360-370 días).
   - Requiere un umbral mínimo de 2 ocurrencias consecutivas para calificar como recurrente sugerido (`SUGGESTED`), promoviéndose a confirmado (`CONFIRMED`) por el usuario o al detectar una tercera ocurrencia periódica.
   - Detecta y alerta anomalías de precio: calcula el diferencial frente al promedio histórico y emite un evento `PRICE_HIKE` si el cargo reciente excede la media en más de un 5%.

2. **Proyección y Calendario de Vencimientos**:
   - Modela `nextExpectedDate` proyectando la cadencia del comercio sobre el día típico de corte.
   - Ofrece un endpoint de lectura que desglosa:
     - `fixedMonthlyBurden`: Suma de importes recurrentes activos en DOP y USD.
     - `upcomingInDays(7 | 14 | 30)`: Lista cronológica de cobros inminentes con días restantes.
     - `unrecognizedOrGhost`: Suscripciones que no han sido vistas en más de 45 días (posible cancelación o tarjeta vencida).

3. **Arquitectura y Límites FSD**:
   - Backend: Módulo vertical `apps/api/src/modules/recurring` compuesto por `domain` (algoritmo puro de detección de intervalos y clustering), `application` (casos de uso `detect-recurring-expenses`, `list-recurring-subscriptions`, `confirm-subscription`), `infrastructure` (Prisma para persistencia de la entidad `RecurringBill`) y `http` (rutas REST `/api/v1/recurring`).
   - Frontend: Slice `entities/recurring-bill` (queries, contratos) y `widgets/recurring-radar` / `features/manage-subscriptions` (UI tipo carrusel interactivo en el Dashboard y vista de calendario de cobros con estética liquid glass).

## Consecuencias

- **Positivas**: Transforma la aplicación de un registro pasivo a un asistente proactivo con alto valor percibido desde el primer día ("Aha! Moment" inmediato al sincronizar transacciones). Da a los usuarios control sobre gastos zombi y visibilidad anticipada de liquidez.
- **Técnicas**: La detección se ejecuta como un cálculo incremental post-ingestión o bajo demanda, sin impactar la latencia de sincronización de correos ni bloquear escrituras de transacciones.
- **Trade-offs**: Comercios con montos altamente erráticos (ej. factura eléctrica variable) requieren mayor tolerancia en el algoritmo de clustering y confirmación explícita del usuario para evitar falsos positivos.
