import { Response } from "express";
import prisma from "../config/db.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { EstadoDocumento, Prisma } from "@prisma/client";
import { diffLines, Change } from "diff";
import { estadosPermitidos, permisosDocumento, puedeEditar, puedeEliminar, puedeRestaurar } from "../services/permisos.js";


class DocumentError extends Error { constructor(public status: number, message: string) { super(message); } }
function documentError(res: Response, error: unknown) {
  if (error instanceof DocumentError) { res.status(error.status).json({ message: error.message }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
    res.status(409).json({ message: 'El documento cambi? durante la operaci?n. Recarga antes de continuar.' }); return;
  }
  console.error(error); res.status(500).json({ message: 'Error al modificar documento' });
}
function checkVersion(value: unknown, current: number) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || Number(value) < 1) throw new DocumentError(400, 'versionEsperada debe ser un entero positivo');
  if (value !== current) throw new DocumentError(409, 'El documento cambi?. Recarga la versi?n vigente antes de continuar.');
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// 1. Listar documentos con filtros y búsqueda
export async function listarDocumentos(req: AuthRequest, res: Response): Promise<void> {
  try {
    const busqueda = req.query.busqueda ? String(req.query.busqueda) : undefined;
    const categoriaId = req.query.categoriaId ? String(req.query.categoriaId) : undefined;
    const estado = req.query.estado ? String(req.query.estado) : undefined;

    const whereClause: Prisma.DocumentoWhereInput = {};

    if (estado && Object.values(EstadoDocumento).includes(estado as EstadoDocumento)) {
      whereClause.estado = estado as EstadoDocumento;
    }

    if (categoriaId) {
      whereClause.categoriaId = categoriaId;
    }

    if (busqueda) {
      whereClause.OR = [
        { titulo: { contains: busqueda, mode: "insensitive" } },
        { contenidoActual: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const documentos = await prisma.documento.findMany({
      where: whereClause,
      orderBy: { actualizadoEn: "desc" },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        categoria: {
          select: { id: true, nombre: true },
        },
        etiquetas: {
          include: {
            etiqueta: true,
          },
        },
        _count: {
          select: { versiones: true },
        },
      },
    });

    res.json({
      total: documentos.length,
      documentos: documentos.map((doc) => ({
        id: doc.id,
        titulo: doc.titulo,
        contenidoActual: doc.contenidoActual,
        estado: doc.estado,
        categoria: doc.categoria,
        autor: doc.autor,
        etiquetas: doc.etiquetas.map((e) => e.etiqueta.nombre),
        totalVersiones: doc._count.versiones,
        creadoEn: doc.creadoEn,
        actualizadoEn: doc.actualizadoEn,
      })),
    });
  } catch (error: any) {
    console.error("Error al listar documentos:", error);
    res.status(500).json({ message: "Error al obtener documentos", error: error.message });
  }
}

// 2. Obtener un documento específico por ID
export async function obtenerDocumentoPorId(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const documento = await prisma.documento.findUnique({
      where: { id },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        categoria: true,
        etiquetas: {
          include: { etiqueta: true },
        },
        versiones: {
          orderBy: { numeroVersion: "desc" },
          select: {
            id: true,
            numeroVersion: true,
            mensajeCambio: true,
            creadoEn: true,
            autor: {
              select: { id: true, nombre: true, email: true },
            },
          },
        },
        documentosRelacionados: {
          include: {
            destino: {
              select: { id: true, titulo: true, estado: true },
            },
          },
        },
      },
    });

    if (!documento) {
      res.status(404).json({ message: "Documento no encontrado" });
      return;
    }

    res.json({
      documento: {
        ...documento,
        etiquetas: documento.etiquetas.map((e) => e.etiqueta.nombre),
        relaciones: documento.documentosRelacionados.map((r) => r.destino),
        permisos: permisosDocumento(documento, req.user!),
      },
    });
  } catch (error: any) {
    console.error("Error al obtener documento:", error);
    res.status(500).json({ message: "Error al obtener documento", error: error.message });
  }
}

