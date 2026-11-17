import { Response } from "express";
import prisma from "../config/db.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { EstadoPropuesta, Prisma } from "@prisma/client";

class ProposalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function respondError(res: Response, error: unknown): void {
  if (error instanceof ProposalError) res.status(error.status).json({ message: error.message });
  else if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
    res.status(409).json({ message: "El documento o la propuesta cambió durante la revisión. Recarga antes de continuar." });
  } else {
    console.error("Error en propuestas:", error);
    res.status(500).json({ message: "Error interno al procesar la propuesta" });
  }
}

export async function crearPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentoId, contenidoPropuesto, mensaje, versionBase } = req.body;
    if (typeof documentoId !== "string" || !documentoId ||
      typeof contenidoPropuesto !== "string" || !contenidoPropuesto.trim() ||
      typeof mensaje !== "string" || !mensaje.trim() ||
      !Number.isInteger(versionBase) || versionBase < 1) {
      res.status(400).json({ message: "documentoId, contenidoPropuesto, mensaje y versionBase (entero positivo) son obligatorios" });
      return;
    }
    const propuesta = await prisma.$transaction(async tx => {
      const documento = await tx.documento.findUnique({
        where: { id: documentoId }, include: { versiones: { orderBy: { numeroVersion: "desc" }, take: 1 } },
      });
      if (!documento) throw new ProposalError(404, "El documento a modificar no existe");
      if (documento.versiones[0]?.numeroVersion !== versionBase) {
        throw new ProposalError(409, "El documento cambió. Recarga su última versión antes de enviar la propuesta.");
      }
      return tx.propuestaCambio.create({
        data: { documentoId, autorId: req.user!.id, contenidoPropuesto, mensaje: mensaje.trim(), versionBase },
        include: { autor: { select: { id: true, nombre: true, email: true, rol: true } }, documento: { select: { id: true, titulo: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.status(201).json({ message: "Propuesta enviada para revisión", propuesta });
  } catch (error) { respondError(res, error); }
}

export async function listarPropuestas(req: AuthRequest, res: Response): Promise<void> {
  try {
    const estado = req.query.estado ? String(req.query.estado) : undefined;
    const documentoId = req.query.documentoId ? String(req.query.documentoId) : undefined;
    const where: Prisma.PropuestaCambioWhereInput = {};
    if (estado && Object.values(EstadoPropuesta).includes(estado as EstadoPropuesta)) where.estado = estado as EstadoPropuesta;
    if (documentoId) where.documentoId = documentoId;
    const propuestas = await prisma.propuestaCambio.findMany({
      where, orderBy: { creadoEn: "desc" },
      include: {
        autor: { select: { id: true, nombre: true, email: true, rol: true } },
        revisor: { select: { id: true, nombre: true, email: true, rol: true } },
        documento: { select: { id: true, titulo: true, contenidoActual: true } },
      },
    });
    res.json({ total: propuestas.length, propuestas });
  } catch (error) { respondError(res, error); }
}

export async function aprobarPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const comentarioRevision = String(req.body.comentarioRevision || "Aprobado por el revisor").trim();
    const resultado = await prisma.$transaction(async tx => {
      // Lecturas, decisión y versión oficial forman una única transacción serializable.
      const propuesta = await tx.propuestaCambio.findUnique({
        where: { id },
        include: { documento: { include: { versiones: { orderBy: { numeroVersion: "desc" }, take: 1 } } } },
      });
      if (!propuesta) throw new ProposalError(404, "Propuesta no encontrada");
      if (propuesta.estado !== EstadoPropuesta.PENDIENTE) throw new ProposalError(409, "La propuesta ya fue evaluada");
      const actual = propuesta.documento.versiones[0]?.numeroVersion;
      if (propuesta.versionBase == null || propuesta.versionBase !== actual) {
        throw new ProposalError(409, "La propuesta se basa en una versión antigua o desconocida. Envía una nueva sobre la versión vigente.");
      }
      const decision = await tx.propuestaCambio.updateMany({
        where: { id, estado: EstadoPropuesta.PENDIENTE },
        data: { estado: EstadoPropuesta.APROBADA, revisorId: req.user!.id, comentarioRevision, revisadoEn: new Date() },
      });
      if (decision.count !== 1) throw new ProposalError(409, "La propuesta ya fue evaluada");
      const documento = await tx.documento.update({ where: { id: propuesta.documentoId }, data: { contenidoActual: propuesta.contenidoPropuesto } });
      const version = await tx.version.create({ data: {
        documentoId: propuesta.documentoId, numeroVersion: actual + 1,
        contenido: propuesta.contenidoPropuesto, mensajeCambio: `Propuesta aprobada: ${propuesta.mensaje}`, autorId: propuesta.autorId,
      } });
      return { propuesta: await tx.propuestaCambio.findUniqueOrThrow({ where: { id } }), documento, version };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ message: "Propuesta aprobada y nueva versión registrada", ...resultado });
  } catch (error) { respondError(res, error); }
}

export async function rechazarPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const resultado = await prisma.$transaction(async tx => {
      const propuesta = await tx.propuestaCambio.findUnique({ where: { id } });
      if (!propuesta) throw new ProposalError(404, "Propuesta no encontrada");
      const decision = await tx.propuestaCambio.updateMany({
        where: { id, estado: EstadoPropuesta.PENDIENTE },
        data: {
          estado: EstadoPropuesta.RECHAZADA, revisorId: req.user!.id,
          comentarioRevision: String(req.body.comentarioRevision || "Cambio rechazado por el revisor").trim(), revisadoEn: new Date(),
        },
      });
      if (decision.count !== 1) throw new ProposalError(409, "La propuesta ya fue evaluada");
      return tx.propuestaCambio.findUniqueOrThrow({ where: { id } });
    });
    res.json({ message: "Propuesta rechazada; documento e historial conservados", propuesta: resultado });
  } catch (error) { respondError(res, error); }
}

export async function devolverPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const comentarioRevision = req.body.comentarioRevision;
    if (typeof comentarioRevision !== 'string' || !comentarioRevision.trim()) throw new ProposalError(400, 'La observación es obligatoria');
    const propuesta = await prisma.$transaction(async tx => {
      const id = String(req.params.id);
      const existing = await tx.propuestaCambio.findUnique({ where: { id } });
      if (!existing) throw new ProposalError(404, 'Propuesta no encontrada');
      const result = await tx.propuestaCambio.updateMany({ where: { id, estado: EstadoPropuesta.PENDIENTE }, data: {
        estado: EstadoPropuesta.DEVUELTA, comentarioRevision: comentarioRevision.trim(), revisorId: req.user!.id, revisadoEn: new Date(),
      } });
      if (result.count !== 1) throw new ProposalError(409, 'Solo se pueden devolver propuestas pendientes');
      return tx.propuestaCambio.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ message: 'Propuesta devuelta para corrección; documento e historial conservados', propuesta });
  } catch (error) { respondError(res, error); }
}

