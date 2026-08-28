# Verificación y staging

## Suite local

```bash
npm run verify
npm run test:e2e
```

`verify` ejecuta fronteras arquitectónicas, contratos, pruebas API/web, compilación y lint. Playwright usa Chromium en viewport desktop y móvil; no usa Testing Library.

## PostgreSQL aislado

```bash
docker compose --profile test up -d postgres-test
npm run test:integration
docker compose --profile test down
```

La base `bills_test` vive en `tmpfs`, escucha en `localhost:5433` y no comparte volumen con desarrollo. `run-api-integration-tests.js` aplica migraciones y fija `DATABASE_URL`, `DIRECT_URL` y `TEST_DATABASE_URL` al mismo destino antes de habilitar las pruebas multi-tenant.

## Smoke externo controlado

Usar un proyecto Supabase, un usuario Google tester, topic Pub/Sub y dominio Resend exclusivos de staging. Nunca copiar tokens ni correos personales a fixtures.

1. Ejecutar readiness: `GET /api/v1/health/ready`.
2. Crear un usuario descartable y completar aceptación legal.
3. Conectar Gmail y confirmar watch, history y job inicial.
4. Procesar un fixture anonimizado y verificar API, dashboard y métricas.
5. Enviar una reversa y confirmar una sola fila `REVERSED` excluida de métricas.
6. Probar un webhook Resend firmado hacia HTTPS de staging.
7. Exportar datos y eliminar la cuenta descartable.

Las credenciales externas no forman parte de la suite automática ni del repositorio.
