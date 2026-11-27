# Frontend PGC

React + TypeScript + Vite. Incluye acceso/registro de analistas, biblioteca con búsqueda y filtros, creación y detalle de documentos, edición autorizada, historial/diff/restauración, catálogos y revisión colaborativa con devolución, corrección y reenvío.

## Arranque local

1. Preparar PostgreSQL y backend siguiendo `backend/README.md`. La API exige `JWT_SECRET` no vacío; no tiene clave de respaldo.
2. Desde `frontend`, instalar con `npm.cmd ci --prefer-offline`.
3. Copiar `.env.example` a `.env` si no existe y configurar `VITE_API_URL` para la API local. No versionar secretos.
4. Ejecutar `npm.cmd run dev -- --port 5181 --strictPort` y abrir `http://127.0.0.1:5181/`.

Sin `.env`, el cliente apunta a `http://localhost:4000/api`. La URL se incorpora al arrancar Vite o compilar: reiniciar tras cambiarla. La demo existente usa API en 4014; las pruebas deben usar una API y una base distintas.

## Comprobaciones

- `npm.cmd test`: pruebas del contenido/base de propuestas, incluyendo historial avanzado y rechazo de lecturas incoherentes.
- `npm.cmd run build`: chequeo de tipos y build.
- No hay validación visual automatizada: probar manualmente escritorio/móvil, permisos, errores, aprobación/rechazo y devolución → corrección → reenvío → aprobación.

El contenido inicial se vincula a su versión guardada, no a la más reciente de otra consulta. Actualizar documento/historial conserva el borrador y su base original. Usar contenido vigente como nuevo borrador reemplaza ambos de forma explícita. Si no se puede comprobar su correspondencia, no se habilita una base inventada.

No se agregan publicación, estados, permisos o endpoints nuevos.
