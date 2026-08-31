# ADR 003: FSD mediante APIs públicas y controladores de flujo

Estado: aceptada — 2026-08-31

## Contexto

Aunque el cliente seguía FSD nominalmente, páginas y modales combinaban navegación, React Query, formularios y presentación, y varios consumidores importaban archivos privados de otros slices.

## Decisión

Se mantiene el orden `app → pages → widgets → features → entities → shared`. Cada slice expone su superficie desde `index.ts`. Las páginas componen; los hooks de `model` coordinan; `ui` presenta. React Query es la única fuente de estado remoto y los reducers locales se reservan para flujos visuales complejos.

Los contratos se dividen por dominio internamente y mantienen el barrel público de `@bills/contracts`. Las utilidades compartidas se agrupan por responsabilidad.

## Consecuencias

Los componentes son más pequeños, las dependencias privadas desaparecen y mover una implementación interna no obliga a editar consumidores. El gate de arquitectura detecta imports profundos, ascendentes y cruces entre features.
