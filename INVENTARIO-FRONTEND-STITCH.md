# PGC — Inventario del frontend para Google Stitch

Inventario obtenido de la lectura del frontend local. No representa validación visual en navegador. IDs estables propuestos para documentación y rediseño, no IDs HTML existentes. En elementos repetidos, agregar el identificador del documento, versión o propuesta.

Datos ficticios para diseños: Ana Torres (ANALISTA), Luis Medina (REVISOR), Guía de operaciones (documento), Operaciones (categoría), procedimiento (etiqueta). No incluir credenciales.

## Componentes y rutas

| Vista | Ruta | Componentes / archivo |
|---|---|---|
| Acceso y registro | Sin sesión, independientemente de ruta solicitada | Demo: frontend/src/Demo.tsx; Registration: frontend/src/Extras.tsx |
| Biblioteca | #/buscar; también rutas desconocidas con sesión | Demo |
| Crear documento | #/crear | CreateDocument: frontend/src/Workflow.tsx; TagSelector: frontend/src/Extras.tsx |
| Detalle | #/documentos/{id} | DocumentWorkflow: Workflow.tsx; DocumentActions: Extras.tsx; Correction: frontend/src/Correction.tsx |
| Catálogos | #/catalogos | Catalogs: Extras.tsx |
| Bandeja y comparación | #/revision | ReviewInbox: Workflow.tsx; Correction |
| Conexión global | Todas | Health: Extras.tsx |

Entrada: frontend/src/main.tsx monta Demo con React.StrictMode. Estilos: frontend/src/styles.css.
Roles: ANALISTA, REVISOR, ADMIN. Documentos: BORRADOR, EN_REVISION, PUBLICADO, OBSOLETO. Propuestas: PENDIENTE, DEVUELTA, APROBADA, RECHAZADA.
Autenticado significa cualquiera de los tres roles. Las condiciones siguientes describen el frontend; el backend conserva la validación de permisos.

## Global y conexión — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-GLOBAL-001 | Todas | c. conocimiento/ | Enlace de marca | Navega a biblioteca | Todos | Demo |
| PGC-GLOBAL-002 | Todas | {nombre} · {rol} | Texto | Identifica sesión | Autenticado | Demo |
| PGC-GLOBAL-003 | Todas | Cerrar sesión | Botón | Elimina token, limpia sesión y navega a login | Autenticado | Demo |
| PGC-GLOBAL-004 | Todas | Buscar | Enlace | Abre biblioteca | Autenticado | Demo |
| PGC-GLOBAL-005 | Todas | Crear documento | Enlace | Abre creación | Autenticado | Demo |
| PGC-GLOBAL-006 | Todas | Categor?as y etiquetas | Enlace | Abre catálogos; texto con codificación incorrecta | Autenticado | Demo |
| PGC-GLOBAL-007 | Todas | Propuestas | Enlace | Abre bandeja | Autenticado | Demo |
| PGC-GLOBAL-008 | Todas | Plataforma colaborativa de gestión del conocimiento · Prueba de concepto local | Pie | Identidad de producto | Todos | Demo |
| PGC-GLOBAL-009 | Inicio | Recuperando sesión… | Estado role=status | Recupera sesión inicial | Durante consulta inicial | Demo |
| PGC-GLOBAL-010 | Todas | {mensaje de error} | Alerta role=alert | Error de API o conexión | Cuando existe error | Demo |
| PGC-GLOBAL-011 | Todas | Tu sesión ha caducado. Inicia sesión de nuevo. | Alerta | Explica cierre por HTTP 401 | Tras fallo de autenticación gestionado por failure | Demo |
| PGC-GLOBAL-012 | Todas | No se pudo contactar con el servidor | Error alternativo | Error sin detalle | Según fallo | Demo |
| PGC-HEALTH-001 | Todas | Comprobando conexión… | Estado | Estado inicial health | Al montar | Health |
| PGC-HEALTH-002 | Todas | API disponible | Estado | Health status=ok | Éxito | Health |
| PGC-HEALTH-003 | Todas | API sin confirmar | Estado | Respuesta sin status=ok | Respuesta no confirmada | Health |
| PGC-HEALTH-004 | Todas | No se puede conectar con la API | Estado de error | Health falla | Error | Health |
| PGC-HEALTH-005 | Todas | Reintentar conexión | Botón secundario | Consulta health nuevamente | Todos; deshabilitado mientras consulta | Health |