// 3. Crear documento y su versión 1 inicial
export async function crearDocumento(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { titulo, contenido, categoriaId, estado, etiquetas, documentosRelacionadosIds } = req.body;
    const autorId = req.user!.id;

    if (!validText(titulo) || !validText(contenido)) {
      res.status(400).json({ message: "El título y el contenido son obligatorios" });
      return;
    }

    if (etiquetas !== undefined && (!Array.isArray(etiquetas) || etiquetas.some(e => typeof e !== 'string'))) {
      res.status(400).json({ message: 'Las etiquetas deben ser una lista de textos' });
      return;
    }
    if (estado !== undefined && !Object.values(EstadoDocumento).includes(estado)) {
      res.status(400).json({ message: 'Estado inválido' });
      return;
    }
    const etiquetasNormalizadas = [...new Set<string>((etiquetas ?? []).map((e: string) => e.trim().toLowerCase()).filter(Boolean))];

    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el documento
      const nuevoDoc = await tx.documento.create({
        data: {
          titulo: String(titulo).trim(),
          contenidoActual: contenido,
          estado: req.user!.rol === "ANALISTA" ? EstadoDocumento.BORRADOR : (estado as EstadoDocumento) || EstadoDocumento.BORRADOR,
          categoriaId: categoriaId ? String(categoriaId) : null,
          autorId,
        },
      });

      // Crear automáticamente la Versión 1 en el historial
      await tx.version.create({
        data: {
          documentoId: nuevoDoc.id,
          numeroVersion: 1,
          contenido: contenido,
          mensajeCambio: "Creación inicial del documento",
          autorId,
        },
      });

      // Asociar etiquetas si se proporcionaron
      if (etiquetasNormalizadas.length > 0) {
        for (const nombreEtiqueta of etiquetasNormalizadas) {
          const etiqueta = await tx.etiqueta.upsert({
            where: { nombre: String(nombreEtiqueta).trim().toLowerCase() },
            create: { nombre: String(nombreEtiqueta).trim().toLowerCase() },
            update: {},
          });

          await tx.documentoEtiqueta.create({
            data: {
              documentoId: nuevoDoc.id,
              etiquetaId: etiqueta.id,
            },
          });
        }
      }

      // Asociar notas/documentos relacionados
      if (Array.isArray(documentosRelacionadosIds) && documentosRelacionadosIds.length > 0) {
        for (const destinoId of documentosRelacionadosIds) {
          await tx.documentoRelacion.create({
            data: {
              origenId: nuevoDoc.id,
              destinoId: String(destinoId),
            },
          });
        }
      }

      return nuevoDoc;
    });

    res.status(201).json({
      message: "Documento creado con versión 1 registrada",
      documento: resultado,
    });
  } catch (error: any) {
    console.error("Error al crear documento:", error);
    res.status(500).json({ message: "Error al crear documento", error: error.message });
  }
}

// 4. Actualizar documento y generar nueva versión en historial
export async function actualizarDocumento(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { titulo, contenido, categoriaId, estado, mensajeCambio, versionEsperada } = req.body;
    if ((titulo !== undefined && !validText(titulo)) || (contenido !== undefined && !validText(contenido))) {
      throw new DocumentError(400, 'El título y el contenido deben ser textos no vacíos');
    }
    if (estado !== undefined && !Object.values(EstadoDocumento).includes(estado)) throw new DocumentError(400, 'Estado inv?lido');
    const result = await prisma.$transaction(async tx => {
      const doc = await tx.documento.findUnique({ where: { id }, include: { versiones: { orderBy: { numeroVersion: 'desc' }, take: 1 } } });
      if (!doc) throw new DocumentError(404, 'Documento no encontrado');
      if (!puedeEditar(doc, req.user!)) {
        throw new DocumentError(403, doc.estado === 'BORRADOR'
          ? 'No puedes editar borradores de otro usuario'
          : 'Un Analista solo edita directamente sus borradores. Para este documento envía una propuesta de cambio.');
      }
      const cambiaEstado = estado !== undefined && estado !== doc.estado;
      if (cambiaEstado && !estadosPermitidos(doc, req.user!).includes(estado)) {
        throw new DocumentError(403, `No tienes permiso para cambiar el documento de ${doc.estado} a ${estado}`);
      }
      const current = doc.versiones[0]?.numeroVersion ?? 1;
      checkVersion(versionEsperada, current);
      const nextContent = contenido ?? doc.contenidoActual;
      const documento = await tx.documento.update({ where: { id }, data: { titulo: titulo !== undefined ? String(titulo).trim() : doc.titulo, contenidoActual: nextContent, categoriaId: categoriaId !== undefined ? categoriaId || null : doc.categoriaId, estado: estado ?? doc.estado } });
      const mensajePorDefecto = cambiaEstado ? `Cambio de estado: ${doc.estado} → ${estado}` : 'Actualización del documento';
      const version = await tx.version.create({ data: { documentoId: id, numeroVersion: current + 1, contenido: nextContent, mensajeCambio: mensajeCambio || mensajePorDefecto, autorId: req.user!.id } });
      return { documento, version };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ message: 'Documento actualizado y nueva versi?n registrada', ...result });
  } catch (error) { documentError(res, error); }
}

