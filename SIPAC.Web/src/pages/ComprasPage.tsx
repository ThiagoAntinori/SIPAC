import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comprasApi, articulosApi } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowDownLeft, Plus, Trash2, X, Receipt, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ItemRow {
  articuloId: number;
  cantidadRecibida: number;
}

const inputCls = 'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-700 mb-1.5';

export const ComprasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [nroComprobante, setNroComprobante] = useState('');
  const [fechaCompra, setFechaCompra] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ articuloId: 0, cantidadRecibida: 1 }]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras'],
    queryFn: comprasApi.getAll,
  });

  const { data: articulos = [] } = useQuery({
    queryKey: ['articulos'],
    queryFn: () => articulosApi.getAll(),
  });

  const addItemRow = () => {
    setItems([...items, { articuloId: articulos[0]?.id || 0, cantidadRecibida: 1 }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof ItemRow, val: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: val };
    setItems(copy);
    setFormError(null);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const item = items[idx];
    const art = articulos.find((a) => a.id === item.articuloId);
    if (art && !art.esFraccionable && (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-')) {
      e.preventDefault();
      setFormError(`El artículo '${art.nombre}' no es fraccionable: solo se permiten números enteros.`);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter((i) => i.articuloId > 0 && i.cantidadRecibida > 0);
      if (validItems.length === 0) throw new Error('Debe agregar al menos un artículo válido con cantidad mayor a 0');

      return comprasApi.create({
        nroComprobante,
        fechaCompra: new Date(fechaCompra).toISOString(),
        observacionesDiferencia: observaciones,
        detalles: validItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success('Compra ingresada y stock actualizado');
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Error al registrar la compra';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const openModal = () => {
    setNroComprobante('');
    setFechaCompra(format(new Date(), 'yyyy-MM-dd'));
    setObservaciones('');
    setItems([{ articuloId: articulos[0]?.id || 0, cantidadRecibida: 1 }]);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nroComprobante.trim()) {
      const msg = 'El número de comprobante es requerido.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (items.length === 0) {
      const msg = 'Debe incluir al menos un artículo recibido.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.articuloId || row.articuloId === 0) {
        const msg = `Fila #${i + 1}: Debe seleccionar un material o artículo.`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
      if (isNaN(row.cantidadRecibida) || row.cantidadRecibida <= 0) {
        const msg = `Fila #${i + 1}: La cantidad recibida debe ser mayor a 0.`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
      const art = articulos.find((a) => a.id === row.articuloId);
      if (art && !art.esFraccionable && row.cantidadRecibida % 1 !== 0) {
        const msg = `Fila #${i + 1}: El artículo '${art.nombre}' no es fraccionable: no admite cantidades con decimales. Ingrese un valor entero.`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    createMutation.mutate();
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Compras e Ingresos</h1>
          <p className="text-slate-700 font-medium text-sm mt-0.5">Registro de facturas, remitos y reposición de stock</p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Nueva Compra</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando compras...</div>
        ) : compras.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowDownLeft className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No hay compras registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">N° Comprobante</th>
                  <th className="py-3 px-4">Fecha Compra</th>
                  <th className="py-3 px-4">Cargado Por</th>
                  <th className="py-3 px-4">Artículos Recibidos</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-800 font-bold tabular-nums">{c.nroComprobante}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium font-mono font-medium tabular-nums">
                      {format(new Date(c.fechaCompra), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{c.usuarioNombre}</td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {c.detalles.map((d, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-700">{d.articuloNombre}</span>
                            <span className="font-mono font-bold text-emerald-600 tabular-nums">
                              +{d.cantidadRecibida} {d.unidadMedida}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic">{c.observacionesDiferencia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Compra */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-emerald-50 rounded-md">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Registrar Comprobante de Compra</h3>
              </div>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-700 font-medium rounded-md hover:bg-slate-100 transition-colors">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>N° Comprobante / Factura / Remito *</label>
                  <input
                    type="text"
                    value={nroComprobante}
                    onChange={(e) => { setNroComprobante(e.target.value); if (formError) setFormError(null); }}
                    placeholder="Ej. FC-A-0001-0004523"
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Fecha de Emisión *</label>
                  <input
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => { setFechaCompra(e.target.value); if (formError) setFormError(null); }}
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`${labelCls} mb-0`}>Detalle de Materiales Recibidos *</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {items.map((item, idx) => {
                    const art = articulos.find((a) => a.id === item.articuloId);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md">
                        <div className="flex-1">
                          <select
                            value={item.articuloId}
                            onChange={(e) => updateItemRow(idx, 'articuloId', Number(e.target.value))}
                            className="w-full px-2.5 h-8 bg-white border border-slate-300 rounded-md text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            required
                          >
                            <option value={0} disabled>Seleccione un material...</option>
                            {articulos.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre} ({a.unidadMedida}) {!a.esFraccionable ? '[Solo Enteros]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-28">
                          <input
                            type="number"
                            step="any"
                            value={item.cantidadRecibida}
                            onKeyDown={(e) => handleItemKeyDown(e, idx)}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              updateItemRow(idx, 'cantidadRecibida', val);
                              if (art && !art.esFraccionable && val % 1 !== 0) {
                                setFormError(`El artículo '${art.nombre}' no es fraccionable: solo se permiten enteros.`);
                              } else {
                                setFormError(null);
                              }
                            }}
                            placeholder="Cantidad"
                            className="w-full px-2.5 h-8 bg-white border border-slate-300 rounded-md text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-mono text-right transition-all"
                            required
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Observaciones / Proveedor</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Proveedor: Ferretería Central. Entregado sin novedades."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-200 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
                >
                  {createMutation.isPending ? 'Guardando...' : 'Confirmar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
