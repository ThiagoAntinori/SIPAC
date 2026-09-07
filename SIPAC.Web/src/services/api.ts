import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  User,
  LoginResponse,
  CrearUsuarioRequest,
  ActualizarUsuarioRequest,
  CambiarPasswordRequest,
  Categoria,
  Articulo,
  Empleado,
  Responsable,
  CategoriaTrabajo,
  UnidadFuncional,
  OrdenTrabajo,
  HistorialUfResponse,
  Egreso,
  Compra,
  AjusteInventario,
  DashboardSummary,
  AuditLog,
  HabilitarAccesoResponse,
  ValidarTokenPinResponse,
  LoginOperarioResponse,
  OperarioPerfil,
  MisTareasItem,
  HistorialOperarioResponse,
} from '../types';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  register: (data: any) => api.post<User>('/auth/register', data).then((r) => r.data),
  getUsers: () => api.get<User[]>('/auth/users').then((r) => r.data),
};

export const usuariosApi = {
  getAll: (params?: { search?: string; rol?: string; soloActivos?: boolean }) =>
    api.get<User[]>('/usuarios', { params }).then((r) => r.data),
  getById: (id: number) => api.get<User>(`/usuarios/${id}`).then((r) => r.data),
  create: (data: CrearUsuarioRequest) => api.post<User>('/usuarios', data).then((r) => r.data),
  update: (id: number, data: ActualizarUsuarioRequest) => api.put<User>(`/usuarios/${id}`, data).then((r) => r.data),
  cambiarPassword: (id: number, data: CambiarPasswordRequest) =>
    api.patch<{ message: string }>(`/usuarios/${id}/password`, data).then((r) => r.data),
  toggleActivo: (id: number) => api.patch<User>(`/usuarios/${id}/toggle-activo`).then((r) => r.data),
  delete: (id: number) =>
    api.delete<{ message: string; tipoBaja: string }>(`/usuarios/${id}`).then((r) => r.data),
};

export const articulosApi = {
  getAll: (params?: { search?: string; categoriaId?: number; soloCriticos?: boolean; incluirInactivos?: boolean }) =>
    api.get<Articulo[]>('/articulos', { params }).then((r) => r.data),
  getById: (id: number) => api.get<Articulo>(`/articulos/${id}`).then((r) => r.data),
  create: (data: Partial<Articulo>) => api.post<Articulo>('/articulos', data).then((r) => r.data),
  update: (id: number, data: Partial<Articulo>) => api.put(`/articulos/${id}`, data).then((r) => r.data),
  toggleActivo: (id: number) => api.delete(`/articulos/${id}`).then((r) => r.data),
};

export const categoriasApi = {
  getAll: () => api.get<Categoria[]>('/categorias').then((r) => r.data),
  create: (data: { nombre: string }) => api.post<Categoria>('/categorias', data).then((r) => r.data),
  update: (id: number, data: { nombre: string }) => api.put(`/categorias/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/categorias/${id}`).then((r) => r.data),
};

export const empleadosApi = {
  getAll: (params?: { soloActivos?: boolean }) =>
    api.get<Empleado[]>('/empleados', { params }).then((r) => r.data),
  create: (data: Partial<Empleado>) => api.post<Empleado>('/empleados', data).then((r) => r.data),
  update: (id: string, data: Partial<Empleado>) => api.put(`/empleados/${id}`, data).then((r) => r.data),
  getById: (id: string) => api.get<Empleado>(`/empleados/${id}`).then((r) => r.data),
  create: (data: Partial<Empleado> & { nombreCompleto: string }) =>
    api.post<Empleado>('/empleados', data).then((r) => r.data),
  update: (id: string, data: Partial<Empleado> & { nombreCompleto: string }) =>
    api.put<Empleado>(`/empleados/${id}`, data).then((r) => r.data),
  toggleActivo: (id: string) =>
    api.patch<Empleado>(`/empleados/${id}/toggle-activo`).then((r) => r.data),
};

export const responsablesApi = {
  getAll: (params?: { soloActivos?: boolean }) =>
    api.get<Responsable[]>('/responsables', { params }).then((r) => r.data),
  create: (data: { nombre: string }) => api.post<Responsable>('/responsables', data).then((r) => r.data),
  update: (id: string, data: { nombre: string; activo: boolean }) => api.put(`/responsables/${id}`, data).then((r) => r.data),
};

export const categoriasTrabajoApi = {
  getAll: (params?: { soloActivas?: boolean }) =>
    api.get<CategoriaTrabajo[]>('/categoriastrabajo', { params }).then((r) => r.data),
  create: (data: { nombre: string }) => api.post<CategoriaTrabajo>('/categoriastrabajo', data).then((r) => r.data),
  update: (id: string, data: { nombre: string; activo: boolean }) => api.put(`/categoriastrabajo/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/categoriastrabajo/${id}`).then((r) => r.data),
};

export const unidadesFuncionalesApi = {
  getAll: (params?: { search?: string; sector?: string; piso?: string }) =>
    api.get<UnidadFuncional[]>('/unidadesfuncionales', { params }).then((r) => r.data),
  getSectores: () => api.get<string[]>('/unidadesfuncionales/sectores').then((r) => r.data),
  getPisos: (sector: string) =>
    api.get<string[]>('/unidadesfuncionales/pisos', { params: { sector } }).then((r) => r.data),
  getDeptos: (sector: string, piso?: string) =>
    api.get<UnidadFuncional[]>('/unidadesfuncionales/deptos', { params: { sector, piso } }).then((r) => r.data),
  getById: (id: string) => api.get<UnidadFuncional>(`/unidadesfuncionales/${id}`).then((r) => r.data),
  getHistorial: (id: string) =>
    api.get<HistorialUfResponse>(`/unidadesfuncionales/${id}/historial`).then((r) => r.data),
};

