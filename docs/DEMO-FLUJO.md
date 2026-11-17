# Demo local: creación, propuesta, revisión e historial

El frontend usa la API real en `http://127.0.0.1:4014/api`. La demo usa exclusivamente
la base `pgc_demo_recorrido_20261113` de PostgreSQL local en el puerto 55433.
No se cambian los permisos públicos: el registro siempre crea ANALISTA y las rutas
de decisión siguen exigiendo REVISOR o ADMIN. La cuenta revisora se provisiona
directamente en la base de prueba mediante Prisma, con contraseña aleatoria y hash bcrypt.

## Arranque en PowerShell

Ejecutar desde la raíz del repositorio. Requiere Node, dependencias instaladas y
PostgreSQL de prueba escuchando en `127.0.0.1:55433`. En esta máquina la instancia
temporal existente tiene sus archivos en `%TEMP%/pgc-permissions-20261113/data`.
Si está detenida, iniciarla con:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D (Join-Path $env:TEMP 'pgc-permissions-20261113/data') -l (Join-Path $env:TEMP 'pgc-permissions-20261113/server.log') -o '-p 55433 -h 127.0.0.1' -w start
```

Esa instancia de pruebas tiene autenticación local trust. Para otro PostgreSQL,
adaptar DEMO_DATABASE_URL en la terminal con sus credenciales; no guardarlas en Git.
El preparador exige un nombre `pgc_demo_*` y host local, crea solo esa base si falta
y aplica las migraciones allí. Nunca toma DATABASE_URL de la configuración habitual.

Terminal 1:

```powershell
cd backend
# Solo si faltan dependencias: npm.cmd ci
npm.cmd run prisma:generate
$env:DEMO_DATABASE_URL='postgresql://postgres@127.0.0.1:55433/pgc_demo_recorrido_20261113?schema=public'
node scripts/demo.cjs prepare
npm.cmd run build
.\scripts\start-demo.ps1
```

Terminal 2, desde la raíz:

```powershell
cd backend
node scripts/demo.cjs seed
$demo = Get-Content (Join-Path $env:TEMP 'pgc-demo-local.json') -Raw | ConvertFrom-Json
$demo | Select-Object email,password,reviewerEmail,reviewerPassword
```

`seed` comprueba la identidad de la API mediante un JWT de demo y una cuenta marcador
que solo existe en la base separada, antes de escribir por HTTP. Reutiliza registro y
creación de documentos existentes. Es repetible: conserva las cuentas y el documento
de ejemplo, y crea la categoría ficticia `Demo · Operaciones` si no existe.
El archivo temporal conserva credenciales y secreto de demo; no copiarlo al repositorio.

Terminal 3, desde la raíz:

```powershell
cd frontend
# Solo si faltan dependencias: npm.cmd ci
$env:VITE_API_URL='http://127.0.0.1:4014/api'
npm.cmd run dev -- --port 5182 --strictPort
```

Abrir **http://127.0.0.1:5182/**. Si un puerto ya está ocupado por la demo de esta
sesión, reutilizarla. Para reiniciar, detener únicamente su terminal con Ctrl+C.
Si Windows devuelve `spawn EPERM`, el proceso necesita ejecutarse fuera del sandbox.

## Recorrido manual

1. Entrar con `email` y `password` del archivo temporal (ANALISTA).
2. Pulsar **Crear documento**. Usar un título único, contenido `FARO FLUJO V1`
   y categoría `Demo · Operaciones`. Guardar abre el detalle. Comprobar contenido,
   categoría y **Versión 1** en Historial; expandirla para leer su contenido.
3. En **Proponer cambio**, sustituir el contenido por `FARO FLUJO V2`, escribir
   `Actualizar instrucciones ficticias` como motivo y enviar. Debe aparecer
   PENDIENTE con base 1. El contenido vigente y el historial siguen en V1.
4. Enviar una segunda propuesta con base 1 y texto `CAMBIO ANTIGUO` para comprobar
   después el conflicto de versión. Copiar la URL del documento.
5. Cerrar sesión y entrar con `reviewerEmail` y `reviewerPassword`.
6. Abrir **Revisar propuestas**. Elegir **Comparar propuesta** para la de V2.
   Comprobar texto vigente, propuesto y motivo; aprobar.
7. Volver al documento mediante la URL guardada. El contenido debe ser
   `FARO FLUJO V2` y el historial debe contener versiones 2 y 1, ambas legibles.
8. En la bandeja, comparar `CAMBIO ANTIGUO`: se muestra advertencia de propuesta
   desactualizada y aprobación deshabilitada. La API también rechaza la aprobación
   con HTTP 409 aunque se intente fuera de la interfaz.
9. Volver a entrar como analista, abrir el documento y enviar una propuesta basada
   en V2 con texto `NO APLICAR` y motivo `Prueba de rechazo`.
10. Como revisor, compararla y rechazar con comentario. Abrir el documento:
    su contenido sigue siendo V2 y su historial contiene exactamente versiones 1 y 2.
11. Como analista no aparece la bandeja. Acceder manualmente a `#/revision` indica
    que se requiere REVISOR o ADMIN; la API devuelve 403 ante decisiones del analista.

Para preparar un nuevo borrador tras un conflicto: **Actualizar documento e historial**
y después **Usar contenido vigente como nuevo borrador**. La primera acción conserva
el texto local y su base; la segunda reemplaza el borrador explícitamente.

## Contrato y protección frente a conflictos

`POST /propuestas` requiere ahora `versionBase`, entero positivo, además de
`documentoId`, `contenidoPropuesto` y `mensaje`. Una base ya antigua al enviar
devuelve 409. Una aprobación vuelve a comprobar la base dentro de una transacción
serializable junto con la decisión, la actualización del documento y la nueva versión.
Las propuestas anteriores a la migración tienen base nula y no se pueden aprobar:
deben reenviarse desde el documento vigente. Pueden rechazarse normalmente.

Las decisiones condicionan la escritura a PENDIENTE. Ante una carrera, una operación
gana y la otra recibe 409; no se reintenta silenciosamente una aprobación obsoleta.
La comparación muestra texto vigente y propuesto en paralelo, sin interpretar HTML.

## Validación automática

Con la API iniciada y `seed` ejecutado:

```powershell
cd backend
node --test tests/flujo-demo.integration.cjs
```

La prueba verifica primero que la API usa la misma base y secreto de demo. Crea datos
ficticios adicionales y elimina únicamente su propio documento al finalizar para no llenar la bandeja manual. Comprueba V1, categoría,
contenido intacto mientras hay propuestas pendientes, 403 al analista, aprobación V2,
rechazo sin cambios (comparando documento e historial completos), bases antiguas al
enviar y aprobar, base nula, doble aprobación, dos propuestas concurrentes, aprobación
y rechazo simultáneos de la misma propuesta, acceso anónimo 401 y búsqueda vacía.

Resultado local: compilaciones de backend y frontend correctas; prueba de integración
completa aprobada (1 prueba, 0 fallos). El resultado de la comprobación visual se
informa por separado en la entrega; el éxito de la API no acredita el recorrido visual.

## Alcance

No se añadió publicación ni edición directa para eludir revisión. Crear conserva
el estado BORRADOR del contrato existente; aprobar actualiza el contenido, no publica
el documento. La matriz completa de edición/autoría/visibilidad, gestión de usuarios,
paginación y publicación continúan fuera de esta demo. Todo el trabajo permanece local.
