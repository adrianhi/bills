# bills.

Documentación técnica: [arquitectura](docs/ARCHITECTURE.md) · [pruebas y staging](docs/TESTING.md) · [plan SaaS](docs/SAAS-PLAN.md)

Plataforma SaaS de finanzas personales que unifica notificaciones bancarias, normaliza movimientos y ofrece analítica por usuario. **Banco BHD es el piloto**, pero cada institución se integra como un adaptador independiente sobre un contrato común.

## Estado actual

- Acceso con Google o magic link mediante Supabase Auth.
- Beta privada por invitación.
- Un workspace personal aislado por usuario; todas las consultas y mutaciones se filtran por workspace.
- Onboarding principal con Gmail OAuth de solo lectura y sincronización automática; reenvío privado como alternativa.
- Ingesta común: Gmail OAuth o Resend Inbound → `NormalizedEmail` → registro de adaptadores → BHD/Qik.
- Términos y privacidad versionados, consentimiento auditable, exportación y eliminación autoservicio.
- Registro manual, reglas por usuario, dashboard, filtros y exportación autenticada.
- Catálogo multi-banco: BHD en `PILOT`; Popular, Banreservas, Qik, APAP y Scotiabank en `COMING_SOON`.

Consulta el plan, las decisiones y los criterios de salida en [docs/SAAS-PLAN.md](docs/SAAS-PLAN.md).

## Arquitectura

```text
Supabase Auth ── token ──> React/Vite ── Bearer ──> Express API
                                                   │
Gmail ── OAuth readonly ───────────────────────────┤
Correo bancario ── forward ─> Resend ── firma ────┤
                                                   ▼
                                      ingestion_events (PostgreSQL)
                                                   │
                                                worker
                                                   │
                                  ParserRegistry -> BHD | Qik | siguiente banco
                                                   │
                                      transactions (workspace_id)
```

Agregar un banco no requiere modificar el núcleo: se implementa `BankEmailParser`, se registra en `ParserRegistry` y se habilita la institución cuando sus fixtures y métricas cumplen el criterio de calidad.

## Desarrollo local

Requisitos: Node.js 22+, npm y PostgreSQL 16 (local o Supabase).

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev:api
```

En otra terminal:

```bash
npm run dev:web
```

Y para procesar correos entrantes:

```bash
npm run dev:worker --prefix apps/api
```

URLs locales:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Webhook Resend: `POST http://localhost:3000/webhooks/resend`

## Variables necesarias

Para Google/magic link de la cuenta solo hacen falta estas variables en `.env`:

```dotenv
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
APP_URL=http://localhost:5173
LEGACY_OWNER_EMAIL=tu-correo@example.com
```

La API también acepta `VITE_SUPABASE_PUBLISHABLE_KEY` como fallback. **La secret key de Supabase no es necesaria** para este flujo y no debe enviarse al navegador. La URL JWKS se deriva de `SUPABASE_URL`.

En Supabase Dashboard:

1. Habilita Google en Authentication → Providers.
2. Configura el Client ID y Client Secret de Google dentro de Supabase.
3. Añade `http://localhost:5173/auth/callback` a Redirect URLs.
4. Define `http://localhost:5173` como Site URL durante desarrollo.

La importación de Gmail es un OAuth separado del login y requiere credenciales server-side:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/v1/oauth/google/callback
INGESTION_ENCRYPTION_KEY=base64_de_32_bytes
```

Habilita Gmail API, registra exactamente el redirect URI y agrega los testers en la audiencia de Google Cloud. En modo `Testing`, los grants con `gmail.readonly` expiran a los siete días. La salida pública exige verificación de alcance restringido y, al procesarse datos mediante el servidor, normalmente una evaluación de seguridad. Consulta el checklist completo en [docs/SAAS-PLAN.md](docs/SAAS-PLAN.md).

Para la ingesta por correo:

```dotenv
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
RESEND_RECEIVING_DOMAIN=tu-dominio-temporal-de-recepcion
INGESTION_ENCRYPTION_KEY=base64_de_32_bytes
```

Genera la clave de retención localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Los contenidos crudos solo se conservan si un parseo falla, cifrados con AES-256-GCM y por un máximo de siete días. Si no hay clave válida, no se conserva contenido crudo.

## Resend y túnel de desarrollo

1. Levanta API y worker.
2. Expón el puerto 3000 con ngrok.
3. En Resend crea el webhook `email.received` apuntando a `https://TU-TUNEL.ngrok.app/webhooks/resend`.
4. Copia el nuevo signing secret a `RESEND_WEBHOOK_SECRET` y reinicia la API.
5. Configura el dominio receptor temporal de Resend en `RESEND_RECEIVING_DOMAIN`.

Cambiar la URL de ngrok no exige cambios de código: solo actualiza el endpoint del webhook en Resend. No reutilices el secreto de webhook de otro endpoint.

## Migraciones: no usar `db push` en producción

Base nueva:

```bash
npm run prisma:generate
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Base Supabase existente con las tablas personales anteriores:

1. Crea un backup verificable.
2. Confirma que existen las tablas legacy `transactions` y `category_rules`.
3. Marca únicamente el baseline como aplicado:

```bash
npx prisma migrate resolve --applied 00000000000000_legacy_baseline --schema apps/api/prisma/schema.prisma
```

4. Revisa el SQL de `20260823010000_saas_foundation`.
5. Revisa también `20260823020000_lock_down_public_tables`, que bloquea el acceso directo desde Supabase Data API.
6. Ejecuta `prisma migrate deploy`.
7. Inicia sesión con `LEGACY_OWNER_EMAIL`; el bootstrap reclamará las filas legacy cuyo `workspace_id` sea nulo.

No se ejecuta ninguna migración remota automáticamente desde el servidor.

El proyecto Supabase actual ya tiene las seis migraciones registradas y aplicadas. En despliegues siguientes basta ejecutar `prisma migrate deploy`; no vuelvas a resolver el baseline salvo al preparar otra base legacy que carezca de historial Prisma.

## Beta por invitación

`LEGACY_OWNER_EMAIL` puede crear el primer workspace. Para cada tester adicional:

```bash
npm run beta:invite -- persona@example.com
```

El comando debe ejecutarse con `DATABASE_URL`/`DIRECT_URL` apuntando al entorno deseado. Una invitación se consume al crear el workspace del usuario.

## Calidad

```bash
npm run build
npm test
```

Las pruebas de integración destructivas están bloqueadas salvo que `DATABASE_URL` y `TEST_DATABASE_URL` apunten explícitamente a la misma base descartable. Nunca uses la base de producción para tests.

## Docker

```bash
docker compose up -d --build
```

Compose levanta PostgreSQL, ejecuta migraciones en un contenedor separado, inicia API y worker. El flujo n8n anterior queda disponible solo como compatibilidad:

```bash
docker compose --profile legacy-n8n up -d n8n
```

n8n ya no forma parte de la ruta SaaS principal porque una credencial de correo compartida no escala ni mantiene aislamiento por usuario.
