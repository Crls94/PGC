import type { Documento, VersionDocumento } from './types';

// El historial puede avanzar después de cargar el detalle. Nunca usar su versión
// más reciente como base de un texto que vino de una lectura anterior.
export function documentSnapshot(document: Documento, versions: VersionDocumento[]) {
  const number = document.versiones?.[0]?.numeroVersion;
  const saved = versions.find(v => v.numeroVersion === number);
  if (!saved || saved.contenido !== document.contenidoActual) {
    throw new Error('El contenido y su versión no coinciden. Actualiza el documento antes de usarlo como base.');
  }
  return { contenido: saved.contenido, versionBase: saved.numeroVersion };
}