Al reintentar health el estado previo no se sustituye necesariamente por Comprobando conexión.

## Acceso y registro — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-AUTH-001 | Acceso | ESPACIO DE CONOCIMIENTO | Antetítulo | Contextualiza acceso | Sin sesión, recuperación finalizada | Demo |
| PGC-AUTH-002 | Acceso | Inicio de sesión | Título | Encabeza pantalla | Sin sesión | Demo |
| PGC-AUTH-003 | Acceso a documento | Inicia sesión para abrir este documento. | Ayuda | Explica autenticación | Sin sesión en ruta de detalle | Demo |
| PGC-AUTH-004 | Acceso | Correo electrónico | Email obligatorio | Captura correo; autocomplete=username | Sin sesión | Demo |
| PGC-AUTH-005 | Acceso | Contraseña | Password obligatorio | Captura contraseña; autocomplete=current-password | Sin sesión | Demo |
| PGC-AUTH-006 | Acceso | Iniciar sesión / Entrando… | Submit | Autentica; conserva destino documento | Deshabilitado durante operación | Demo |
| PGC-REGISTER-001 | Acceso | Registrar una cuenta de analista | Details/summary | Despliega registro | Sin sesión | Registration |
| PGC-REGISTER-002 | Registro | Nombre | Texto obligatorio | Nombre de cuenta | Desplegable abierto | Registration |
| PGC-REGISTER-003 | Registro | Correo | Email obligatorio | Correo nuevo | Desplegable abierto | Registration |
| PGC-REGISTER-004 | Registro | Contraseña | Password obligatorio | Nueva contraseña; autocomplete=new-password | Desplegable abierto | Registration |
| PGC-REGISTER-005 | Registro | Registrar / Registrando… | Submit | Crea ANALISTA; no inicia sesión automáticamente | Deshabilitado durante registro | Registration |
| PGC-REGISTER-006 | Registro | Cuenta ANALISTA creada. Ya puedes iniciar sesión. | Confirmación role=status | Confirma y limpia formulario | Éxito | Registration |
| PGC-REGISTER-007 | Registro | Error devuelto por API | Alerta global | Duplicado, validación o conexión | Error | Registration → Demo |

No hay selector de rol, confirmación de contraseña, recuperar contraseña ni mostrar/ocultar contraseña.

## Biblioteca y filtros — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-SEARCH-001 | Biblioteca | BIBLIOTECA DEL EQUIPO | Antetítulo | Contexto | Autenticado | Demo |
| PGC-SEARCH-002 | Biblioteca | Buscar documentos | Título | Encabeza búsqueda | Autenticado | Demo |
| PGC-SEARCH-003 | Biblioteca | Buscar por título o contenido | Search | Búsqueda textual | Autenticado | Demo |
| PGC-SEARCH-004 | Biblioteca | Categoría | Select | Todas o categoría | Deshabilitado al cargar categorías | Demo |
| PGC-SEARCH-005 | Biblioteca | Estado | Select | Todos, Borrador, En revisión, Publicado, Obsoleto | Autenticado | Demo |
| PGC-SEARCH-006 | Biblioteca | Buscar / Buscando… | Submit | Aplica búsqueda y filtros | Deshabilitado durante busy | Demo |
| PGC-SEARCH-007 | Biblioteca | Cargando categorías… | Estado role=status | Consulta catálogo | Durante carga | Demo |
| PGC-SEARCH-008 | Biblioteca | Buscando documentos… | Estado role=status | Consulta resultados | Durante busy | Demo |
| PGC-SEARCH-009 | Biblioteca | No se encontraron documentos. | Vacío | Consulta sin resultados | Lista vacía recibida | Demo |
| PGC-SEARCH-010 | Biblioteca | {N} documento(s) encontrado(s). | Contador role=status | Resume resultados | Lista con resultados | Demo |
| PGC-SEARCH-011 | Biblioteca | {título} | Enlace repetido | Abre detalle | Por resultado | Demo |
| PGC-SEARCH-012 | Biblioteca | {estado} | Texto repetido | Estado del documento | Por resultado | Demo |

No carga lista automáticamente al abrir. Requiere Buscar. Sin paginación, limpiar filtros, ordenar ni filtro por etiquetas.

