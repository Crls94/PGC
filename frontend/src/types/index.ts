// Definiciones de tipos para el Frontend (alineados al backend y base de datos)

export type Rol = 'ADMIN' | 'REVISOR' | 'ANALISTA';

export type EstadoDocumento = 'BORRADOR' | 'EN_REVISION' | 'PUBLICADO' | 'OBSOLETO';

export type EstadoPropuesta = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'DEVUELTA';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Etiqueta {
  id: string;
  nombre: string;
}

export interface VersionDocumento {
  id: string;
  documentoId: string;
  numeroVersion: number;
  contenido: string;
  mensajeCambio: string;
  autorId: string;
  autor?: Usuario;
  creadoEn: string;
}

export type VersionResumen = Pick<VersionDocumento, 'id' | 'numeroVersion' | 'mensajeCambio' | 'creadoEn' | 'autor'>;

export interface PermisosDocumento {
  editar: boolean;
  eliminar: boolean;
  restaurar: boolean;
  estadosPermitidos: EstadoDocumento[];
}

export interface Documento {
  id: string;
  titulo: string;
  contenidoActual: string;
  estado: EstadoDocumento;
  categoriaId?: string | null;
  categoria?: Categoria | null;
  autorId: string;
  autor?: Usuario;
  etiquetas?: Array<Etiqueta | string>;
  relaciones?: Array<{ id: string; titulo: string; estado: EstadoDocumento }>;
  versiones?: VersionResumen[];
  // Calculado por el backend para el usuario de la sesión (solo en el detalle).
  permisos?: PermisosDocumento;
  creadoEn: string;
  actualizadoEn: string;
}

export type DocumentoListado = Omit<Documento, 'autorId' | 'categoriaId' | 'versiones' | 'permisos'> & { totalVersiones: number };

export interface PropuestaCambio {
  id: string;
  documentoId: string;
  autorId: string;
  autor?: Usuario;
  revisorId?: string;
  revisor?: Usuario;
  contenidoPropuesto: string;
  versionBase: number | null;
  documento?: { id: string; titulo: string; contenidoActual: string };
  mensaje: string;
  estado: EstadoPropuesta;
  comentarioRevision?: string;
  creadoEn: string;
  revisadoEn?: string;
}
