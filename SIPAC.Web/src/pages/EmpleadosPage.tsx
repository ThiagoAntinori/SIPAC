import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empleadosApi, operariosApi } from '../services/api';
import { Empleado } from '../types';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Edit2,
  X,
  Smartphone,
  CheckCircle2,
  Clock,
  Send,
  Mail,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  UserX,
  UserCheck,
  Sparkles,
} from 'lucide-react';

const inputCls =
  'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-700 mb-1.5';

export const EmpleadosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Empleado | null>(null);

  // Form states empleado
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [legajo, setLegajo] = useState('');
  const [puestoSector, setPuestoSector] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [activo, setActivo] = useState(true);

  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Modal de Habilitar Acceso Móvil
  const [modalAccesoOpen, setModalAccesoOpen] = useState(false);
  const [targetEmpParaAcceso, setTargetEmpParaAcceso] = useState<Empleado | null>(null);
  const [emailAcceso, setEmailAcceso] = useState('');
  const [resultadoAcceso, setResultadoAcceso] = useState<{
    usuario: string;
    email: string;
    enlaceActivacion: string;
    emailEnviado: boolean;
  } | null>(null);

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleadosList'],
    queryFn: () => empleadosApi.getAll({ soloActivos: false }),
  });

  // Métricas
  const metrics = useMemo(() => {
    const total = empleados.length;
    const activos = empleados.filter((e) => e.activo).length;
    const inactivos = total - activos;
    const conAccesoMovil = empleados.filter(
      (e) => e.tienePin || e.tienePinConfigurado
    ).length;
    return { total, activos, inactivos, conAccesoMovil };
  }, [empleados]);

  // Lista filtrada
  const filteredEmpleados = useMemo(() => {
    return empleados.filter((emp) => {
      if (filtroEstado === 'activos' && !emp.activo) return false;
      if (filtroEstado === 'inactivos' && emp.activo) return false;

      if (search.trim()) {
        const s = search.toLowerCase();
        const matchNombre = emp.nombreCompleto?.toLowerCase().includes(s);
        const matchLegajo = emp.legajo?.toLowerCase().includes(s);
        const matchPuesto = emp.puestoSector?.toLowerCase().includes(s);
        const matchUsuario = emp.usuario?.toLowerCase().includes(s);
        const matchEmail = emp.email?.toLowerCase().includes(s);

        if (!matchNombre && !matchLegajo && !matchPuesto && !matchUsuario && !matchEmail) {
          return false;
        }
      }

      return true;
    });
  }, [empleados, filtroEstado, search]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        nombreCompleto: nombreCompleto.trim(),
        legajo: legajo.trim() || undefined,
        puestoSector: puestoSector.trim() || undefined,
        usuario: usuario.trim() ? usuario.trim().toLowerCase() : undefined,
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        activo,
      };

      if (editingEmp) {
        return empleadosApi.update(editingEmp.id, payload);
      } else {
        return empleadosApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleadosList'] });
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['responsables'] });
      toast.success(editingEmp ? 'Empleado actualizado exitosamente' : 'Empleado registrado exitosamente');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al guardar el empleado');
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async (id: string) => {
      return empleadosApi.toggleActivo(id);
    },
    onSuccess: (updatedEmp) => {
      queryClient.invalidateQueries({ queryKey: ['empleadosList'] });
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      queryClient.invalidateQueries({ queryKey: ['responsables'] });
      toast.success(
        updatedEmp.activo
          ? `Empleado '${updatedEmp.nombreCompleto}' activado`
          : `Empleado '${updatedEmp.nombreCompleto}' desactivado`
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del empleado');
    },
  });

  const habilitarAccesoMutation = useMutation({
    mutationFn: async () => {
      if (!targetEmpParaAcceso) return;
      return operariosApi.habilitarAcceso(targetEmpParaAcceso.id, emailAcceso.trim());
    },
    onSuccess: (data) => {
      if (!data) return;
      queryClient.invalidateQueries({ queryKey: ['empleadosList'] });
      setResultadoAcceso({
        usuario: data.usuario,
        email: data.email,
        enlaceActivacion: data.enlaceActivacion || data.activationUrl || '',
        emailEnviado: data.emailEnviado,
      });
      toast.success(
        data.emailEnviado
          ? `Acceso habilitado y correo enviado a ${data.email}`
          : 'Acceso habilitado exitosamente'
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al habilitar acceso móvil');
    },
  });

  const openCreateModal = () => {
    setEditingEmp(null);
    setNombreCompleto('');
    setLegajo('');
    setPuestoSector('');
    setUsuario('');
    setEmail('');
    setActivo(true);
    setModalOpen(true);
  };

  const openEditModal = (emp: Empleado) => {
    setEditingEmp(emp);
    setNombreCompleto(emp.nombreCompleto || '');
    setLegajo(emp.legajo || '');
    setPuestoSector(emp.puestoSector || '');
    setUsuario(emp.usuario || '');
    setEmail(emp.email || '');
    setActivo(emp.activo !== undefined ? emp.activo : true);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEmp(null);
  };

  const openAccesoModal = (emp: Empleado) => {
    setTargetEmpParaAcceso(emp);
    setEmailAcceso(emp.email || '');
    setResultadoAcceso(null);
    setModalAccesoOpen(true);
  };

  const closeAccesoModal = () => {
    setModalAccesoOpen(false);
    setTargetEmpParaAcceso(null);
    setResultadoAcceso(null);
    setEmailAcceso('');
  };

  const handleSugerirUsuario = () => {
    if (!nombreCompleto.trim()) {
      toast.error('Ingresa primero el nombre completo para sugerir un usuario');
      return;
    }
    const sugerido = getPreviewUsuario(nombreCompleto);
    setUsuario(sugerido);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim()) {
      toast.error('El nombre completo es obligatorio');
      return;
    }
    if (!legajo.trim()) {
      toast.error('El número de legajo es obligatorio');
      return;
    }
    if (!puestoSector.trim()) {
      toast.error('El puesto o sector es obligatorio');
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Por favor ingresa un correo electrónico válido');
        return;
      }
    }
    saveMutation.mutate();
  };

  // Previsualizar / generar usuario estimado
  const getPreviewUsuario = (nombre: string) => {
    const sinTildes = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const parts = sinTildes.trim().toLowerCase().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'usuario';
    if (parts.length < 2) return parts[0].replace(/[^a-z0-9]/g, '');
    const inicial = parts[0][0];
    const apellido = parts[parts.length - 1];
    return `${inicial}${apellido}`.replace(/[^a-z0-9]/g, '');
  };

  const handleToggleEstado = (emp: Empleado) => {
    const accion = emp.activo ? 'desactivar' : 'activar';
    if (
      window.confirm(
        `¿Estás seguro de que deseas ${accion} al empleado "${emp.nombreCompleto}"?`
      )
    ) {
      toggleActivoMutation.mutate(emp.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Personal / Empleados</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Padrón de personal, gestión de cuentas, asignación de tareas y acceso móvil
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Personal</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.total}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{metrics.activos}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Inactivos</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-600 mt-1">{metrics.inactivos}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-600">Móvil Activo</span>
            <Smartphone className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-bold text-orange-600 mt-1">{metrics.conAccesoMovil}</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, legajo, puesto, usuario o email..."
            className={`${inputCls} pl-9`}
          />
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filtroEstado === 'todos'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({metrics.total})
          </button>
          <button
            onClick={() => setFiltroEstado('activos')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filtroEstado === 'activos'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Activos ({metrics.activos})
          </button>
          <button
            onClick={() => setFiltroEstado('inactivos')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filtroEstado === 'inactivos'
                ? 'bg-white text-slate-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactivos ({metrics.inactivos})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando personal...</div>
        ) : filteredEmpleados.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-medium text-sm">No se encontraron empleados</p>
            <p className="text-slate-400 text-xs mt-1">
              {search ? 'Intenta modificar el término de búsqueda o los filtros' : 'Aún no hay empleados registrados en esta categoría'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Legajo</th>
                  <th className="py-3 px-4">Empleado / Contacto</th>
                  <th className="py-3 px-4">Usuario Móvil</th>
                  <th className="py-3 px-4">Puesto / Sector</th>
                  <th className="py-3 px-4 text-center">Acceso Móvil</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmpleados.map((emp) => {
                  const tienePinConfig = emp.tienePin || emp.tienePinConfigurado;
                  const tieneAccesoMov = tienePinConfig || emp.pendienteActivacion || emp.tieneAccesoMovil;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !emp.activo ? 'bg-slate-50/60 opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                        {emp.legajo || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{emp.nombreCompleto}</div>
                        {emp.email ? (
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{emp.email}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">Sin correo registrado</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {emp.usuario ? (
                          <span className="inline-flex items-center space-x-1 font-mono text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            <span>@{emp.usuario}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Sin usuario</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{emp.puestoSector || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        {tienePinConfig ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Móvil Activo</span>
                            </span>
                          </div>
                        ) : tieneAccesoMov ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                              <Clock className="w-3 h-3" />
                              <span>Pendiente PIN</span>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Sin Acceso
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.activo
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {emp.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Botón Habilitar / Gestionar Acceso Móvil */}
                          <button
                            onClick={() => openAccesoModal(emp)}
                            disabled={!emp.activo}
                            className={`p-1.5 rounded-md border transition-colors flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                              tienePinConfig
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : tieneAccesoMov
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-700 border-slate-200 hover:border-orange-200'
                            }`}
                            title={
                              !emp.activo
                                ? 'Activa el empleado para gestionar acceso móvil'
                                : tieneAccesoMov
                                ? 'Reenviar enlace o gestionar acceso móvil'
                                : 'Habilitar acceso al Portal Móvil'
                            }
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold hidden md:inline">
                              {tienePinConfig
                                ? 'Reenviar'
                                : tieneAccesoMov
                                ? 'Reenviar Link'
                                : 'Acceso Móvil'}
                            </span>
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 transition-colors"
                            title="Editar todos los datos del empleado"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Desactivar / Activar */}
                          <button
                            onClick={() => handleToggleEstado(emp)}
                            disabled={toggleActivoMutation.isPending}
                            className={`p-1.5 rounded-md border transition-colors ${
                              emp.activo
                                ? 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                            }`}
                            title={emp.activo ? 'Desactivar empleado' : 'Activar empleado'}
                          >
                            {emp.activo ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Empleado (Todos los datos) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg border border-orange-100">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingEmp ? 'Modificar Empleado' : 'Registrar Nuevo Empleado'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingEmp
                      ? 'Actualiza todos los datos del personal, cuenta y estado'
                      : 'Ingresa los datos personales y de acceso del empleado'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className={labelCls}>
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className={inputCls}
                  required
                />
              </div>

              {/* Fila: Legajo y Puesto/Sector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    Número de Legajo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={legajo}
                    onChange={(e) => setLegajo(e.target.value)}
                    placeholder="Ej. LEG-1005"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Puesto / Sector <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={puestoSector}
                    onChange={(e) => setPuestoSector(e.target.value)}
                    placeholder="Ej. Mantenimiento Eléctrico"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Fila: Usuario y Botón Sugerir */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Nombre de Usuario (Login Móvil)
                  </label>
                  <button
                    type="button"
                    onClick={handleSugerirUsuario}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded transition-colors"
                    title="Generar nombre de usuario basado en el nombre completo"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sugerir Usuario</span>
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">@</span>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="ej. jperez"
                    className={`${inputCls} pl-7 font-mono`}
                    maxLength={50}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Identificador para que el operario ingrese a la aplicación móvil. Si se deja vacío, puede autogenerarse al habilitar el acceso.
                </p>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className={labelCls}>Correo Electrónico (Email)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. juan.perez@empresa.com"
                    className={`${inputCls} pl-9`}
                    maxLength={150}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Se utilizará para enviar el enlace de activación de PIN y notificaciones de órdenes de trabajo.
                </p>
              </div>

              {/* Estado Activo / Inactivo */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">Estado del Empleado</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activo
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {activo
                        ? 'El empleado puede ser asignado a tareas y acceder al portal móvil.'
                        : 'El empleado está desactivado. No figurará en asignaciones ni podrá iniciar sesión.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                </label>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
                >
                  {saveMutation.isPending
                    ? 'Guardando...'
                    : editingEmp
                    ? 'Guardar Cambios'
                    : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Habilitar Acceso Móvil */}
      {modalAccesoOpen && targetEmpParaAcceso && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 border border-orange-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Habilitar Acceso al Portal Móvil</h3>
                  <p className="text-xs text-slate-400">Autenticación por PIN para Operarios</p>
                </div>
              </div>
              <button
                onClick={closeAccesoModal}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Información del Operario */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Empleado:</span>
                  <span className="font-bold text-slate-900">
                    {targetEmpParaAcceso.nombreCompleto} (Legajo {targetEmpParaAcceso.legajo})
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Sector:</span>
                  <span className="text-slate-700">{targetEmpParaAcceso.puestoSector}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Usuario asignado:</span>
                  <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    @{targetEmpParaAcceso.usuario || getPreviewUsuario(targetEmpParaAcceso.nombreCompleto)}
                  </span>
                </div>
              </div>

              {/* Si ya se generó el resultado */}
              {resultadoAcceso ? (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>¡Acceso Móvil Generado Exitosamente!</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      El usuario <strong className="font-mono">@{resultadoAcceso.usuario}</strong> ha sido
                      habilitado.
                      {resultadoAcceso.emailEnviado
                        ? ` Se envió automáticamente el correo de activación a ${resultadoAcceso.email}.`
                        : ` Correo no enviado por configuración SMTP. Puedes copiar el enlace directo abajo:`}
                    </p>
                  </div>

                  {/* Enlace directo para copiar o probar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Enlace de Activación de PIN (Válido por 24 horas)
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        readOnly
                        value={resultadoAcceso.enlaceActivacion}
                        className="flex-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-700"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(resultadoAcceso.enlaceActivacion);
                          toast.success('¡Enlace copiado al portapapeles!');
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition"
                        title="Copiar enlace"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={resultadoAcceso.enlaceActivacion}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
                        title="Abrir pantalla de activación"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t">
                    <button
                      onClick={closeAccesoModal}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                    >
                      Listo / Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario para ingresar email y activar */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emailAcceso.trim()) {
                      toast.error('Por favor ingresa un correo electrónico válido');
                      return;
                    }
                    habilitarAccesoMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelCls}>
                      Correo Electrónico del Operario <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={emailAcceso}
                        onChange={(e) => setEmailAcceso(e.target.value)}
                        placeholder="ejemplo: operario@empresa.com"
                        className={`${inputCls} pl-9`}
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      El operario recibirá un correo con el enlace para crear su PIN numérico de 4 dígitos.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={closeAccesoModal}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={habilitarAccesoMutation.isPending || !emailAcceso.trim()}
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                    >
                      {habilitarAccesoMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Habilitando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Habilitar y Enviar Enlace</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