## Crear documento — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-CREATE-001 | Crear | Crear documento | Título | Encabeza formulario | Autenticado | CreateDocument |
| PGC-CREATE-002 | Crear | Se creará como borrador con su versión 1. | Ayuda | Explica resultado | Autenticado | CreateDocument |
| PGC-CREATE-003 | Crear | Título | Texto obligatorio, máximo 200 | Título inicial | Autenticado | CreateDocument |
| PGC-CREATE-004 | Crear | Contenido | Textarea obligatorio, 8 filas | Contenido inicial | Autenticado | CreateDocument |
| PGC-CREATE-005 | Crear | Categoría | Select | Sin categoría o categoría | Deshabilitado en carga/error inicial | CreateDocument |
| PGC-CREATE-006 | Crear | Etiquetas existentes | Select múltiple | Selecciona etiquetas | Deshabilitado al cargar | TagSelector |
| PGC-CREATE-007 | Crear | Otras etiquetas separadas por comas | Texto | Nuevas etiquetas normalizadas/deduplicadas | Autenticado | TagSelector + CreateDocument |
| PGC-CREATE-008 | Crear | Documentos relacionados | Select múltiple | Selecciona relaciones | Deshabilitado durante carga o lista vacía | CreateDocument |
| PGC-CREATE-009 | Crear | Guardar documento / Guardando… | Submit | Crea y navega a detalle | Deshabilitado durante carga, guardado o error inicial | CreateDocument |
| PGC-CREATE-010 | Crear | Cargando categorías… | Estado role=status | Carga conjunta de categorías y documentos | Carga inicial | CreateDocument |
| PGC-CREATE-011 | Crear | No se pudieron cargar las categorías. Vuelve a esta pantalla para reintentar. | Alerta role=alert | Error de carga conjunta | Fallo de categorías o documentos | CreateDocument |
| PGC-CREATE-012 | Crear | No hay categorías disponibles. Puedes crear el documento sin categoría. | Vacío | Sin categorías | Carga exitosa vacía | CreateDocument |
| PGC-CREATE-013 | Crear | Aún no hay documentos para relacionar. | Vacío | Sin relacionados posibles | Carga finalizada vacía | CreateDocument |
| PGC-CREATE-014 | Crear | Cargando etiquetas… | Carga | Consulta etiquetas | Durante carga | TagSelector |
| PGC-CREATE-015 | Crear | No hay etiquetas existentes. | Vacío | Sin etiquetas | Carga finalizada sin etiquetas | TagSelector |
| PGC-CREATE-016 | Crear | Completa el título y el contenido. | Error global | Valida texto no vacío con trim | Envío inválido | CreateDocument → Demo |

Sin selector de estado, adjuntos, carga de archivos ni editor enriquecido.

## Detalle — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-DOC-001 | Detalle | ← Volver a la búsqueda | Enlace | Regresa a biblioteca | Autenticado | Demo |
| PGC-DOC-002 | Detalle | Cargando documento… | Estado role=status | Carga detalle | Durante carga | Demo |
| PGC-DOC-003 | Detalle | {título} | Título | Identifica documento | Documento cargado | DocumentWorkflow |
| PGC-DOC-004 | Detalle | {estado} · {autor} · {categoría o Sin categoría} | Metadatos | Contexto | Documento cargado | DocumentWorkflow |
| PGC-DOC-005 | Detalle | Etiquetas: {lista} | Texto | Muestra etiquetas | Si existen | DocumentWorkflow |
| PGC-DOC-006 | Detalle | Relacionados: {títulos} | Enlaces | Abre relacionados | Si existen | DocumentWorkflow |
| PGC-DOC-007 | Detalle | Contenido vigente | Encabezado y texto | Contenido oficial con saltos de línea | Documento cargado | DocumentWorkflow |
| PGC-DOC-008 | Detalle | Actualizar documento e historial | Botón secundario | Recarga documento/versiones/propuestas conservando borrador | Deshabilitado durante busy | DocumentWorkflow |
| PGC-DOC-009 | Detalle | Documento e historial actualizados. Tu borrador conserva su texto y versión de origen. | Confirmación role=status | Explica conservación | Tras actualizar | DocumentWorkflow |

## Edición, restauración y eliminación — encontrado

