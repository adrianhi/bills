# Guía Definitiva de Despliegue a Producción (Go-Live Weekend) — bills.

Esta guía documenta el procedimiento paso a paso para desplegar **bills.** a producción este fin de semana en un **único servicio web de Render** (o contenedor Docker), conectado a **Supabase** y **Google Cloud**.

---

## 1. Arquitectura de Despliegue Simplificada

bills. está empaquetado para operar en un modelo **monolítico de proceso único** (`PROCESS_ROLE=all`):
- **Web:** La SPA React compilada con Vite se sirve como archivos estáticos optimizados con caché desde `public/index.html`.
- **API:** El servidor Express atiende todas las rutas `/api/v1/*`.
- **Worker:** El runner de ingesta de Gmail, el motor proactivo y el calculador de gastos recurrentes corren en el mismo proceso, eliminando la necesidad de pagar por workers adicionales.
- **Base de Datos:** PostgreSQL en Supabase gestionado por Prisma (Pooler en modo transacción para consultas y directo para migraciones).

```text
[ Navegador del Usuario ]
           │
           ▼
[ Render Web Service (bills-app) ]
  ├── Express HTTP Server (:3000)
  ├── Static SPA Assets (public/index.html)
  └── Ingestion & Proactive Runners (Background Jobs)
           │
     ┌─────┴───────────────────────┐
     ▼                             ▼
[ Supabase PostgreSQL ]   [ Google Cloud APIs ]
 (Pooler + RLS Activo)     (Auth + Gmail Readonly)
```

---

## 2. Preparación Previa al Despliegue

### 2.1 Verificación Preflight Local
Antes de subir cualquier cambio a producción, ejecuta el validador automatizado:

```powershell
npm run verify:preflight
```

Debe mostrar:
- Frontend Web Bundle: `PASS`
- Contratos TypeScript: `PASS`
- Backend API Bundle: `PASS`
- Conectividad PostgreSQL: `PASS`
- Migraciones Prisma: `14 migraciones registradas y aplicadas`
- RLS Activo: `29 tablas protegidas`

---

## 3. Despliegue en Render

