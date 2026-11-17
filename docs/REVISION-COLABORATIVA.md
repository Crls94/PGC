# Revisión colaborativa mínima

## Diagnóstico previo

Antes de ampliar se ejecutaron flujo-demo.integration.cjs y concurrencia.integration.cjs contra la API: REVISOR pudo aprobar una propuesta pendiente vigente; ANALISTA recibió 403 y propuestas con base antigua/desconocida recibieron 409. La base de demo no conservaba propuestas para identificar el intento manual reportado. Por tanto no se atribuye una causa concreta sin evidencia. Editar propuestas no existía en la API. La interfaz ocultaba acciones por rol y deshabilitaba por estado/base con explicaciones incompletas; ahora muestra estado y motivo.

## Contrato añadido

- PUT /api/propuestas/:id/devolver: REVISOR/ADMIN, solo PENDIENTE, comentarioRevision string no vacío obligatorio. Pasa a DEVUELTA y conserva documento/versiones.
- PUT /api/propuestas/:id/reenviar: solo autor, solo DEVUELTA. contenidoPropuesto y mensaje no vacíos, versionBase entero positivo igual a la vigente. Si cambió respecto a la base anterior, exige baseRevisada=true. Mantiene id y observación, vuelve a PENDIENTE. No modifica documento/versiones.
- Transiciones y escrituras condicionales en transacciones serializables; conflictos 409. Rechazo directo existente conservado. Aprobar solo PENDIENTE con base conocida vigente.
- La confirmación expresa registra intención; el servidor puede exigir el indicador, pero no comprobar que una persona leyó el contenido.

Migración 20261117020000_propuesta_devuelta: solo añade DEVUELTA a EstadoPropuesta, sin alterar datos ni migraciones anteriores.

## Demo

1. Analista: crear documento y enviar propuesta desde su detalle.
2. Revisor: Propuestas, PENDIENTE, Actualizar bandeja, Comparar propuesta. Aprobar directamente y abrir historial para ver la nueva versión.
3. Otra propuesta: Rechazar; contenido e historial quedan iguales.
4. Otra propuesta: escribir observación y Devolver para corrección.
5. Analista: Propuestas, DEVUELTA, Actualizar bandeja, Comparar propuesta, Corregir y reenviar. También disponible en el detalle del documento.
6. Si cambió el documento, leer contenido vigente y marcar confirmación de nueva base; el texto corregido no se reemplaza automáticamente.
7. Revisor: PENDIENTE, actualizar, comparar y aprobar; verificar una sola nueva versión.

Fuera de alcance: edición de PENDIENTE, retiro, notificaciones y administración de cuentas.

## Validación

Builds backend y frontend correctos. Pruebas permisos.integration.cjs, flujo-demo.integration.cjs, concurrencia.integration.cjs y revision-colaborativa.integration.cjs correctas. Esta última usa documento desechable, valida REVISOR y ADMIN, observación obligatoria, autoría, estados, rebase confirmado, protección legacy y conservación de documento/historial hasta aprobar. API y módulos Vite comprobados por HTTP; sin navegador ni Git.