Edición visible cuando: (rol distinto de ANALISTA o documento distinto de PUBLICADO) Y (documento distinto de BORRADOR o usuario autor o ADMIN). Por tanto REVISOR no edita BORRADOR ajeno. En otros estados la condición no exige autoría.

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-EDIT-001 | Detalle | Editar documento | Details/summary | Abre edición | Regla de edición anterior | DocumentActions |
| PGC-EDIT-002 | Editar | Título | Texto obligatorio | Modifica título | Edición visible | DocumentActions |
| PGC-EDIT-003 | Editar | Contenido | Textarea obligatorio | Modifica contenido | Edición visible | DocumentActions |
| PGC-EDIT-004 | Editar | Motivo | Texto obligatorio | Mensaje de cambio | Edición visible | DocumentActions |
| PGC-EDIT-005 | Editar | Guardar nueva versión | Submit | Envía versionEsperada y crea versión | Deshabilitado durante operación | DocumentActions |
| PGC-EDIT-006 | Detalle | {error}. Usa ?Actualizar documento e historial? antes de continuar. | Alerta role=alert | Explica error/conflicto; signos incorrectos en código | Error de acción | DocumentActions |
| PGC-RESTORE-001 | Detalle | Restaurar una versión | Details/summary | Lista acciones de restauración | REVISOR/ADMIN | DocumentActions |
| PGC-RESTORE-002 | Restaurar | Restaurar versión {N} | Botón repetido | Restaura con versionEsperada | REVISOR/ADMIN; deshabilitado durante operación | DocumentActions |
| PGC-RESTORE-003 | Restaurar | ¿Restaurar versión {N}? Se creará una nueva versión. | window.confirm nativo | Aceptar/cancelar restauración | Al pulsar restaurar | DocumentActions |
| PGC-DELETE-001 | Detalle | Eliminar documento | Botón secundario | Elimina documento | Autor o ADMIN; deshabilitado durante operación | DocumentActions |
| PGC-DELETE-002 | Eliminar | ¿Eliminar definitivamente «{título}» y su historial? | window.confirm nativo | Aceptar/cancelar eliminación | Al pulsar eliminar | DocumentActions |

No hay modales personalizados. No hay edición de categoría, estado, etiquetas o relaciones. No se explica localmente por qué una acción de documento está oculta por permiso.

## Historial y diff — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-HISTORY-001 | Detalle | Historial | Encabezado | Agrupa versiones | Autenticado | DocumentWorkflow |
| PGC-HISTORY-002 | Historial | Cargando historial… | Estado role=status | Espera versiones y propuestas | Carga conjunta incompleta | DocumentWorkflow |
| PGC-HISTORY-003 | Historial | No hay versiones registradas. | Vacío | Sin versiones | Carga exitosa vacía | DocumentWorkflow |
| PGC-HISTORY-004 | Historial | Versión {N} · {mensajeCambio} | Desplegable repetido | Abre versión | Por versión | DocumentWorkflow |
| PGC-HISTORY-005 | Versión | {autor} · {fecha y hora} | Metadatos | Autor y fecha local es-PE | Versión expandida | DocumentWorkflow |
| PGC-HISTORY-006 | Versión | {contenido guardado} | Pre | Lectura histórica | Versión expandida | DocumentWorkflow |
| PGC-DIFF-001 | Historial | Comparar versiones | Encabezado | Formulario de comparación | Al menos dos versiones | DocumentWorkflow |
| PGC-DIFF-002 | Diff | Versión original | Select | Selecciona origen | Al menos dos versiones | DocumentWorkflow |
| PGC-DIFF-003 | Diff | Versión comparada | Select | Selecciona destino | Al menos dos versiones | DocumentWorkflow |
| PGC-DIFF-004 | Diff | Ver diferencias / Comparando… | Submit | Consulta diff oficial | Deshabilitado al consultar, sin selección o versiones iguales | DocumentWorkflow |
| PGC-DIFF-005 | Resultado | Versión {original} → {comparada} | Encabezado | Identifica comparación | Resultado recibido | DocumentWorkflow |
| PGC-DIFF-006 | Resultado | {fragmentos} | Pre y spans | Agregados verdes, eliminados rojos, conservados neutros | Resultado recibido | DocumentWorkflow |

Sin leyenda visible ni mensaje explícito sin diferencias.