### Opción A: Usando Render Blueprint (Recomendado - 1 Clic)
1. Inicia sesión en tu cuenta de [Render](https://dashboard.render.com/).
2. Haz clic en **New +** y selecciona **Blueprint**.
3. Conecta tu repositorio GitHub de `bills` y selecciona la rama `master` (o `develop`).
4. Render detectará automáticamente el archivo [`render.yaml`](../render.yaml) configurando:
   - El servicio web `bills-app`.
   - El cron job de mantenimiento `bills-maintenance-tick` (cada 10 minutos).
5. Completa los valores de las variables de entorno marcadas con `sync: false`.

### Opción B: Creación Manual del Web Service
1. En Render Dashboard: **New +** → **Web Service**.
2. Conecta el repositorio de GitHub.
3. Configura los parámetros:
   - **Name:** `bills-app` (o el nombre que prefieras).
   - **Region:** `Oregon (US West)` o la más cercana a tu base de Supabase (`aws-0-us-east-1` = Ohio o Virginia).
   - **Branch:** `master` (o `develop`).
   - **Runtime:** `Node`.
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/health`
   - **Plan:** `Starter` ($7/mes para cero interrupciones de workers) o `Free`.

---

## 4. Matriz de Variables de Entorno en Render

Copia y pega las siguientes variables en la pestaña **Environment** de tu servicio en Render (basadas en [`.env.production.example`](../.env.production.example)):

| Variable | Valor / Ejemplo | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activa modo producción y validaciones estrictas |
| `PORT` | `3000` | Puerto interno de escucha |
| `PROCESS_ROLE` | `all` | Corre API y runners en el mismo proceso |
| `APP_URL` | `https://tu-servicio.onrender.com` | URL pública HTTPS del frontend |
| `API_PUBLIC_URL` | `https://tu-servicio.onrender.com` | URL pública HTTPS de la API |
| `CORS_ORIGIN` | `https://tu-servicio.onrender.com` | Origen permitido para CORS |
| `SUPABASE_URL` | `https://cnedhjfwaxtbvszqgqcb.supabase.co` | URL de tu proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Clave pública de Supabase |
| `VITE_SUPABASE_URL` | `https://cnedhjfwaxtbvszqgqcb.supabase.co` | Inyectada al bundle web en el build |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| `sb_publishable_...` | Inyectada al bundle web en el build |
| `VITE_APP_URL` | `https://tu-servicio.onrender.com` | Inyectada al bundle web |
| `DATABASE_URL` | `postgresql://...:6543/postgres?pgbouncer=true` | Pooler Supabase en puerto 6543 |
| `DIRECT_URL` | `postgresql://...:5432/postgres` | Conexión directa Supabase en puerto 5432 |
| `INGESTION_ENCRYPTION_KEY` | *(Clave base64 de 32 bytes)* | Cifrado AES-256-GCM de tokens y eventos |
| `LEGAL_AUDIT_SALT` | *(Mínimo 32 caracteres)* | Sal para el hash de consentimiento legal |
| `LEGAL_PROVIDER_NAME` | `"Tu Nombre o Empresa"` | Nombre en Términos y Privacidad |
| `LEGAL_PROVIDER_ID` | `"RNC o Cédula"` | Documento de identidad del titular |
| `LEGAL_CONTACT_EMAIL` | `privacidad@tu-dominio.com` | Correo para ejercer derechos ARCO |
| `LEGAL_CONTACT_ADDRESS` | `"Santo Domingo, República Dominicana"`| Dirección física requerida por ley |
| `MAINTENANCE_SECRET` | *(Cadena aleatoria segura)* | Secreto para el webhook del cron tick |
| `GOOGLE_OAUTH_CLIENT_ID` | `10522...apps.googleusercontent.com` | Cliente OAuth de Google Cloud |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `GOCSPX-...` | Secreto OAuth de Google Cloud |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://tu-servicio.onrender.com/api/v1/oauth/google/callback` | Callback exacto registrado en Google |

---

## 5. Configuración en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard/project/cnedhjfwaxtbvszqgqcb).
2. **Authentication → URL Configuration:**
   - **Site URL:** Pon tu URL de producción: `https://tu-servicio.onrender.com` (o `https://bills.do`).
   - **Redirect URLs:** Agrega:
     - `https://tu-servicio.onrender.com/**`
     - `https://tu-servicio.onrender.com/auth/callback`
     - *(Si tienes dominio propio, agrega también `https://bills.do/**`)*
3. **Authentication → Providers → Google:**
   - Asegúrate de que el proveedor Google esté habilitado y tenga configurados tu `Client ID` y `Client Secret`.

---

## 6. Configuración en Google Cloud Console

1. Entra a [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. En **OAuth consent screen** (Pantalla de consentimiento):
   - Estado de publicación: `Testing`.
   - Agrega tu correo y el de tus usuarios beta en **Test users**.
   - Verifica que los alcances incluyan `.../auth/gmail.readonly`, `email`, `profile` y `openid`.
3. En **Credentials → OAuth 2.0 Client IDs → Tu Cliente Web**:
   - **Authorized JavaScript origins:**
     - `https://tu-servicio.onrender.com` (y tu dominio propio si aplica).
   - **Authorized redirect URIs:**
     - `https://cnedhjfwaxtbvszqgqcb.supabase.co/auth/v1/callback` (Para el login con Supabase).
     - `https://tu-servicio.onrender.com/api/v1/oauth/google/callback` (Para la conexión de Gmail server-side).

---

## 7. Configuración del Cron de Mantenimiento (Despertador)

Si usas el plan Free o deseas asegurar que la cola de Gmail nunca se congele:
1. En Render Dashboard: **New +** → **Cron Job**.
2. **Name:** `bills-cron-tick`
3. **Schedule:** `*/10 * * * *` (cada 10 minutos).
4. **Command:**
   ```bash
   curl -fsS -X POST -H "Authorization: Bearer <TU_MAINTENANCE_SECRET>" "https://tu-servicio.onrender.com/api/v1/internal/maintenance/tick"
   ```

---

## 8. Protocolo de Smoke Test Post-Lanzamiento

Una vez que el despliegue marque `Live`:

1. **Health Check:**
   Visita `https://tu-servicio.onrender.com/health`. Debe responder con:
   ```json
   { "status": "healthy", "timestamp": "...", "version": "1.0.0", "uptime": 12.3 }
   ```
2. **Carga del Frontend:**
   Visita la URL principal en una ventana en incógnito. Debe cargar la pantalla de inicio/login sin errores de consola ni advertencias de CSP.
3. **Inicio de Sesión:**
   Inicia sesión con Google. Debe autenticar vía Supabase y redirigir al Onboarding / Dashboard.
4. **Consentimiento Legal:**
   Acepta los términos actualizados (`2026-08-29.1`).
5. **Conexión de Gmail:**
   Prueba el flujo de "Conectar Gmail". Debe abrir el consentimiento de Google, regresar al callback y registrar la conexión exitosa.
6. **Manejo de Transacción Manual:**
   Crea un movimiento de prueba con el botón rápido. Confirma que se calcule inmediatamente en las tarjetas de saldo y margen diario.
7. **Simulador y Hub de Recurrentes:**
   Abre el Simulador Proactivo ("¿Puedo darme este gusto?") y verifica que calcule el impacto diario en tiempo real.

---

## 9. Comandos Útiles para el Administrador en Producción

- **Ver estado general de la beta:**
  ```powershell
  npm run beta:status
  ```
- **Crear una invitación para un tester:**
  ```powershell
  npm run beta:invite -- tester@example.com
  ```
- **Replay de correos bancarios pendientes o fallidos:**
  ```powershell
  npm run gmail:replay -- --provider GOOGLE_GMAIL --bank BHD --apply
  ```
- **Métricas agregadas del producto:**
  ```powershell
  npm run product:metrics
  ```