export async function reenviarPropuesta(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { contenidoPropuesto, mensaje, versionBase, baseRevisada } = req.body;
    if (typeof contenidoPropuesto !== 'string' || !contenidoPropuesto.trim() || typeof mensaje !== 'string' || !mensaje.trim() || !Number.isInteger(versionBase) || versionBase < 1) throw new ProposalError(400, 'Contenido, motivo y versión base positiva son obligatorios');
    const propuesta = await prisma.$transaction(async tx => {
      const id = String(req.params.id);
      const existing = await tx.propuestaCambio.findUnique({ where: { id }, include: { documento: { include: { versiones: { orderBy: { numeroVersion: 'desc' }, take: 1 } } } } });
      if (!existing) throw new ProposalError(404, 'Propuesta no encontrada');
      if (existing.autorId !== req.user!.id) throw new ProposalError(403, 'Solo el autor puede corregir y reenviar');
      if (existing.estado !== EstadoPropuesta.DEVUELTA) throw new ProposalError(409, 'Solo se pueden corregir propuestas devueltas');
      const current = existing.documento.versiones[0]?.numeroVersion;
      if (versionBase !== current) throw new ProposalError(409, 'El documento cambió. Recarga y revisa su versión vigente');
      if (existing.versionBase !== current && baseRevisada !== true) throw new ProposalError(400, 'Debes confirmar que revisaste la nueva versión base');
      const result = await tx.propuestaCambio.updateMany({ where: { id, estado: EstadoPropuesta.DEVUELTA, autorId: req.user!.id }, data: {
        contenidoPropuesto, mensaje: mensaje.trim(), versionBase, estado: EstadoPropuesta.PENDIENTE,
      } });
      if (result.count !== 1) throw new ProposalError(409, 'La propuesta cambió. Recarga antes de continuar');
      // Se conserva la observación de devolución para consulta tras el reenvío.
      return tx.propuestaCambio.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.json({ message: 'Propuesta corregida y reenviada para revisión', propuesta });
  } catch (error) { respondError(res, error); }
}
