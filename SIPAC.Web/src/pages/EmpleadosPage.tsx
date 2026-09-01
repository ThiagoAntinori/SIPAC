import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empleadosApi } from '../services/api';
import { Empleado } from '../types';
import toast from 'react-hot-toast';
import { Users, Plus, Edit2, Power, X, Briefcase, BadgeCheck } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Personal / Empleados</h1>
          <p className="text-slate-400 text-sm">Padrón de empleados autorizados para retiro de insumos</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Empleado</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando personal...</div>
        ) : empleados.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay empleados registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Legajo</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Puesto / Sector</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{emp.legajo}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{emp.nombreCompleto}</td>
                    <td className="py-3 px-4 text-slate-400">{emp.puestoSector}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.activo
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg border border-slate-800"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingEmp ? 'Editar Empleado' : 'Registrar Empleado'}</span>
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número de Legajo *</label>
                <input
                  type="text"
                  value={legajo}
                  onChange={(e) => setLegajo(e.target.value)}
                  placeholder="Ej. LEG-1005"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Puesto / Sector *</label>
                <input
                  type="text"
                  value={puestoSector}
                  onChange={(e) => setPuestoSector(e.target.value)}
                  placeholder="Ej. Mantenimiento Eléctrico"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30"
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
