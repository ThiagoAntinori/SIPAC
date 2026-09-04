import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { egresosApi, articulosApi, ordenesApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Plus,
  Search,
  ClipboardList,
  Package,
  X,
  AlertTriangle,
  Minus,
} from 'lucide-react';
import { format } from 'date-fns';

const inputCls = 'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium';
const labelCls = 'block text-xs font-bold text-slate-800 mb-1.5';

export const SalidasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [articuloId, setArticuloId] = useState<number>(0);
  const [ordenTrabajoId, setOrdenTrabajoId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [observacion, setObservacion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: egresos = [], isLoading } = useQuery({
    queryKey: ['egresos'],
    queryFn: () => egresosApi.getAll(),
  });

  const { data: articulos = [] } = useQuery({
    queryKey: ['articulos'],
    queryFn: () => articulosApi.getAll(),
  });

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
      const msg = err.response?.data?.message || 'Error al registrar la salida';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const openModal = () => {
    setArticuloId(articulos[0]?.id || 0);
    setOrdenTrabajoId(ordenesDisponibles[0]?.idOt || '');
    setCantidad(1);
    setObservacion('');
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (selectedArticulo && !selectedArticulo.esFraccionable && (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-')) {
      e.preventDefault();
      setFormError(`El artículo '${selectedArticulo.nombre}' no es fraccionable: solo se admiten números enteros.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!articuloId) {
      const msg = 'Debe seleccionar un artículo para la salida.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (!ordenTrabajoId) {
      const msg = 'Debe asociar la salida a una Orden de Trabajo activa.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      const msg = 'La cantidad a entregar debe ser un número mayor a 0.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (selectedArticulo && !selectedArticulo.esFraccionable && cantidad % 1 !== 0) {
      const msg = `El artículo '${selectedArticulo.nombre}' no es fraccionable: no se permiten cantidades con decimales. Ingrese un valor entero.`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (selectedArticulo && cantidad > selectedArticulo.stockActual) {
      const msg = `Stock insuficiente: Desea entregar ${cantidad} ${selectedArticulo.unidadMedida}, pero solo hay ${selectedArticulo.stockActual} disponibles.`;
      setFormError(msg);
      toast.error(msg);
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

  const stockPct = selectedArticulo && selectedArticulo.stockActual > 0
    ? Math.min(Math.round((selectedArticulo.stockActual / (selectedArticulo.stockMinimo * 2 || 1)) * 100), 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Salidas y Consumos de Pañol</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Entrega de insumos y materiales vinculados a Órdenes de Trabajo
          </p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center space-x-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-bold shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Entrega de Material</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar egresos por artículo, UF, N° OT o responsable..."
            className="w-full pl-9 pr-4 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm font-medium">Cargando historial de salidas...</div>
        ) : filteredEgresos.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowUpRight className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-medium">No hay egresos registrados en el sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Artículo Entregado</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4">Orden de Trabajo</th>
                  <th className="py-3 px-4">Unidad Funcional</th>
                  <th className="py-3 px-4">Responsable / Receptor</th>
                  <th className="py-3 px-4">Despachado Por</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEgresos.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-mono font-medium tabular-nums">
                      {format(new Date(e.fechaHora), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">{e.articuloNombre}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm tabular-nums">
                      -{e.cantidad} {e.unidadMedida}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900">{e.numeroOT}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {e.unidadFuncionalDisplay || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{e.empleadoNombre || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{e.usuarioNombre}</td>
                    <td className="py-3 px-4 text-slate-600 italic">{e.observacion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Egreso */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <ArrowUpRight className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Registrar Salida / Despacho de Pañol</h3>
              </div>
              <button onClick={closeModal} className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-800 text-xs font-medium flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{formError}</div>
                </div>
              )}

              {selectedArticulo && cantidad > selectedArticulo.stockActual && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-900 text-xs font-medium flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    Atención: Desea entregar {cantidad} {selectedArticulo.unidadMedida}, pero el stock actual es de {selectedArticulo.stockActual} {selectedArticulo.unidadMedida}.
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Artículo a Entregar *</label>
                <select
                  value={articuloId}
                  onChange={(e) => {
                    setArticuloId(Number(e.target.value));
                    setFormError(null);
                  }}
                  className={inputCls}
                  required
                >
                  <option value={0} disabled>
                    Seleccione un artículo...
                  </option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (Stock: {a.stockActual} {a.unidadMedida}) {!a.esFraccionable ? '[Solo Enteros]' : ''}
                    </option>
                  ))}
                </select>

                {selectedArticulo && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-300 rounded-md">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-700 font-semibold">Stock disponible:</span>
                      <span className={`font-mono font-bold text-sm tabular-nums ${selectedArticulo.stockActual <= selectedArticulo.stockMinimo ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {selectedArticulo.stockActual} {selectedArticulo.unidadMedida}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${selectedArticulo.stockActual <= selectedArticulo.stockMinimo ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {selectedArticulo.esFraccionable ? 'Fraccionable con decimales' : 'No fraccionable, solo enteros'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Orden de Trabajo Destino (Activa) *</label>
                <select
                  value={ordenTrabajoId}
                  onChange={(e) => {
                    setOrdenTrabajoId(e.target.value);
                    setFormError(null);
                  }}
                  className={inputCls}
                  required
                >
                  <option value="" disabled>
                    Seleccione una OT activa...
                  </option>
                  {ordenesDisponibles.map((o) => (
                    <option key={o.idOt} value={o.idOt}>
                      {o.numeroOT} - {o.unidadFuncionalDisplay} ({o.categoriaNombre} - {o.responsableNombre})
                    </option>
                  ))}
                </select>
                {selectedOt && (
                  <div className="mt-2 p-2.5 bg-sky-50 border border-sky-300 rounded-md text-xs space-y-0.5">
                    <p className="text-slate-700 font-medium">
                      <span className="text-slate-500">Unidad Funcional:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedOt.unidadFuncionalDisplay}</span>
                    </p>
                    <p className="text-slate-700 font-medium">
                      <span className="text-slate-500">Responsable:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedOt.responsableNombre}</span>
                      {' · '}
                      <span className="text-slate-500">Rubro:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedOt.categoriaNombre}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`${labelCls} mb-0`}>
                    Cantidad a Entregar ({selectedArticulo?.unidadMedida || 'Unidad'}) *
                  </label>
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    {selectedArticulo?.esFraccionable ? 'Decimal o entero' : 'Solo enteros'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="h-9 w-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-md font-bold transition-colors shrink-0"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    step="any"
                    value={cantidad}
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setCantidad(val);
                      if (selectedArticulo && !selectedArticulo.esFraccionable && val % 1 !== 0) {
                        setFormError(`El artículo '${selectedArticulo.nombre}' no es fraccionable: solo se permiten números enteros.`);
                      } else {
                        setFormError(null);
                      }
                    }}
                    className="flex-1 px-3 h-9 text-center bg-white border border-slate-300 rounded-md text-slate-900 font-mono font-bold tabular-nums text-base focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setCantidad(cantidad + 1)}
                    className="h-9 w-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-md font-bold transition-colors shrink-0 text-sm"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCantidad(cantidad + 5)}
                    className="h-9 px-3 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-md font-bold transition-colors shrink-0 text-xs"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Observaciones / Motivo</label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej. Insumos para cambio de tramo de caño en cocina..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-bold shadow-xs transition-all duration-150 active:scale-[0.99]"
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