## Propuestas en documento y nueva propuesta — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-DOC-PROP-001 | Detalle | Propuestas de este documento | Encabezado | Agrupa propuestas | Autenticado | DocumentWorkflow |
| PGC-DOC-PROP-002 | Detalle | No hay propuestas. | Vacío | Sin propuestas | Carga exitosa vacía | DocumentWorkflow |
| PGC-DOC-PROP-003 | Detalle | {estado} · Base: {N o desconocida} · {motivo} · {autor} | Fila | Resume propuesta | Por propuesta | DocumentWorkflow |
| PGC-DOC-PROP-004 | Detalle | Revisó: {nombre} | Metadato | Identifica revisor | Si existe | DocumentWorkflow |
| PGC-DOC-PROP-005 | Detalle | Comentario: {observación} | Texto | Observación/decisión | Si existe | DocumentWorkflow |
| PGC-PROPOSE-001 | Detalle | Proponer cambio | Encabezado | Nueva propuesta | Todos los roles autenticados | DocumentWorkflow |
| PGC-PROPOSE-002 | Proponer | Basado en la versión {N}. La revisión debe aprobarlo antes de cambiar el contenido vigente. | Ayuda | Explica base y efecto | Autenticado | DocumentWorkflow |
| PGC-PROPOSE-003 | Proponer | Contenido propuesto | Textarea obligatorio, 8 filas | Inicia con contenido vigente | Autenticado | DocumentWorkflow |
| PGC-PROPOSE-004 | Proponer | Motivo del cambio | Textarea obligatorio, 2 filas | Justifica cambio | Autenticado | DocumentWorkflow |
| PGC-PROPOSE-005 | Proponer | Enviar propuesta / Enviando… | Submit | Envía contenido, motivo, versionBase | Deshabilitado al operar, sin carga completa o base | DocumentWorkflow |
| PGC-PROPOSE-006 | Proponer | Usar contenido vigente como nuevo borrador | Botón secundario | Reemplaza texto y base explícitamente | Deshabilitado al operar o sin carga completa | DocumentWorkflow |
| PGC-PROPOSE-007 | Proponer | Propuesta pendiente enviada. El contenido vigente no se ha modificado. | Confirmación role=status | Confirma envío | Éxito | DocumentWorkflow |
| PGC-PROPOSE-008 | Proponer | Borrador reemplazado por el contenido vigente mostrado. | Confirmación role=status | Confirma reemplazo | Tras usar vigente | DocumentWorkflow |
| PGC-PROPOSE-009 | Proponer | {error API}. Actualiza el documento y luego elige «Usar contenido vigente». | Alerta de conflicto | Explica 409 conservando borrador | Conflicto | DocumentWorkflow |

No se edita PENDIENTE. Las DEVUELTA del autor incorporan Correction.

