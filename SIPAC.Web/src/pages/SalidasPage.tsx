import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { egresosApi, articulosApi, ordenesApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Plus,
  Search,
  User,
  ClipboardList,
  Package,
  X,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

export const SalidasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [articuloId, setArticuloId] = useState<number>(0);
  const [ordenTrabajoId, setOrdenTrabajoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(1);
  const [observacion, setObservacion] = useState('');

  const { data: egresos = [], isLoading } = useQuery({
    queryKey: ['egresos'],
    queryFn: () => egresosApi.getAll(),
  });

  const { data: articulos = [] } = useQuery({
    queryKey: ['articulos'],
    queryFn: () => articulosApi.getAll(),
  });

  // Solo OTs activas (Pendiente o En Proceso) para despachos
  const { data: ordenes = [] } = useQuery({
    queryKey: ['ordenesActivas'],
    queryFn: () => ordenesApi.getAll({ estado: undefined }),
  });

  const ordenesDisponibles = ordenes.filter(
    (o) => o.estado === 'Pendiente' || o.estado === 'En Proceso'
  );

  const selectedArticulo = articulos.find((a) => a.id === articuloId);
  const selectedOt = ordenes.find((o) => o.idOt === ordenTrabajoId);

  const createMutation = useMutation({
    mutationFn: async () => {
      return egresosApi.create({
        articuloId,
        ordenTrabajoId,
        cantidad,
        observacion,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['egresos'] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success('Salida de material registrada y descontada del inventario');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al registrar la salida');
    },
  });

  const openModal = () => {
    setArticuloId(articulos[0]?.id || 0);
    setOrdenTrabajoId(ordenesDisponibles[0]?.idOt || 0);
    setCantidad(1);
    setObservacion('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articuloId || !ordenTrabajoId || cantidad <= 0) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }
    if (selectedArticulo && cantidad > selectedArticulo.stockActual) {
      toast.error(`Stock insuficiente. Disponible: ${selectedArticulo.stockActual} ${selectedArticulo.unidadMedida}`);
      return;
    }
    createMutation.mutate();
  };

  const filteredEgresos = egresos.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.articuloNombre.toLowerCase().includes(s) ||
      e.numeroOT.toLowerCase().includes(s) ||
      e.unidadFuncionalDisplay.toLowerCase().includes(s) ||
      e.empleadoNombre.toLowerCase().includes(s) ||
      (e.observacion && e.observacion.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Salidas y Consumos de Pañol</h1>
          <p className="text-slate-400 text-sm">
            Entrega de insumos y materiales vinculados directamente a Órdenes de Trabajo y UFs
          </p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Entrega de Material</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar egresos por artículo, UF, N° OT o responsable..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando historial de salidas...</div>
        ) : filteredEgresos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay egresos registrados en el sistema.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Artículo Entregado</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4">Orden de Trabajo Destino</th>
                  <th className="py-3 px-4">Unidad Funcional</th>
                  <th className="py-3 px-4">Responsable / Receptor</th>
                  <th className="py-3 px-4">Despachado Por</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEgresos.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {format(new Date(e.fechaHora), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{e.articuloNombre}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                      -{e.cantidad} {e.unidadMedida}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-blue-400 font-semibold">{e.numeroOT}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 font-medium">
                        {e.unidadFuncionalDisplay || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{e.empleadoNombre || '-'}</td>
                    <td className="py-3 px-4 text-slate-400">{e.usuarioNombre}</td>
                    <td className="py-3 px-4 text-slate-400 italic">{e.observacion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Egreso */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <ArrowUpRight className="w-5 h-5 text-blue-400" />
                <span>Registrar Salida / Despacho de Pañol</span>
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Artículo a Entregar *</label>
                <select
                  value={articuloId}
                  onChange={(e) => setArticuloId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value={0} disabled>
                    Seleccione un artículo...
                  </option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (Stock: {a.stockActual} {a.unidadMedida})
                    </option>
                  ))}
                </select>
                {selectedArticulo && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Stock disponible:{' '}
                    <span className="font-mono text-emerald-400 font-bold">
                      {selectedArticulo.stockActual} {selectedArticulo.unidadMedida}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Orden de Trabajo Destino (Activa) *
                </label>
                <select
                  value={ordenTrabajoId}
                  onChange={(e) => setOrdenTrabajoId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value={0} disabled>
                    Seleccione una OT activa...
                  </option>
                  {ordenesDisponibles.map((o) => (
                    <option key={o.idOt} value={o.idOt}>
                      {o.numeroOT} - {o.unidadFuncionalDisplay} ({o.categoriaNombre} - {o.responsableNombre})
                    </option>
                  ))}
                </select>
                {selectedOt && (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg mt-2 text-[11px] space-y-0.5">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Unidad Funcional:</span>{' '}
                      <span className="font-semibold text-white">{selectedOt.unidadFuncionalDisplay}</span>
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Responsable:</span>{' '}
                      <span className="font-semibold text-white">{selectedOt.responsableNombre}</span> •{' '}
                      <span className="text-slate-500">Rubro:</span>{' '}
                      <span className="font-semibold text-white">{selectedOt.categoriaNombre}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cantidad a Entregar ({selectedArticulo?.unidadMedida || 'Unidad'}) *
                </label>
                <input
                  type="number"
                  step={selectedArticulo?.esFraccionable ? '0.01' : '1'}
                  min="0.01"
                  max={selectedArticulo?.stockActual}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observaciones / Motivo</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej. Insumos para cambio de tramo de caño en cocina..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-blue-600/30"
                >
                  {createMutation.isPending ? 'Procesando...' : 'Confirmar Salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
