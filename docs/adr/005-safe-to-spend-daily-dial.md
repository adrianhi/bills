# ADR 005: Indicador y cálculo de Dinero Libre Diario (Safe-to-Spend Dial)

Estado: propuesta — 2026-09-02

## Contexto

Los usuarios de aplicaciones financieras enfrentan fatiga cognitiva al intentar interpretar gráficos agregados, desgloses por categoría y presupuestos mensuales. Ante una decisión de gasto impulsivo o cotidiano (salir a almorzar, pedir delivery, comprar un café), el usuario debe calcular mentalmente cuántos días le quedan al mes, cuánto lleva gastado en total y si esa compra específica lo dejará en números rojos a fin de mes.

Actualmente `bills.` cuenta con un módulo robusto de presupuestos mensuales (`spending_budgets`) con alertas de ritmo (*pacing warnings*), pero la información se presenta a nivel mensual consolidado. Hace falta una métrica orientada a la acción inmediata que traduzca el estado financiero en una cifra diaria clara y libre de culpa: *"¿Cuánto puedo gastar hoy sin descarrilarme?"*.

## Decisión

Implementar el componente y servicio de **Dinero Libre Diario (*Safe-to-Spend Dial*)** en el Dashboard principal, compuesto por:

1. **Modelo Matemático Determinista en Dominio (`apps/api/src/modules/budgets/domain/safe-to-spend.ts`)**:
   - Resuelve el día actual y los días restantes del mes según la zona horaria oficial del usuario (`America/Santo_Domingo`).
   - `remainingBudget = max(0, monthlyLimit - approvedSpentThisMonth)`
   - `daysRemainingInMonth = daysInMonth - currentDayNumber + 1` (incluyendo el día de hoy).
   - `dailyAllowance = remainingBudget / daysRemainingInMonth`
   - `spentToday = sum(approvedTransactions where date = today)`
   - `todayAvailable = dailyAllowance - spentToday`
   - Estados de ritmo diario:
     - `SURPLUS` (Verde): `spentToday <= dailyAllowance` y ritmo mensual óptimo.
     - `ADJUSTING` (Amarillo): `spentToday > dailyAllowance` pero con presupuesto mensual positivo; proyecta la reducción diaria sugerida para los días restantes (`recalculatedAllowance = (remainingBudget - spentToday) / (daysRemainingInMonth - 1)`).
     - `EXCEEDED` (Rojo): `monthlyLimit` agotado (`remainingBudget = 0`).
     - `UNSET` (Gris / Sugerencia): Sin presupuesto configurado; ofrece activar el indicador con un solo toque tomando la mediana histórica de gasto.

2. **Diseño de Interfaz Móvil y FSD**:
   - Widget destacado en el tope del Dashboard: un dial circular estilo Apple con retroalimentación háptica y cristal líquido (*liquid glass*).
   - Microcopy amigable y libre de culpa: mensajes de refuerzo positivo que evitan alarmar al usuario si un día gasta más de lo previsto, mostrándole cómo equilibrarlo en los días siguientes.
   - Modos de privacidad: Respeta el enmascaramiento de saldos de la app (`••••••`).

3. **Arquitectura Limpia y Rendimiento**:
   - Backend: Función pura en `domain/safe-to-spend.ts` integrada dentro del endpoint consolidado de presupuesto mensual (`GET /api/v1/budgets/summary`) o endpoint dedicado `/api/v1/budgets/safe-to-spend`, evitando queries adicionales a la base de datos.
   - Frontend: Extensión del contrato `@bills/contracts` y consumo mediante React Query con caché invalidada automáticamente al crear o sincronizar movimientos.

## Consecuencias

- **Positivas**: Aumenta drásticamente el uso diario de la aplicación. Convierte a `bills.` en la herramienta de consulta de bolsillo indispensable antes de realizar cualquier gasto discrecional.
- **Técnicas**: Es un cálculo puramente computacional derivado de datos que ya se consultan (gastos del mes y límite activo), con impacto nulo en latencia de base de datos.
- **Trade-offs**: Para usuarios sin presupuesto configurado, se requiere una experiencia de incorporación guiada (*empty state*) que sugiera automáticamente un límite basado en su historial para que el indicador sea útil desde el inicio.