## Bandeja y revisión — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-INBOX-001 | Bandeja | Revisión de propuestas | Título | Encabeza vista | Autenticado | ReviewInbox |
| PGC-INBOX-002 | Bandeja | Estado | Select | Todos, PENDIENTE, DEVUELTA, APROBADA, RECHAZADA; inicial PENDIENTE | Autenticado | ReviewInbox |
| PGC-INBOX-003 | Bandeja | Documento | Select | Todos o documento | Autenticado | ReviewInbox |
| PGC-INBOX-004 | Bandeja | Actualizar bandeja | Botón secundario | Aplica filtros, cierra selección | Deshabilitado al cargar u operar | ReviewInbox |
| PGC-INBOX-005 | Bandeja | Cargando propuestas… | Estado role=status | Consulta lista | Carga | ReviewInbox |
| PGC-INBOX-006 | Bandeja | Cargando comparación o procesando decisión… | Estado role=status | Operación en curso | Busy sin selección | ReviewInbox |
| PGC-INBOX-007 | Bandeja | No hay propuestas para esta consulta. | Vacío | Sin resultados | Carga finalizada vacía | ReviewInbox |
| PGC-INBOX-008 | Bandeja | {título documento} | Título de fila | Identifica documento | Por propuesta | ReviewInbox |
| PGC-INBOX-009 | Bandeja | {estado} · {autor} · {motivo} · Base: {N o desconocida} | Resumen | Contextualiza propuesta | Por propuesta | ReviewInbox |
| PGC-INBOX-010 | Bandeja | Comparar propuesta | Botón | Carga documento e historial | Deshabilitado al operar | ReviewInbox |
| PGC-REVIEW-001 | Comparación | Comparación: {título} | Encabezado | Identifica revisión | Selección cargada | ReviewInbox |
| PGC-REVIEW-002 | Comparación | Motivo: {mensaje} | Texto | Justificación | Selección cargada | ReviewInbox |
| PGC-REVIEW-003 | Comparación | Vigente · versión {N} | Panel pre | Contenido oficial actual completo | Selección cargada | ReviewInbox |
| PGC-REVIEW-004 | Comparación | Propuesto · base {N o desconocida} | Panel pre | Contenido propuesto completo | Selección cargada | ReviewInbox |
| PGC-REVIEW-005 | Comparación | Observación de revisión: {comentario} | Texto | Observación previa | Si existe | ReviewInbox |
| PGC-REVIEW-006 | Comparación | Comentario de revisión | Textarea, 2 filas | Comentario para decisión; obligatorio al devolver | Visible para todos, incluso ANALISTA | ReviewInbox |
| PGC-REVIEW-007 | Comparación | Aprobar propuesta / Procesando… / Aprobación bloqueada: base antigua | Botón | Aprueba y crea versión | REVISOR/ADMIN; deshabilitado busy, no PENDIENTE o base antigua/desconocida | ReviewInbox |
| PGC-REVIEW-008 | Comparación | Rechazar propuesta | Botón secundario | Rechaza sin alterar oficial | REVISOR/ADMIN; deshabilitado busy o no PENDIENTE | ReviewInbox |
| PGC-REVIEW-009 | Comparación | Devolver para corrección | Botón secundario | Devuelve con observación | REVISOR/ADMIN; deshabilitado busy, no PENDIENTE o comentario vacío | ReviewInbox |
| PGC-REVIEW-010 | Comparación | Abrir documento e historial | Enlace | Abre detalle | Selección cargada | ReviewInbox |
| PGC-REVIEW-011 | Tras decisión | Ver documento e historial tras la revisión | Enlace | Abre último documento revisado | Tras aprobar/rechazar/devolver | ReviewInbox |
| PGC-REVIEW-012 | Tras decisión | {message API} | Confirmación role=status | Resultado de decisión | Éxito | ReviewInbox |
| PGC-REVIEW-013 | Comparación | La base es antigua o desconocida: no se puede aprobar. Si está DEVUELTA, su autor puede revisar el contenido vigente y confirmar una nueva base al reenviar. | Alerta role=alert | Bloqueo por base | Base null o distinta de vigente | ReviewInbox |
| PGC-REVIEW-014 | Comparación | Solo REVISOR o ADMIN pueden aprobar, rechazar o devolver. | Ayuda de permiso | Explica ausencia de decisiones | ANALISTA | ReviewInbox |
| PGC-REVIEW-015 | Comparación | No se puede decidir: la propuesta está {estado}. Las devueltas requieren corrección y reenvío del autor. | Ayuda de estado | Explica bloqueo | No PENDIENTE | ReviewInbox |
| PGC-REVIEW-016 | Comparación | Para devolver, escribe una observación obligatoria. | Ayuda | Explica devolución deshabilitada | REVISOR/ADMIN, PENDIENTE, comentario vacío | ReviewInbox |
| PGC-REVIEW-017 | Bandeja | {error API}. Actualiza la bandeja para consultar su estado. | Alerta | Explica 409, limpia comparación y recarga | Conflicto | ReviewInbox |

Comparación en dos textos completos, sin diff por líneas. Filtros se aplican con Actualizar bandeja. Sin filtro Mis propuestas. ANALISTA también accede a bandeja.

## Corrección y reenvío — encontrado

