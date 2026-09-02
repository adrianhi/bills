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
- `app-container.ts` es el único composition root; rutas y middleware reciben instancias desde allí.
- No existe una capa global `services/`: cada capacidad vive en su módulo y expone una API pública.
- Los casos de uso dependen de puertos orientados a capacidades, nunca de Prisma o proveedores.
- Los adaptadores de Prisma construyen filtros, agregaciones y transacciones de base de datos.

El script `npm run check:architecture` impide ciclos, HTTP en componentes, imports ascendentes o profundos en FSD, cruces directos entre features, Prisma fuera de infrastructure y dependencias de infraestructura desde aplicación o dominio. Los archivos runtime nuevos o modificados no pueden superar 250 líneas.

## APIs públicas y composición

Los módulos del API y los slices del cliente se consumen desde su `index.ts`. Un import profundo es una dependencia privada y el gate arquitectónico lo rechaza en código modificado. No se usan `BaseService` ni `BaseRepository`: cada puerto nombra una capacidad del negocio.

En frontend, las páginas solo componen secciones y modales. Los hooks de `model` administran consultas, mutaciones y estado del flujo; los componentes de `ui` reciben modelos o callbacks tipados y no conocen el transporte HTTP.

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

Solo los movimientos de gasto con estado `APPROVED` contribuyen a totales, ticket promedio, subtotales y gráficas. Las transferencias recibidas se persisten como evidencia parcial, pero se excluyen de todas las consultas y superficies de usuario. `REVERSED`, `DECLINED` y `PENDING` de gastos permanecen visibles y auditables.

## Añadir un banco

1. Implementar `BankEmailParser` sin dependencias de Express, Gmail o Prisma.
2. Añadir fixtures anonimizados de cada formato soportado.
3. Registrar el parser y metadata institucional.
4. Agregar pruebas de compras, retiros, transferencias enviadas y recibidas, rechazos y reversas; verificar que los ingresos persistidos permanezcan ocultos.
5. Ejecutar `npm run verify` y el smoke de staging.

Cada banco se incorpora mediante un parser y remitentes explícitos; las suscripciones por conexión limitan qué instituciones puede consultar Gmail.
