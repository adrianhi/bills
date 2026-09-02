# Reglas personalizadas

Las reglas pertenecen a un workspace. El gestor existente en Ajustes permite
crear, editar, desactivar y eliminar reglas sin modificar clasificaciones pasadas.

## Coincidencia

`MERCHANT` compara una identidad emitida por el servidor, independiente del alias.
Uber Viajes (`brand:uber-rides`) y Uber Eats (`brand:uber-eats`) son distintos.
Las marcas sin identidad revisada usan la descripción original normalizada;
las reglas genéricas integradas no agrupan marcas distintas bajo una identidad.

`CONTAINS` compara fragmentos literales sobre la descripción original y el nombre
base del sistema. Normaliza NFD, acentos, mayúsculas y espacios. Nunca ejecuta regex
del usuario ni encadena alias. Exacta gana a subcadena; después se conserva la
prioridad heredada y se desempata por longitud, creación e ID.

La categoría y el alias conservan procedencia separada: MANUAL, RULE, SYSTEM o
LEGACY_UNKNOWN. Los registros anteriores no se etiquetan ficticiamente como
automáticos. Las ediciones manuales se protegen también ante duplicados y replay.

## Aplicación histórica

Guardar y aplicar son operaciones independientes. POST `/api/v1/rules/:id/applications/preview`
encola una vista previa con fechas opcionales y `includeUnknown=false` por defecto.
GET `/api/v1/rules/applications` recupera las últimas diez operaciones; GET con ID
devuelve una muestra limitada. POST `.../:applicationId/confirm` confirma una vista
lista; POST `.../:applicationId/retry` reintenta un fallo recuperable.

El worker genera propuestas en páginas de 250 filas, con un corte temporal y
versiones de reglas. Al confirmar comprueba que las reglas no cambiaron. El worker
revalida visibilidad, procedencia y versión de cada movimiento. Las propuestas
persistidas antes/después y su resultado son la auditoría; borrar reglas no la borra.
Cada lote aplica movimientos, auditoría y progreso dentro de una sola transacción.
Los leases duran 120 segundos; los lotes tienen timeout de 60 segundos.
Tras tres intentos fallidos se requiere reintento explícito. Los elementos completados
no vuelven a aplicarse. Hay una operación activa por workspace.

Los ingresos están excluidos. Cambiar categorías recalcula desgloses y presupuestos,
pero no cambia importes, estados ni límites. Los archivos ya descargados no se alteran.

## Arquitectura y despliegue

Dominio puro en categorización; casos de uso dependen de puertos. Las escrituras de
movimientos son responsabilidad de transactions. La composición vive en app-container.
La UI usa entities/category-rule y features/manage-rules; la página coordina con
edición y Ajustes mediante callbacks. No hay dependencias entre features hermanas.

Aplicar `prisma migrate deploy` primero en desarrollo. La migración aborta ante
colisiones de patrones normalizados: resolverlas explícitamente antes de reintentar.
No elimina reglas ni reclasifica movimientos. Tablas nuevas tienen RLS y revocación
de acceso directo a anon/authenticated, igual que el resto de datos privados.

El runner de categorización arranca con `PROCESS_ROLE=all` o con el proceso worker,
independientemente de Gmail. Antes de promover, verificar una vista previa y su
aplicación de prueba en un workspace de QA; confirmar que se recupera al cerrar el
modal y que no quedan trabajos atascados. No habilitar el flujo sin worker operativo.

Validación: `npm run check:architecture`, `npm run verify`, `npm run test:integration`.
La última usa exclusivamente PostgreSQL de pruebas; nunca apuntarla a desarrollo
ni producción porque la preparación de integración elimina datos.

La comprobación manual `apps/api/tests/manual-category-rules.ts` requiere
`BILLS_RULES_SMOKE=1` y un worker de desarrollo activo. Crea un workspace de QA sin
miembros, verifica 255 cambios en dos lotes y elimina exclusivamente ese workspace
y sus registros sintéticos al terminar. No sustituye la suite aislada de integración.
