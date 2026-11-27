import { EstadoDocumento, Rol } from "@prisma/client";

// Reglas únicas de permisos sobre documentos. Los controladores y la respuesta
// `permisos` que consume el frontend se basan en estas funciones.

type Actor = { id: string; rol: Rol };
type DocumentoBase = { autorId: string; estado: EstadoDocumento };

export interface PermisosDocumento {
  editar: boolean;
  eliminar: boolean;
  restaurar: boolean;
  estadosPermitidos: EstadoDocumento[];
}

const esAdmin = (user: Actor) => user.rol === Rol.ADMIN;
const esPropio = (doc: DocumentoBase, user: Actor) => doc.autorId === user.id;
const esBorradorAjeno = (doc: DocumentoBase, user: Actor) =>
  doc.estado === EstadoDocumento.BORRADOR && !esPropio(doc, user);

/** Editar contenido o título directamente, sin pasar por una propuesta. */
export function puedeEditar(doc: DocumentoBase, user: Actor): boolean {
  if (esAdmin(user)) return true;
  if (user.rol === Rol.REVISOR) return !esBorradorAjeno(doc, user);
  return esPropio(doc, user) && doc.estado === EstadoDocumento.BORRADOR;
}

/** Estados destino a los que el usuario puede mover el documento (excluye el actual). */
export function estadosPermitidos(doc: DocumentoBase, user: Actor): EstadoDocumento[] {
  const otros = Object.values(EstadoDocumento).filter((estado) => estado !== doc.estado);
  if (esAdmin(user)) return otros;
  if (user.rol === Rol.REVISOR) return esBorradorAjeno(doc, user) ? [] : otros;
  return esPropio(doc, user) && doc.estado === EstadoDocumento.BORRADOR ? [EstadoDocumento.EN_REVISION] : [];
}

/** Solo ADMIN borra documentos fuera de BORRADOR; el resto, solo sus propios borradores. */
export function puedeEliminar(doc: DocumentoBase, user: Actor): boolean {
  return esAdmin(user) || (esPropio(doc, user) && doc.estado === EstadoDocumento.BORRADOR);
}

export function puedeRestaurar(doc: DocumentoBase, user: Actor): boolean {
  if (esAdmin(user)) return true;
  return user.rol === Rol.REVISOR && !esBorradorAjeno(doc, user);
}

export function permisosDocumento(doc: DocumentoBase, user: Actor): PermisosDocumento {
  return {
    editar: puedeEditar(doc, user),
    eliminar: puedeEliminar(doc, user),
    restaurar: puedeRestaurar(doc, user),
    estadosPermitidos: estadosPermitidos(doc, user),
  };
}