export const ordenesApi = {
  getAll: (params?: {
    estado?: string;
    responsableId?: string;
    categoriaId?: string;
    unidadFuncionalId?: string;
    soloAlertas?: boolean;
    search?: string;
  }) => api.get<OrdenTrabajo[]>('/ordenestrabajo', { params }).then((r) => r.data),
  getById: (id: string) => api.get<OrdenTrabajo>(`/ordenestrabajo/${id}`).then((r) => r.data),
  create: (data: {
    unidadFuncionalId: string;
    responsableId: string;
    categoriaId: string;
    problemaReportado: string;
    observaciones?: string;
  }) => api.post<OrdenTrabajo>('/ordenestrabajo', data).then((r) => r.data),
  update: (
    id: string,
    data: {
      responsableId: string;
      categoriaId: string;
      problemaReportado: string;
      solucionRealizada?: string;
      estado: string;
      observaciones?: string;
    }
  ) => api.put<OrdenTrabajo>(`/ordenestrabajo/${id}`, data).then((r) => r.data),
  changeEstado: (id: string, data: { estado: string; solucionRealizada?: string; observaciones?: string }) =>
    api.patch(`/ordenestrabajo/${id}/estado`, data).then((r) => r.data),
  aprobarFinalizacion: (id: string) =>
    api.patch(`/ordenestrabajo/${id}/aprobar-finalizacion`).then((r) => r.data),
  aprobarSuspension: (id: string) =>
    api.patch(`/ordenestrabajo/${id}/aprobar-suspension`).then((r) => r.data),
  rechazarAprobacion: (id: string, observaciones: string) =>
    api.patch(`/ordenestrabajo/${id}/rechazar-aprobacion`, { observaciones }).then((r) => r.data),
  delete: (id: string) =>
    api.delete<{ message: string; tipoBaja: string }>(`/ordenestrabajo/${id}`).then((r) => r.data),
};

export const egresosApi = {
  getAll: (params?: { articuloId?: number; ordenTrabajoId?: string; desde?: string; hasta?: string }) =>
    api.get<Egreso[]>('/egresos', { params }).then((r) => r.data),
  create: (data: { articuloId: number; ordenTrabajoId: string; cantidad: number; observacion?: string }) =>
    api.post<Egreso>('/egresos', data).then((r) => r.data),
};

export const comprasApi = {
  getAll: () => api.get<Compra[]>('/compras').then((r) => r.data),
  create: (data: {
    nroComprobante: string;
    fechaCompra: string;
    fotoComprobanteUrl?: string;
    observacionesDiferencia?: string;
    detalles: { articuloId: number; cantidadRecibida: number }[];
  }) => api.post<Compra>('/compras', data).then((r) => r.data),
};

export const ajustesApi = {
  getAll: () => api.get<AjusteInventario[]>('/ajustes').then((r) => r.data),
  create: (data: {
    articuloId: number;
    cantidad: number;
    motivo: string;
    justificacion: string;
    tipoAjuste: string;
  }) => api.post<AjusteInventario>('/ajustes', data).then((r) => r.data),
};

export const dashboardApi = {
  getResumen: () => api.get<DashboardSummary>('/dashboard/resumen').then((r) => r.data),
};

export const auditoriaApi = {
  getAll: () => api.get<AuditLog[]>('/auditoria').then((r) => r.data),
};

export const operariosApi = {
  habilitarAcceso: (id: string, email: string) =>
    api.post<HabilitarAccesoResponse>(`/operarios/${id}/habilitar-acceso`, { email }).then((r) => r.data),
  validarTokenPin: (token: string) =>
    api.get<ValidarTokenPinResponse>('/operarios/validar-token-pin', { params: { token } }).then((r) => r.data),
  activarPin: (token: string, pin: string) =>
    api.post<{ message: string }>('/operarios/activar-pin', { token, pin }).then((r) => r.data),
  login: (usuario: string, pin: string) =>
    api.post<LoginOperarioResponse>('/operarios/login', { usuario, pin }).then((r) => r.data),
  me: () =>
    api.get<OperarioPerfil>('/operarios/me').then((r) => r.data),
  getMisTareas: () =>
    api.get<MisTareasItem[]>('/operarios/mis-tareas').then((r) => r.data),
  getHistorial: (params?: { estado?: string; desde?: string; hasta?: string; page?: number; pageSize?: number }) =>
    api.get<HistorialOperarioResponse>('/operarios/historial', { params }).then((r) => r.data),
  marcarLeida: (id: string) =>
    api.patch<{ message: string }>(`/operarios/tareas/${id}/marcar-leida`).then((r) => r.data),
  iniciarTarea: (id: string) =>
    api.patch<{ message: string; estado: string }>(`/operarios/tareas/${id}/iniciar`).then((r) => r.data),
  elevarFinalizacion: (id: string, solucionRealizada: string) =>
    api.patch<{ message: string; estado: string }>(`/operarios/tareas/${id}/elevar-finalizacion`, { solucionRealizada }).then((r) => r.data),
  elevarSuspension: (id: string, motivoSuspension: string) =>
    api.patch<{ message: string; estado: string }>(`/operarios/tareas/${id}/elevar-suspension`, { motivoSuspension }).then((r) => r.data),
};

export const pushApi = {
  getPublicKey: () =>
    api.get<{ publicKey: string }>('/push/public-key').then((r) => r.data),
  suscribir: (data: { endpoint: string; p256dh: string; auth: string }) =>
    api.post<{ message: string }>('/push/suscribir', data).then((r) => r.data),
  desuscribir: (endpoint: string) =>
    api.post<{ message: string }>('/push/desuscribir', endpoint).then((r) => r.data),
};