// 5. Eliminar documento
export async function eliminarDocumento(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const doc = await prisma.documento.findUnique({ where: { id } });
    if (!doc) {
      res.status(404).json({ message: "Documento no encontrado" });
      return;
    }

    if (!puedeEliminar(doc, req.user!)) {
      res.status(403).json({ message: doc.estado === "BORRADOR"
        ? "Solo el autor o un ADMIN puede eliminar este borrador"
        : "Solo un ADMIN puede eliminar un documento que no es borrador. Para retirarlo, márcalo como OBSOLETO." });
      return;
    }

    // La condición se repite en el borrado para que un cambio de estado concurrente no lo salte.
    const condicion: Prisma.DocumentoWhereInput = req.user!.rol === "ADMIN"
      ? { id }
      : { id, autorId: req.user!.id, estado: EstadoDocumento.BORRADOR };
    const borrado = await prisma.documento.deleteMany({ where: condicion });
    if (borrado.count !== 1) {
      res.status(409).json({ message: "El documento cambió antes de eliminarlo. Recarga antes de continuar." });
      return;
    }
    res.json({ message: "Documento eliminado correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar documento:", error);
    res.status(500).json({ message: "Error al eliminar documento", error: error.message });
  }
}

// 6. Listar historial de versiones de un documento
export async function obtenerHistorialVersiones(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const versiones = await prisma.version.findMany({
      where: { documentoId: id },
      orderBy: { numeroVersion: "desc" },
      include: {
        autor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
      },
    });

    res.json({ versiones });
  } catch (error: any) {
    console.error("Error al obtener versiones:", error);
    res.status(500).json({ message: "Error al obtener versiones", error: error.message });
  }
}

// 7. Comparar diferencias (diff) entre dos versiones o contra la actual
export async function compararVersiones(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const v1 = req.query.v1 ? String(req.query.v1) : undefined;
    const v2 = req.query.v2 ? String(req.query.v2) : undefined;

    if (typeof req.query.v1 !== 'string' || typeof req.query.v2 !== 'string' ||
      !/^[1-9]\d*$/.test(v1 ?? '') || !/^[1-9]\d*$/.test(v2 ?? '') ||
      !Number.isSafeInteger(Number(v1)) || !Number.isSafeInteger(Number(v2)) ||
      Number(v1) > 2147483647 || Number(v2) > 2147483647) {
      res.status(400).json({ message: "v1 y v2 deben ser números de versión enteros positivos" });
      return;
    }

    const version1 = await prisma.version.findUnique({
      where: {
        documentoId_numeroVersion: {
          documentoId: id,
          numeroVersion: Number(v1),
        },
      },
    });

    const version2 = await prisma.version.findUnique({
      where: {
        documentoId_numeroVersion: {
          documentoId: id,
          numeroVersion: Number(v2),
        },
      },
    });

    if (!version1 || !version2) {
      res.status(404).json({ message: "Una o ambas versiones no existen para este documento" });
      return;
    }

    // Cálculo del diff línea por línea tipo Git
    const diferencias: Change[] = diffLines(version1.contenido, version2.contenido);

    res.json({
      documentoId: id,
      versionOriginal: version1.numeroVersion,
      versionComparada: version2.numeroVersion,
      diferencias: diferencias.map((part) => ({
        valor: part.value,
        agregado: !!part.added,
        eliminado: !!part.removed,
        lineas: part.count,
      })),
    });
  } catch (error: any) {
    console.error("Error al comparar versiones:", error);
    res.status(500).json({ message: "Error al comparar versiones", error: error.message });
  }
}

// 8. Restaurar documento a una versión anterior
export async function restaurarVersion(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!['REVISOR', 'ADMIN'].includes(req.user!.rol)) throw new DocumentError(403, 'Restaurar requiere REVISOR o ADMIN');
    const id = String(req.params.id);
    const result = await prisma.$transaction(async tx => {
      const doc = await tx.documento.findUnique({ where: { id }, include: { versiones: { orderBy: { numeroVersion: 'desc' }, take: 1 } } });
      if (!doc) throw new DocumentError(404, 'Documento no encontrado');
      if (!puedeRestaurar(doc, req.user!)) throw new DocumentError(403, 'No puedes restaurar versiones de un borrador de otro usuario');
      const target =await tx.version.findUnique({ where: { id: String(req.params.versionId) } });
      if (!target || target.documentoId !== id) throw new DocumentError(404, 'Versi?n no encontrada para este documento');
      const current = doc.versiones[0]?.numeroVersion ?? 1;
      checkVersion(req.body?.versionEsperada, current);
      const documento = await tx.documento.update({ where: { id }, data: { contenidoActual: target.contenido } });
      const version = await tx.version.create({ data: { documentoId: id, numeroVersion: current + 1, contenido: target.contenido, mensajeCambio: 'Restauraci?n a la versi?n ' + target.numeroVersion, autorId: req.user!.id } });
      return { documento, version };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ message: 'Versi?n restaurada y nueva versi?n registrada', ...result });
  } catch (error) { documentError(res, error); }
}