Aparece en listado de propuestas del detalle y en comparación de bandeja. Solo autorId igual al usuario, propuesta DEVUELTA. El rol por sí solo no concede permiso.

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-CORRECT-001 | Detalle/bandeja | Corregir y reenviar | Details/summary | Abre corrección | Autor de DEVUELTA | Correction |
| PGC-CORRECT-002 | Corrección | Observación: {comentarioRevision} | Texto | Solicitud del revisor | Autor de DEVUELTA | Correction |
| PGC-CORRECT-003 | Corrección | Recargar versión vigente | Botón secundario | Recarga documento, desmarca confirmación, conserva texto escrito | Deshabilitado cargando/reenviando | Correction |
| PGC-CORRECT-004 | Corrección | Cargando documento vigente… | Estado role=status | Consulta documento | Carga | Correction |
| PGC-CORRECT-005 | Corrección | Contenido vigente · versión {N} | Encabezado y pre | Permite revisar documento oficial | Documento cargado | Correction |
| PGC-CORRECT-006 | Corrección | Contenido corregido | Textarea obligatorio, 6 filas | Inicia con propuesta devuelta | Documento cargado | Correction |
| PGC-CORRECT-007 | Corrección | Motivo | Texto obligatorio | Inicia con motivo anterior | Documento cargado | Correction |
| PGC-CORRECT-008 | Corrección | He revisado el contenido vigente y confirmo la versión {N} como nueva base (anterior: {base o desconocida}). | Checkbox | Confirma base explícitamente | Solo si vigente difiere de base anterior | Correction |
| PGC-CORRECT-009 | Corrección | Confirmar corrección y reenviar / Reenviando… | Submit | Actualiza misma propuesta a PENDIENTE | Deshabilitado busy, sin versión o nueva base no confirmada | Correction |
| PGC-CORRECT-010 | Corrección | {error}. Recarga y revisa la versión vigente antes de reintentar. | Alerta role=alert | Explica fallo; desmarca confirmación | Error al reenviar | Correction |

Sin borrador intermedio en servidor. No reemplaza texto corregido automáticamente. Tras éxito recarga vista y desaparece al volver a PENDIENTE. Sin mensaje propio de éxito o modal adicional.

## Categorías y etiquetas — encontrado

| ID estable | Vista | Etiqueta visible | Tipo de control | Función | Rol y estado en que aparece o se habilita | Componente |
|---|---|---|---|---|---|---|
| PGC-CATALOG-001 | Catálogos | Categorías y etiquetas | Título | Encabeza página | Autenticado | Catalogs |
| PGC-CATEGORY-001 | Catálogos | Crear categoría | Encabezado | Formulario categoría | Autenticado | Catalogs |
| PGC-CATEGORY-002 | Catálogos | Nombre | Texto obligatorio | Nombre categoría | Autenticado | Catalogs |
| PGC-CATEGORY-003 | Catálogos | Descripción | Textarea opcional | Descripción | Autenticado | Catalogs |
| PGC-CATEGORY-004 | Catálogos | Crear | Submit | Crea categoría | Deshabilitado mientras cualquier formulario guarda | Catalogs |
| PGC-TAG-001 | Catálogos | Crear etiqueta | Encabezado | Formulario etiqueta | Autenticado | Catalogs |
| PGC-TAG-002 | Catálogos | Nombre | Texto obligatorio | Nombre etiqueta | Autenticado | Catalogs |
| PGC-TAG-003 | Catálogos | Crear | Submit | Crea etiqueta | Deshabilitado mientras cualquier formulario guarda | Catalogs |
| PGC-CATALOG-002 | Catálogos | Creado. Disponible al abrir de nuevo el formulario o filtro. | Confirmación role=status | Confirma y limpia formulario | Éxito | Catalogs |
| PGC-CATALOG-003 | Catálogos | {error API} | Alerta global | Duplicado/validación/conexión | Fallo | Catalogs → Demo |

Sin listados administrativos, edición, eliminación ni búsqueda de catálogos. Botones no cambian a Guardando; solo se deshabilitan.

## Apariencia y comportamiento actuales

- Español; cabecera de marca, sesión, navegación, contenido y pie.
- Contenido demo máximo 850 px. Tarjetas blancas sobre fondo claro verdoso.
- Verde oscuro principal, secundarios verde claro, bordes redondeados, sombra tenue.
- DM Sans y Manrope declaradas con alternativas sans-serif.
- Formularios de una columna, labels superiores.
- Comparación en dos columnas, una columna bajo 760 px; navegación ajusta líneas.
- Textareas redimensionables verticalmente. Contenido conserva saltos y permite cortar palabras largas.
- Diff verde agregado, rojo eliminado; foco visible y reduced motion.
- Details/summary nativos para registro, edición, restauración, versiones y corrección.
- Window.confirm para restauración y eliminación, sin modales diseñados.

## Pendientes y limitaciones: NO presentarlos como funciones existentes

