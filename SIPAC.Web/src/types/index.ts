export interface User {
  id: number;
  nombreCompleto: string;
  username: string;
  rol: 'Admin' | 'Pañolero' | 'Supervisor';
  activo: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  usuario: User;
}

export interface Categoria {
  id: number;
  nombre: string;
  cantidadArticulos?: number;
}

export interface Articulo {
  id: number;
  nombre: string;
  categoriaId: number;
  categoriaNombre?: string;
  unidadMedida: string;
  esFraccionable: boolean;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
  stockBajo?: boolean;
}

export interface Empleado {
  id: number;
  nombreCompleto: string;
  legajo: string;
  puestoSector: string;
  activo: boolean;
}

export interface Responsable {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CategoriaTrabajo {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface UnidadFuncional {
  id: number;
  sectorEscalera: string;
  piso?: string | null;
  depto?: string | null;
  displayNombre: string;
  esLocal: boolean;
}

export interface OtEgresoItem {
  id: number;
  articuloId: number;
  articuloNombre: string;
  unidadMedida: string;
  cantidad: number;
  fechaHora: string;
  usuarioNombre: string;
  observacion?: string;
}

export interface OtBitacoraItem {
  id: number;
  tipoOperacion: 'ALTA' | 'MODIFICACION' | 'CAMBIO_ESTADO' | 'BAJA_FISICA' | 'BAJA_LOGICA' | string;
  detalleCambio: string;
  fechaHora: string;
}

export interface OrdenTrabajo {
  idOt: number;
  numeroOT: string;
  unidadFuncionalId: number;
  unidadFuncionalDisplay: string;
  sectorEscalera: string;
  piso?: string | null;
  depto?: string | null;
  responsableId: number;
  responsableNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  problemaReportado: string;
  solucionRealizada?: string | null;
  estado: 'Pendiente' | 'En Proceso' | 'Finalizado' | 'Suspendido' | 'Cancelado';
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
  esAlertaInactividad: boolean;
  diasPendiente: number;
  insumosConsumidos: OtEgresoItem[];
  bitacora: OtBitacoraItem[];
}

export interface HistorialOtItem {
  idOt: number;
  numeroOT: string;
  categoriaNombre: string;
  responsableNombre: string;
  problemaReportado: string;
  solucionRealizada?: string | null;
  estado: string;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
  insumosConsumidos: OtEgresoItem[];
}

export interface HistorialUfResponse {
  unidadFuncional: UnidadFuncional;
  totalReclamos: number;
  reclamos: HistorialOtItem[];
}

export interface Egreso {
  id: number;
  articuloId: number;
  articuloNombre: string;
  unidadMedida: string;
  ordenTrabajoId: number;
  numeroOT: string;
  unidadFuncionalDisplay: string;
  empleadoNombre: string;
  cantidad: number;
  fechaHora: string;
  usuarioId: number;
  usuarioNombre: string;
  observacion?: string;
}

export interface DetalleCompra {
  id?: number;
  articuloId: number;
  articuloNombre?: string;
  unidadMedida?: string;
  cantidadRecibida: number;
}

export interface Compra {
  id: number;
  nroComprobante: string;
  fechaCompra: string;
  fechaCarga: string;
  usuarioId: number;
  usuarioNombre?: string;
  fotoComprobanteUrl?: string;
  observacionesDiferencia?: string;
  detalles: DetalleCompra[];
}

export interface AjusteInventario {
  id: number;
  articuloId: number;
  articuloNombre: string;
  unidadMedida: string;
  cantidad: number;
  motivo: string;
  justificacion: string;
  tipoAjuste: 'Alta' | 'Baja' | 'Recuento';
  fechaHora: string;
  usuarioId: number;
  usuarioNombre: string;
}

export interface DashboardSummary {
  totalArticulos: number;
  articulosStockBajo: number;
  totalOrdenesActivas: number;
  totalAlertasInactividad: number;
  egresosHoy: number;
  stockCritico: Articulo[];
  egresosRecientes: Egreso[];
  ultimasOrdenes: OrdenTrabajo[];
}

export interface AuditLog {
  id: number;
  usuarioId?: number;
  usuarioNombre: string;
  accion: string;
  model: string;
  modelId?: number;
  valoresAnteriores?: string;
  valoresNuevos?: string;
  ip?: string;
  timestamp: string;
}
