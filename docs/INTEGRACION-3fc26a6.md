# Integración de 3fc26a6 — clasificación previa

Comparación basada en el diff entregado por el usuario y los archivos locales, antes de editar código.

| Archivo de Fabricio | Clasificación | Decisión |
|---|---|---|
| backend/package.json | excluir | Solo añade ejecución del seed excluido. |
| backend/prisma/seed.ts | excluir | Seed destructivo; conservar fixtures aislados PGC. |
| migrations/20261116212549_init/migration.sql | excluir | Duplica la inicial 20261112000000_init de PGC. |
| migrations/20261117010533_add_version_base_to_propuesta/migration.sql | ya existe en PGC | Cubierto por 20261114000000_propuesta_version_base; no duplicar columna. |
| migrations/migration_lock.toml | ya existe en PGC | PostgreSQL ya configurado. |
| backend/prisma/schema.prisma | ya existe en PGC | versionBase nullable ya presente. |
| backend/src/controllers/auth.controller.ts | ya existe en PGC | Registro asigna ANALISTA en servidor. |
| backend/src/controllers/documento.controller.ts | requiere adaptar | Incorporar permisos y versionEsperada; mover lectura, permisos, comprobación y escritura a transacción serializable. |
| backend/src/controllers/propuesta.controller.ts | requiere adaptar | Conservar PGC: versionBase obligatoria, rechazo de base null al aprobar, decisiones condicionales y aislamiento serializable. Excluir asignación automática de base y regresiones. |
| backend/src/middlewares/auth.middleware.ts | incremental y aprovechable | JWT inválido/vencido devuelve 401; errores de DB no se confunden con sesión inválida. |
| backend/src/routes/documento.routes.ts | incremental y aprovechable | Restaurar solo REVISOR/ADMIN. |
| frontend/src/services/api.ts | requiere adaptar | Añadir versionEsperada a edición/restauración, conservar versionBase requerida. |
| frontend/src/types/index.ts | ya existe en PGC | versionBase nullable ya tipada. |
| frontend/package-lock.json | excluir | Sin cambio funcional requerido. |

Fabricio añadió comprobación opcional versionEsperada y comparación versionBase, no un protocolo completo contra carreras: una transacción por defecto o comparar antes de escribir no basta. PGC ya protege decisiones de propuestas; se extenderá el mismo aislamiento a edición/restauración.

Decisiones: versionEsperada se mantiene opcional para compatibilidad; el frontend siempre la envía. Clientes que la omitan no detectan una pantalla antigua, aunque cada escritura concurrente queda serializada o devuelve 409. Pendiente decidir si hacerla obligatoria en una próxima versión. Se integran permisos expresos del commit: borrador editable por autor/ADMIN, publicación por REVISOR/ADMIN, restauración por REVISOR/ADMIN. No se inventan transiciones para EN_REVISION/OBSOLETO. Aprobar una propuesta no publica automáticamente el documento.

Endpoints nuevos pendientes de negocio: editar/retirar propuestas, devolver para corrección, administrar cuentas/roles y recuperar contraseña. No forman parte de 3fc26a6.

## Resultado de validación (17/11/2026)

- Build backend (tsc) y frontend (tsc -b + Vite): correctos.
- Instalación limpia: pgc_integration_fresh_20261117, ambas migraciones PGC aplicadas y segunda ejecución sin pendientes.
- Actualización: pgc_integration_upgrade_20261117, inicial PGC registrada, datos antiguos insertados antes del ALTER; propuesta preservada con version_base NULL. Segunda ejecución sin pendientes.
- Tests: permisos.integration.cjs, concurrencia.integration.cjs y flujo-demo.integration.cjs correctos. Los dos últimos se ejecutan con --test-concurrency=1 por compartir fixtures de demo.
- Carreras edit/edit, edit/restore y edit/approve: una respuesta 200 y otra 409, una sola versión nueva. Versión esperada antigua: 409. Cadena en versionEsperada: 400. Token inválido: 401. Borrador ajeno/publicación de analista/restauración de analista: 403.
- Propuestas legacy: aprobar 409, rechazar 200, sin inventar versión base.
- API compilada reiniciada en 4014; frontend existente conservado en 5181; módulos HTTP 200. PostgreSQL en 55434. Sin navegador ni nuevos comandos Git durante la integración.

Rutas existentes utilizables: registro/login/me; documentos CRUD, versiones, diff y restauración (solo REVISOR/ADMIN); propuestas listar/crear/aprobar/rechazar; categorías/etiquetas listar/crear; health. PUT documento y POST restaurar aceptan versionEsperada entero positivo opcional. La UI siempre envía la versión del documento mostrado.

No se importaron archivos completos del frontend de Fabricio ni la segunda migración inicial, el seed o su registro en package.json. No se añadieron migraciones: version_base ya estaba cubierta en PGC.
