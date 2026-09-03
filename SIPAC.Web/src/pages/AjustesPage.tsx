import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ajustesApi, articulosApi } from '../services/api';
import toast from 'react-hot-toast';
import { SlidersHorizontal, Plus, X, AlertOctagon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export const AjustesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [articuloId, setArticuloId] = useState<number>(0);
  const [tipoAjuste, setTipoAjuste] = useState<'Alta' | 'Baja' | 'Recuento'>('Recuento');
  const [cantidad, setCantidad] = useState<number>(0);
  const [motivo, setMotivo] = useState('Recuento de inventario físico');
  const [justificacion, setJustificacion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: ajustes = [], isLoading } = useQuery({
    queryKey: ['ajustes'],
    queryFn: ajustesApi.getAll,
  });

  const { data: articulos = [] } = useQuery({
    queryKey: ['articulos'],
    queryFn: () => articulosApi.getAll(),
  });

  const selectedArticulo = articulos.find((a) => a.id === articuloId);

  const createMutation = useMutation({
    mutationFn: () =>
      ajustesApi.create({
        articuloId,
        tipoAjuste,
        cantidad,
        motivo,
        justificacion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ajustes'] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success('Ajuste de inventario aplicado exitosamente');
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Error al procesar el ajuste';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const openModal = () => {
    setArticuloId(articulos[0]?.id || 0);
    setTipoAjuste('Recuento');
    setCantidad(0);
    setMotivo('Recuento de inventario físico');
    setJustificacion('');
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
      setFormError(`El artículo '${selectedArticulo.nombre}' no es fraccionable: solo se permiten números enteros.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!articuloId) {
      const msg = 'Debe seleccionar un artículo para ajustar.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (isNaN(cantidad) || cantidad < 0) {
      const msg = 'La cantidad no puede ser negativa.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (selectedArticulo && !selectedArticulo.esFraccionable && cantidad % 1 !== 0) {
      const msg = `El artículo '${selectedArticulo.nombre}' no es fraccionable: solo se permiten números enteros (sin decimales).`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (tipoAjuste === 'Baja' && selectedArticulo && cantidad > selectedArticulo.stockActual) {
      const msg = `Stock insuficiente para la baja: Desea descontar ${cantidad} ${selectedArticulo.unidadMedida}, pero el stock actual es de ${selectedArticulo.stockActual}.`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (!justificacion.trim()) {
      const msg = 'La justificación auditada es obligatoria.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Ajustes de Inventario</h1>
          <p className="text-slate-400 text-sm">Modificaciones manuales de stock auditadas con justificación obligatoria</p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Ajuste</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando ajustes...</div>
        ) : ajustes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay ajustes registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Justificación</th>
                  <th className="py-3 px-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ajustes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {format(new Date(a.fechaHora), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{a.articuloNombre}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.tipoAjuste === 'Alta'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : a.tipoAjuste === 'Baja'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}
                      >
                        {a.tipoAjuste}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                      {a.cantidad} {a.unidadMedida}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{a.motivo}</td>
                    <td className="py-3 px-4 text-slate-400 italic">{a.justificacion}</td>
                    <td className="py-3 px-4 text-slate-400">{a.usuarioNombre}</td>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                <span>Registrar Ajuste de Stock</span>
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{formError}</div>
                </div>
              )}

              {tipoAjuste === 'Baja' && selectedArticulo && cantidad > selectedArticulo.stockActual && (
                <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-xl text-amber-200 text-xs flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">
                    Atención: Descontar {cantidad} supera el stock actual disponible ({selectedArticulo.stockActual} {selectedArticulo.unidadMedida}).
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Artículo a Ajustar *</label>
                <select
                  value={articuloId}
                  onChange={(e) => {
                    setArticuloId(Number(e.target.value));
                    setFormError(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value={0} disabled>
                    Seleccione artículo...
                  </option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (Stock actual: {a.stockActual} {a.unidadMedida}) {!a.esFraccionable ? '[Solo Enteros]' : ''}
                    </option>
                  ))}
                </select>
                {selectedArticulo && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Stock actual:{' '}
                    <span className="font-mono text-blue-400 font-bold">
                      {selectedArticulo.stockActual} {selectedArticulo.unidadMedida}
                    </span>
                    <span className="ml-2 text-slate-500">
                      ({selectedArticulo.esFraccionable ? 'Fraccionable con decimales' : 'No fraccionable, solo enteros'})
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Ajuste *</label>
                  <select
                    value={tipoAjuste}
                    onChange={(e) => {
                      setTipoAjuste(e.target.value as any);
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Recuento">Recuento Físico (Fijar stock exacto)</option>
                    <option value="Alta">Alta (Sumar al stock)</option>
                    <option value="Baja">Baja / Merma (Restar del stock)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">
                      {tipoAjuste === 'Recuento' ? 'Stock Contado Real' : 'Cantidad a Ajustar'} *
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedArticulo?.esFraccionable ? 'Decimal o entero' : 'Solo enteros'}
                    </span>
                  </div>
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motivo Principal *</label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Recuento de inventario físico">Recuento de inventario físico</option>
                  <option value="Material dañado o vencido">Material dañado o vencido</option>
                  <option value="Diferencia de remito">Diferencia de remito</option>
                  <option value="Corrección de carga manual">Corrección de carga manual</option>
                  <option value="Devolución no utilizada">Devolución no utilizada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Justificación Auditada *</label>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Detalle el motivo específico del ajuste..."
                  rows={2}
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
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30"
                >
                  {createMutation.isPending ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
