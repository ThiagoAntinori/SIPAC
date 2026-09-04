import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ajustesApi, articulosApi } from '../services/api';
import toast from 'react-hot-toast';
import { SlidersHorizontal, Plus, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const inputCls = 'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-700 mb-1.5';

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

  const tipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'Alta': return 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold';
      case 'Baja': return 'bg-rose-50 text-rose-800 border border-rose-300 font-bold';
      default:     return 'bg-sky-50 text-sky-800 border border-sky-300 font-bold';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ajustes de Inventario</h1>
          <p className="text-slate-600 text-sm mt-0.5">Modificaciones manuales de stock auditadas con justificación obligatoria</p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center space-x-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Ajuste</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-600 text-sm">Cargando ajustes...</div>
        ) : ajustes.length === 0 ? (
          <div className="p-8 text-center">
            <SlidersHorizontal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">No hay ajustes registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {ajustes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-800 font-medium tabular-nums">
                      {format(new Date(a.fechaHora), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">{a.articuloNombre}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${tipoBadge(a.tipoAjuste)}`}>
                        {a.tipoAjuste}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {a.cantidad} {a.unidadMedida}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{a.motivo}</td>
                    <td className="py-3 px-4 text-slate-600 italic">{a.justificacion}</td>
                    <td className="py-3 px-4 text-slate-600">{a.usuarioNombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ajuste */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Registrar Ajuste de Stock</h3>
              </div>
              <button onClick={closeModal} className="p-1 text-slate-600 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{formError}</div>
                </div>
              )}

              {tipoAjuste === 'Baja' && selectedArticulo && cantidad > selectedArticulo.stockActual && (
                <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-md text-amber-800 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">
                    Atención: Descontar {cantidad} supera el stock actual disponible ({selectedArticulo.stockActual} {selectedArticulo.unidadMedida}).
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Artículo a Ajustar *</label>
                <select
                  value={articuloId}
                  onChange={(e) => { setArticuloId(Number(e.target.value)); setFormError(null); }}
                  className={inputCls}
                  required
                >
                  <option value={0} disabled>Seleccione artículo...</option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (Stock actual: {a.stockActual} {a.unidadMedida}) {!a.esFraccionable ? '[Solo Enteros]' : ''}
                    </option>
                  ))}
                </select>
                {selectedArticulo && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    Stock actual:{' '}
                    <span className="font-mono font-bold text-slate-700">{selectedArticulo.stockActual} {selectedArticulo.unidadMedida}</span>
                    <span className="ml-2 text-slate-600">
                      ({selectedArticulo.esFraccionable ? 'Fraccionable con decimales' : 'No fraccionable, solo enteros'})
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tipo de Ajuste *</label>
                  <select
                    value={tipoAjuste}
                    onChange={(e) => { setTipoAjuste(e.target.value as any); setFormError(null); }}
                    className={inputCls}
                  >
                    <option value="Recuento">Recuento Físico (Fijar stock exacto)</option>
                    <option value="Alta">Alta (Sumar al stock)</option>
                    <option value="Baja">Baja / Merma (Restar del stock)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`${labelCls} mb-0`}>
                      {tipoAjuste === 'Recuento' ? 'Stock Contado Real' : 'Cantidad a Ajustar'} *
                    </label>
                    <span className="text-[10px] text-slate-600 font-mono">
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
                    className={`${inputCls} font-mono text-right`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Motivo Principal *</label>
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
                  <option value="Recuento de inventario físico">Recuento de inventario físico</option>
                  <option value="Material dañado o vencido">Material dañado o vencido</option>
                  <option value="Diferencia de remito">Diferencia de remito</option>
                  <option value="Corrección de carga manual">Corrección de carga manual</option>
                  <option value="Devolución no utilizada">Devolución no utilizada</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Justificación Auditada *</label>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Detalle el motivo específico del ajuste..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
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
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
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
