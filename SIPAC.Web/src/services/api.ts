import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  User,
  LoginResponse,
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
};

export const empleadosApi = {
  getAll: (params?: { soloActivos?: boolean }) =>
    api.get<Empleado[]>('/empleados', { params }).then((r) => r.data),
  create: (data: Partial<Empleado>) => api.post<Empleado>('/empleados', data).then((r) => r.data),
  update: (id: number, data: Partial<Empleado>) => api.put(`/empleados/${id}`, data).then((r) => r.data),
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
