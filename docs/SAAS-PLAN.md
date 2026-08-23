# Plan SaaS de bills.

## Objetivo

Convertir la herramienta personal en una beta privada que permita a una persona registrarse en minutos, conectar BHD sin compartir credenciales bancarias y ver únicamente sus propios datos. La plataforma debe incorporar otros bancos sin duplicar el núcleo de autenticación, ingestión, almacenamiento o analítica.

## Decisiones de producto

- **Piloto:** BHD valida adquisición, onboarding, precisión del parser y soporte.
- **Expansión:** Popular, Banreservas y Qik son los siguientes candidatos, pero se habilitan por evidencia y no por calendario.
- **Acceso:** Google y magic link con Supabase Auth; beta gratuita de 25–50 usuarios por invitación.
- **Conexión inicial:** reenvío de notificaciones a una dirección opaca por usuario y banco.
- **Privacidad:** bills. nunca solicita credenciales de banca en línea.
- **Unidad de aislamiento:** workspace. Aunque la beta use uno personal por usuario, el modelo permite miembros sin reescribir las transacciones.
- **Infraestructura:** React/Vite, Express, Prisma, PostgreSQL/Supabase, Resend Inbound y un worker separado.

## Contrato multi-banco

Cada adaptador recibe un `NormalizedEmail` y devuelve `parsed`, `ignored` o `unsupported`. Las transacciones normalizadas incluyen siempre:

- `institutionCode`
- `ingestionChannel`
- `externalId`
- monto, moneda y fecha
- tipo, estado, comercio crudo y metadatos opcionales

El `ParserRegistry` elige el adaptador por la conexión, no mediante heurísticas globales. El remitente se vuelve a validar dentro del adaptador. La idempotencia es compuesta por workspace, institución y external ID.

## Fases

### Fase 0 — Fundaciones de seguridad

Estado: implementada en código; pendiente de migración remota.

- Supabase Auth reemplaza PIN y API key compartidos.
- Bootstrap idempotente de perfil/workspace.
- Filtro obligatorio por `workspace_id` en movimientos, estadísticas y reglas.
- Errores estructurados sin filtrar mensajes internos.
- Rate limiting, Helmet, CORS por allowlist y request IDs.
- RLS habilitado y acceso directo de roles `anon`/`authenticated` revocado; los datos pasan por la API aislada.
- Baseline y migración Prisma versionados.

Criterio de salida: pruebas de aislamiento con una base descartable y migración validada sobre una copia de Supabase.

### Fase 1 — Beta BHD usable

Estado: recorrido principal implementado; falta validación end-to-end con Resend real.

- Onboarding que genera dirección de reenvío privada.
- Webhook Resend verificado con firma Svix.
- Evento persistente e idempotente antes de responder 202.
- Worker con reintentos exponenciales y máximo de cinco intentos.
- Adaptador BHD separado del transporte.
- Raw fallido cifrado y expiración de siete días.
- Alta manual y exportación con sesión autenticada.

Criterio de salida: fixtures anonimizados cubren ≥95% de las notificaciones BHD esperadas; cero fuga entre workspaces; webhook duplicado no genera movimientos duplicados.

### Fase 2 — Operación de beta

Estado: siguiente bloque.

- Panel interno de eventos fallidos sin exponer contenido sensible.
- Métricas: activación, tiempo hasta primer movimiento, parse success rate, duplicados, retraso de cola y retención semana 1/4.
- Flujo de soporte y borrado de cuenta/datos.
- Términos, política de privacidad, consentimiento y correo de contacto.
- Backups y restauración probada.
- Alertas por worker detenido, backlog y errores de proveedor.

Criterio de salida: 25 testers invitados, soporte reproducible y restauración ensayada.

### Fase 3 — Segundo banco

Estado: no iniciar hasta estabilizar BHD.

- Elegir banco por demanda real de la beta.
- Añadir fixtures anonimizados y un adaptador nuevo.
- Activar la institución con feature flag/catálogo.
- Comparar calidad y tasa de soporte contra BHD.

Criterio de salida: el segundo banco se integra sin cambiar controladores, modelo de workspace ni worker.

### Fase 4 — Monetización y crecimiento

Estado: posterior a retención demostrada.

- Presupuestos y alertas de burn-rate.
- Detección de suscripciones.
- Importación CSV como recuperación y onboarding alterno.
- Planes y límites de uso; Stripe u otro proveedor solo después de definir el valor recurrente.
- Reporte mensual; PDF cuando exista demanda, no como requisito de activación.

## Orden recomendado de ejecución inmediata

1. Rotar y cargar variables reales únicamente en `.env`/hosting.
2. Crear backup de Supabase y probar migraciones sobre una copia.
3. Configurar redirect URLs de Google en Supabase.
4. Levantar API, web y worker; validar login y bootstrap.
5. Crear túnel ngrok y webhook `email.received` en Resend.
6. Enviar fixtures BHD anonimizados de compra, transferencia entrante/saliente y servicio.
7. Ejecutar pruebas de aislamiento con dos usuarios invitados.
8. Invitar 5 usuarios internos; después ampliar gradualmente a 25–50.

## Lo que no se debe hacer todavía

- Conectar más bancos antes de medir el piloto BHD.
- Ejecutar `prisma db push` contra producción.
- Guardar correos crudos exitosos.
- Compartir una bandeja Gmail o una API key entre usuarios.
- Exponer `SUPABASE_SECRET_KEY` en Vite o requerirla para Google Auth.
- Cobrar antes de validar activación, precisión y retención.
