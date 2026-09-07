export interface User {
  id: number | string;
  nombreCompleto: string;
  username: string;
  rol: 'Admin' | 'Pañolero' | 'Supervisor' | 'Operario';
  activo: boolean;
  email?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  usuario: User;
}

export interface CrearUsuarioRequest {
  nombreCompleto: string;
  username: string;
  password: string;
  rol: 'Admin' | 'Pañolero' | 'Supervisor';
  activo?: boolean;
}

export interface ActualizarUsuarioRequest {
  nombreCompleto: string;
  username: string;
  rol: 'Admin' | 'Pañolero' | 'Supervisor';
  activo: boolean;
}

export interface CambiarPasswordRequest {
  nuevaPassword: string;
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
  id: string;
  nombreCompleto: string;
  legajo: string;
  puestoSector: string;
  activo: boolean;
  cantidadOrdenes?: number;
  usuario?: string;
  email?: string;
  tienePin?: boolean;
  tienePinConfigurado?: boolean;
  pendienteActivacion?: boolean;
  tieneAccesoMovil?: boolean;
  estadoAccesoMovil?: string;
}

export interface Responsable {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface CategoriaTrabajo {
  id: string;
  nombre: string;
  activo: boolean;
  cantidadOrdenes?: number;
}

export interface UnidadFuncional {
  id: string;
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
  id: string;
  tipoOperacion: 'CREACION' | 'CAMBIO_ESTADO' | 'ACTUALIZACION' | 'BAJA_LOGICA' | string;
  detalleCambio: string;
  fechaHora: string;
}

export type EstadoOrdenTrabajo =
  | 'Pendiente'
  | 'En Proceso'
  | 'Pendiente Aprobacion Finalizacion'
  | 'Pendiente Aprobacion Suspension'
  | 'Finalizado'
  | 'Suspendido'
  | 'Cancelado';

export interface OrdenTrabajo {
  idOt: string;
  numeroOT: string;
  unidadFuncionalId: string;
  unidadFuncionalDisplay: string;
  sectorEscalera: string;
  piso?: string | null;
  depto?: string | null;
  responsableId: string;
  responsableNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  problemaReportado: string;
  solucionRealizada?: string | null;
  motivoSuspension?: string | null;
  estado: EstadoOrdenTrabajo;
  leidaPorOperario?: boolean;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
  esAlertaInactividad: boolean;
  diasPendiente: number;
  insumosConsumidos: OtEgresoItem[];
  bitacora: OtBitacoraItem[];
}

export interface HabilitarAccesoResponse {
  id: string;
  nombreCompleto: string;
  usuario: string;
  email: string;
  token: string;
  activationUrl: string;
  enlaceActivacion?: string;
  emailEnviado: boolean;
}

export interface ValidarTokenPinResponse {
  valido: boolean;
  nombreOperario: string;
  usuario: string;
  mensaje?: string;
}

export interface OperarioPerfil {
  id: string;
  nombreCompleto: string;
  usuario: string;
  email?: string;
  legajo?: string;
  puestoSector?: string;
  rol: 'Operario';
}

export interface LoginOperarioResponse {
  token: string;
  operario: OperarioPerfil;
}

export interface MisTareasItem {
  idOt: string;
  numeroOT: string;
  unidadFuncionalId: string;
  unidadFuncionalDisplay: string;
  sectorEscalera: string;
  piso?: string | null;
  depto?: string | null;
  categoriaId: string;
  categoriaNombre: string;
  problemaReportado: string;
  solucionRealizada?: string | null;
  motivoSuspension?: string | null;
  estado: EstadoOrdenTrabajo;
  leidaPorOperario: boolean;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
  diasPendiente: number;
}

export interface HistorialOperarioResponse {
  items: MisTareasItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HistorialOtItem {
  idOt: string;
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
  ordenTrabajoId: string;
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
  totalOrdenesPendientesAprobacion?: number;
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
  modelId?: string | number;
  valoresAnteriores?: string;
  valoresNuevos?: string;
  ip?: string;
  timestamp: string;
}