| ID estable | Área | Pendiente o limitación observada |
|---|---|---|
| PGC-PENDING-001 | Textos | Corregir Categor?as, signos de DocumentActions y codificación del título HTML. |
| PGC-PENDING-002 | Permisos | Explicar acciones de documento ocultas por rol/estado. |
| PGC-PENDING-003 | Revisión | Comentario editable aparece incluso para ANALISTA y propuestas resueltas. Diseñar lectura/edición coherente sin conceder permisos nuevos. |
| PGC-PENDING-004 | Edición | Sin controles de categoría, estado, etiquetas o relaciones. |
| PGC-PENDING-005 | Biblioteca | Sin lista inicial automática, paginación, ordenar, limpiar filtros o filtro por etiquetas. |
| PGC-PENDING-006 | Bandeja | Sin Mis propuestas, búsqueda textual o paginación. |
| PGC-PENDING-007 | Comparadores | Sin diff resaltado de propuesta; diff histórico sin leyenda o estado sin cambios. |
| PGC-PENDING-008 | Carga | Fallo inicial de historial/propuestas puede conservar Cargando historial junto al error por loaded=false. |
| PGC-PENDING-009 | Etiquetas | Fallo puede mostrarse como error global y lista vacía; distinguir fallo de vacío. |
| PGC-PENDING-010 | Crear | Carga conjunta de categorías/relaciones usa mensaje que solo menciona categorías. |
| PGC-PENDING-011 | Guardado | Algunos campos permanecen editables durante operación; mensajes de carga no uniformes. |
| PGC-PENDING-012 | Corrección | Sin confirmación propia de éxito ni aviso de autor ajeno; formulario simplemente ausente. |
| PGC-PENDING-013 | Validación | Sin sistema uniforme de errores junto a campos; required y algunos trim. |
| PGC-PENDING-014 | Navegación | Sin protección ante pérdida de cambios o reemplazo del borrador. |
| PGC-PENDING-015 | Catálogos | Sin administración de listados, edición o eliminación. |
| PGC-PENDING-016 | Cuentas | Sin recuperación/cambio de contraseña, perfil editable o administración de roles/cuentas. |
| PGC-PENDING-017 | Propuestas futuras | Sin editar PENDIENTE, retirar, notificaciones o conversación de comentarios. |
| PGC-PENDING-018 | Auditoría | Sin historial completo de observaciones/reenvíos; muestra comentarioRevision disponible. |
| PGC-PENDING-019 | Contenido | Sin adjuntos, editor enriquecido, exportación o carga de archivos. |
| PGC-PENDING-020 | Rutas | Sin 404 específica; ruta desconocida con sesión muestra búsqueda. |
| PGC-PENDING-021 | Accesibilidad | Revisar contraste, leyenda textual de diff y checkbox que hereda estilos generales de inputs. |

Las funciones que necesitan endpoints o decisiones nuevas deben quedar identificadas como futuras, no habilitadas automáticamente en el rediseño.

## Escenarios para diseñar

1. Visitante: API disponible/caída, ingreso, credenciales inválidas, registro y éxito.
2. Analista: biblioteca inicial, resultados, vacío, filtros y documento.
3. Creación: catálogos disponibles/vacíos, carga/error.
4. BORRADOR propio: editar, historial, proponer y eliminar.
5. PUBLICADO visto por ANALISTA: proponer disponible, edición/restauración ausentes.
6. BORRADOR ajeno visto por REVISOR: edición ausente, revisión disponible.
7. REVISOR/ADMIN: propuesta pendiente vigente con tres decisiones.
8. Base antigua/desconocida: aprobar bloqueado, rechazar/devolver disponibles.
9. DEVUELTA del autor: observación, corrección y reenvío.
10. Documento cambiado: vigente, base anterior y checkbox obligatorio para nueva base.
11. DEVUELTA ajena: sin corrección.
12. APROBADA/RECHAZADA: consulta y decisiones bloqueadas.
13. Historial con una/múltiples versiones; diff, restauración y confirmación.
14. Conflicto: conservar texto, explicar y recargar.
15. Crear categorías/etiquetas: éxito y duplicado.
16. Adaptación móvil de biblioteca, formularios, detalle y comparación.

Objetivo: rediseñar la página completa conservando funciones y condiciones reales, distinguiendo con claridad lo existente de lo futuro.
