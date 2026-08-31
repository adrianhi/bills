# ADR 001: módulos verticales y dependencias dirigidas

Estado: aceptada — 2026-08-31

## Contexto

Los servicios globales permitían que HTTP, Prisma y reglas de negocio se mezclaran. Esto hacía difícil probar una política sin levantar sus adaptadores y facilitaba dependencias circulares.

## Decisión

Cada módulo puede tener `domain`, `application`, `infrastructure` y `http`. Dominio es puro; aplicación coordina puertos; infraestructura implementa Prisma o proveedores; HTTP traduce el contrato público. `app-container.ts` construye las instancias y es el único composition root.

Los puertos representan capacidades concretas. No se crearán repositorios o servicios base genéricos. Los consumidores importan únicamente la API pública del módulo.

## Consecuencias

Los casos de uso se prueban con dobles pequeños, cambiar un proveedor no altera el dominio y los límites pueden verificarse estáticamente. Hay más archivos, pero cada uno tiene una responsabilidad y un motivo de cambio reconocible.
