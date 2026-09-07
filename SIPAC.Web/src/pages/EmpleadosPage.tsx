import React, { useState } from 'react';
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

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingEmp) {
        return empleadosApi.update(editingEmp.id, {
          nombreCompleto,
          legajo,
          puestoSector,
          activo: editingEmp.activo,
        });
      } else {
        return empleadosApi.create({
          nombreCompleto,
          legajo,
          puestoSector,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleadosList'] });
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
      toast.success(editingEmp ? 'Empleado actualizado' : 'Empleado registrado');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al guardar el empleado');
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
    setModalOpen(true);
  };

  const openEditModal = (emp: Empleado) => {
    setEditingEmp(emp);
    setNombreCompleto(emp.nombreCompleto);
    setLegajo(emp.legajo);
    setPuestoSector(emp.puestoSector);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !legajo.trim() || !puestoSector.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    saveMutation.mutate();
  };

  // Previsualizar usuario estimado
  const getPreviewUsuario = (nombre: string) => {
    const parts = nombre.trim().toLowerCase().split(/\s+/);
    if (parts.length < 2) return parts[0] || 'usuario';
    return `${parts[0][0]}${parts[parts.length - 1]}`.replace(/[^a-z0-9]/g, '');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Personal / Empleados</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Padrón de empleados autorizados para retiro de insumos y acceso móvil de operarios
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

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando personal...</div>
        ) : empleados.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No hay empleados registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Legajo</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Puesto / Sector</th>
                  <th className="py-3 px-4 text-center">Acceso Móvil</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empleados.map((emp) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-50 transition-colors ${!emp.activo ? 'opacity-50' : ''}`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                      {emp.legajo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{emp.nombreCompleto}</div>
                      {emp.email && <div className="text-[11px] text-slate-400">{emp.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{emp.puestoSector}</td>
                    <td className="py-3 px-4 text-center">
                      {emp.tienePinConfigurado ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Móvil Activo</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                            @{emp.usuario}
                          </span>
                        </div>
                      ) : emp.tieneAccesoMovil ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>Pendiente PIN</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                            @{emp.usuario}
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
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.activo
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-300 font-bold text-xs'
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
                          className={`p-1.5 rounded-md border transition-colors flex items-center space-x-1 ${
                            emp.tienePinConfigurado
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : emp.tieneAccesoMovil
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-700 border-slate-200 hover:border-orange-200'
                          }`}
                          title={
                            emp.tieneAccesoMovil
                              ? 'Reenviar enlace o gestionar acceso móvil'
                              : 'Habilitar acceso al Portal Móvil'
                          }
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold hidden md:inline">
                            {emp.tienePinConfigurado
                              ? 'Reenviar'
                              : emp.tieneAccesoMovil
                              ? 'Reenviar Link'
                              : 'Acceso Móvil'}
                          </span>
                        </button>

                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Empleado */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editingEmp ? 'Editar Empleado' : 'Registrar Empleado'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className={labelCls}>Nombre Completo *</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Número de Legajo *</label>
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
                <label className={labelCls}>Puesto / Sector *</label>
                <input
                  type="text"
                  value={puestoSector}
                  onChange={(e) => setPuestoSector(e.target.value)}
                  placeholder="Ej. Mantenimiento Eléctrico"
                  className={inputCls}
                  required
                />
              </div>

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
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
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
