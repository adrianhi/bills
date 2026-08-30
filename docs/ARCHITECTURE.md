# Arquitectura de bills.

## Principios

bills. usa módulos verticales en el API y Feature-Sliced Design en el cliente. Las dependencias siempre apuntan hacia reglas más estables; HTTP, Prisma, Supabase y Gmail son detalles externos.

## Frontend

Orden permitido: `app → pages → widgets → features → entities → shared`.

- `shared/api` contiene el único cliente Axios, normalización de errores y validación de contratos.
- `entities/*/api` define servicios HTTP puros; `model` contiene query keys, selectors y tipos.
- `features/*/model` contiene actions, mutations y estado de formularios.
- `ui` solo presenta datos y emite callbacks. No puede usar Axios, `fetch` o Supabase.
- TanStack Query administra todo estado remoto; React Router administra rutas y query strings.
- Los DTO se validan con `@bills/contracts` antes de convertirse en datos consumibles.

## Backend

Cada módulo puede contener `domain`, `application`, `infrastructure` y `http`.

- `domain` no conoce Express, Prisma ni proveedores.
- `application` implementa casos de uso y coordina repositorios.
- `infrastructure` contiene Prisma, cifrado, colas y clientes externos.
- `http` traduce requests/responses y mantiene compatibilidad con `/api/v1`.
- `app-container.ts` es el composition root; las rutas no construyen dependencias.
- Los archivos de `services/` que permanecen son fachadas temporales de compatibilidad hacia módulos verticales.

El script `npm run check:architecture` impide HTTP en componentes, imports ascendentes en FSD y Prisma fuera de infrastructure.

## Flujo de datos

```text
React UI → feature hook/action → entity service → Axios → API controller
  → application use case → domain policy → Prisma/provider adapter
```

```text
Gmail Push → verified provider adapter → durable event/job
  → IngestionRunner → parser registry → transaction application → PostgreSQL
```

`IngestionRunner` procesa Gmail con leases en PostgreSQL. En Render y Docker Compose corre dentro del único proceso web (`PROCESS_ROLE=all`). Un cron externo puede despertar y avanzar la cola llamando con Bearer token a `POST /api/v1/internal/maintenance/tick`.

Solo `APPROVED` contribuye a gasto, ingreso, ticket promedio, subtotales y gráficas. `REVERSED`, `DECLINED` y `PENDING` permanecen visibles y auditables.

## Añadir un banco

1. Implementar `BankEmailParser` sin dependencias de Express, Gmail o Prisma.
2. Añadir fixtures anonimizados de cada formato soportado.
3. Registrar el parser y metadata institucional.
4. Agregar pruebas de compras, ingresos, transferencias, rechazos y reversas.
5. Ejecutar `npm run verify` y el smoke de staging.

Cada banco se incorpora mediante un parser y remitentes explícitos; las suscripciones por conexión limitan qué instituciones puede consultar Gmail.
