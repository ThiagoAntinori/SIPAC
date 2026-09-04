import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empleadosApi } from '../services/api';
import { Empleado } from '../types';
import toast from 'react-hot-toast';
import { Users, Plus, Edit2, Power, X } from 'lucide-react';

const inputCls = 'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-700 mb-1.5';

export const EmpleadosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Empleado | null>(null);

  // Form states
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [legajo, setLegajo] = useState('');
  const [puestoSector, setPuestoSector] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !legajo.trim() || !puestoSector.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Personal / Empleados</h1>
          <p className="text-slate-600 text-sm mt-0.5">Padrón de empleados autorizados para retiro de insumos</p>
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
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empleados.map((emp) => (
                  <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${!emp.activo ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">{emp.legajo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">{emp.nombreCompleto}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{emp.puestoSector}</td>
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
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
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
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
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
    </div>
  );
};
