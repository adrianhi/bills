# Plan SaaS ejecutable de bills.

## Norte del producto

bills. debe permitir que una persona sin conocimientos técnicos cree una cuenta, acepte de forma informada el manejo de sus datos, conecte su correo y vea movimientos en pocos clics. BHD valida el piloto, pero no define la arquitectura: cada banco es un adaptador detrás del mismo contrato de ingestión, idempotencia, almacenamiento y analítica.

## Decisiones vigentes

- BHD es el piloto de precisión y soporte; Qik ya tiene adaptador beta y fixtures sintéticos.
- Google o magic link autentican mediante Supabase. Conectar Gmail es un consentimiento OAuth distinto y opcional.
- Gmail de solo lectura es el onboarding principal; la vuelta de Google sincroniza automáticamente.
- El reenvío con alias privado continúa como alternativa universal y los movimientos manuales como recuperación.
- Un `workspace` es la frontera de aislamiento. Los identificadores externos son únicos por workspace e institución.
- Los correos exitosos no conservan cuerpo; los fallidos se cifran y expiran en siete días.
- Ninguna clave secreta llega a Vite. Los tokens OAuth se cifran con AES-256-GCM.

## Arquitectura multi-banco

```text
Gmail OAuth ─┐
Resend inbound├─> NormalizedEmail ─> ParserRegistry ─> BankEmailParser ─> Transaction
Manual/CSV ──┘                              │
                                  BHD | Qik | próximo banco
```

Un adaptador declara dominios/remitentes, detecta si puede interpretar un mensaje y devuelve `parsed`, `ignored` o `unsupported`. La transacción normalizada conserva `institutionCode`, `ingestionChannel`, `externalId`, monto, moneda, fecha, tipo, estado y campos opcionales. Agregar un banco no cambia OAuth, controladores, worker, workspace, métricas ni UI de conexiones.

## Estado por fase

### Fase 0 — SaaS seguro: implementada y verificada localmente

- Supabase Auth, bootstrap idempotente y beta por invitación.
- Separación obligatoria por workspace y pruebas con usuarios diferentes.
- RLS y revocación de acceso directo de roles públicos de Supabase.
- CORS por allowlist, Helmet, rate limit, request ID y errores estructurados.
- Migraciones versionadas; no se usa `prisma db push` en producción.

Salida verificada: base PostgreSQL 16 creada desde cero, seis migraciones aplicadas y suite de aislamiento aprobada.

### Fase 1 — Ingesta multi-banco: implementada; faltan credenciales externas

- Reenvío Resend firmado, cola persistente, reintentos y parser BHD.
- Registro genérico de adaptadores y parser Qik beta.
- Gmail OAuth server-side con `state` de un solo uso, refresh token cifrado, revocación y estados de reconexión.
- Búsqueda limitada a remitentes soportados; sincronización inicial configurable e idempotencia por mensaje.
- BHD piloto visible como producto; catálogo listo para nuevas instituciones.

Bloqueo externo de validación real: hace falta configurar Google Cloud y recibir correos reales de cuentas de prueba. Resend necesita un dominio receptor y webhook real.

### Fase 2 — Onboarding sin fricción: implementada

- Inicio con Google o magic link.
- Consentimiento legal explícito y versionado antes de datos financieros.
- “Conectar Gmail” como acción principal; retorno y primera sincronización automáticos.
- Reenvío plegado como alternativa y opción de continuar manualmente.
- Finalización de onboarding persistida en el perfil, no en memoria del navegador.
- Centro de privacidad para sincronizar, reconectar, desconectar, exportar o eliminar la cuenta.

Métrica de salida en beta: mediana de registro a dashboard menor de tres minutos y al menos 70% de usuarios con primera fuente conectada.

### Fase 3 — Legal, privacidad y derechos: implementada técnicamente; revisión profesional obligatoria antes de cobro

- Términos, privacidad, divulgación específica de Google API y eliminación, públicos y versionados.
- Aceptación con versión, fecha y evidencia técnica seudonimizada; cambios materiales fuerzan reaceptación.
- Exportación autenticada y eliminación autoservicio. Desconectar Gmail revoca tokens sin borrar movimientos ya importados.
- La eliminación borra el workspace personal y conserva solo una prueba seudonimizada del cumplimiento.
- Identidad del proveedor, domicilio, correo de privacidad y referencia de identificación son variables obligatorias en producción.

Los textos respetan que los derechos del consumidor no se pueden renunciar y evitan cláusulas de exoneración absoluta o arbitraje exclusivo. Esto reduce riesgo, pero ningún texto impide por sí solo reclamaciones: el cumplimiento operativo, seguridad, comunicaciones y asesoría de un abogado dominicano siguen siendo necesarios.

Base normativa revisada:

- [Ley 172-13 sobre protección integral de datos personales (INDOTEL)](https://indotel.gob.do/wp-content/uploads/2025/04/Ley-172-13-Sobre-proteccion-de-Datos-personales.pdf)
- [Ley 358-05 de protección al consumidor (Pro Consumidor)](https://proconsumidor.gob.do/files/ley-358-05.pdf)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [Google Workspace API User Data and Developer Policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy)

### Fase 4 — Beta operada: siguiente fase de negocio

- Instrumentar activación, tiempo a primer movimiento, éxito por parser, duplicados, latencia de cola y retención W1/W4.
- Dashboard interno sin cuerpos de correo; alertas de worker, backlog, errores y tokens que requieren reconexión.
- Backups cifrados, restauración ensayada y retención documentada.
- Proceso de incidentes, soporte y respuesta a solicitudes de titulares.
- Cinco testers internos, luego 25 y finalmente 50, ampliando solo si precisión y soporte lo permiten.

### Fase 5 — Segundo banco y crecimiento

- Elegir el siguiente banco según demanda y muestras anonimizadas, no por calendario.
- Exigir fixtures de todos los tipos de notificación, métricas por adaptador y feature flag.
- Después de retención demostrada: presupuestos, suscripciones, CSV, reportes y planes de pago.

## Google OAuth: beta Testing y producción

El modo `Testing` sirve para 25–50 testers y admite hasta 100 correos agregados manualmente. Sin embargo, `gmail.readonly` es un alcance restringido: los testers ven advertencia y su autorización, incluido el refresh token, expira a los siete días. La UI ya representa `REAUTH_REQUIRED`, pero esto impide llamar “permanente” a la sincronización beta.

Para salir al público:

1. Usar proyectos Google Cloud separados para testing y producción.
2. Verificar dominio, marca, página principal, términos y privacidad públicos por HTTPS.
3. Declarar únicamente `https://www.googleapis.com/auth/gmail.readonly` y justificar el caso de monitoreo/reporting para beneficio del usuario.
4. Preparar video completo del consentimiento y flujo, cuenta revisora e instrucciones de prueba.
5. Solicitar verificación del alcance restringido. Como los datos pasan por el servidor, presupuestar una evaluación de seguridad CASA por un evaluador aprobado y renovación al menos anual.

Fuentes: [audiencia y límites de Testing](https://support.google.com/cloud/answer/15549945), [verificación de alcances restringidos](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) y [alcances de Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes).

## Variables y acciones que todavía debe aportar el propietario

No necesito más valores públicos de Supabase para el código. No debes entregar `SUPABASE_SECRET_KEY` al navegador y la JWKS URL se deriva de `SUPABASE_URL`.

Para autenticación de cuenta en Supabase:

- Habilitar Google Provider en Supabase con un cliente OAuth de identidad.
- Autorizar `http://localhost:5173/auth/callback` y el callback HTTPS de producción.

Para importar Gmail se necesita un cliente web server-side, idealmente en otro proyecto de Google Cloud:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/v1/oauth/google/callback`
- Activar Gmail API y agregar los correos de testers a la audiencia `Testing`.
- Registrar exactamente el redirect URI anterior en Google Cloud.

Para producción también son obligatorios:

- `INGESTION_ENCRYPTION_KEY`, `LEGAL_AUDIT_SALT`
- `LEGAL_PROVIDER_NAME`, `LEGAL_PROVIDER_ID`, `LEGAL_CONTACT_EMAIL`, `LEGAL_CONTACT_ADDRESS`
- `APP_URL`, `API_PUBLIC_URL` y `CORS_ORIGIN` con HTTPS/dominios propios
- `DATABASE_URL` y `DIRECT_URL`
- Para reenvío: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_RECEIVING_DOMAIN`

Cambiar una URL de ngrok no obliga a rotar la API key de Resend. El signing secret cambia solo si se crea/reemplaza el endpoint de webhook; entonces se actualiza `RESEND_WEBHOOK_SECRET` y se reinicia API/worker.

## Gate de lanzamiento

- [x] Código multi-tenant, Gmail, reenvío, adaptadores, legal y autoservicio.
- [x] Migraciones desde base vacía y pruebas automatizadas locales.
- [x] Build de API/web y lint sin errores bloqueantes.
- [ ] Rotar todas las credenciales compartidas durante desarrollo o chat.
- [ ] Completar identidad legal real y revisión con abogado dominicano.
- [x] Historial Prisma remoto reconciliado y seis migraciones desplegadas en Supabase.
- [ ] Confirmar política de backups de Supabase y ensayar una restauración antes de invitar testers.
- [ ] Google Cloud Testing configurado y prueba real de conexión/reconexión a siete días.
- [ ] Resend/ngrok probado extremo a extremo y purga de fallidos observada.
- [ ] Prueba de restauración, monitoreo e incidente antes de ampliar la beta.
