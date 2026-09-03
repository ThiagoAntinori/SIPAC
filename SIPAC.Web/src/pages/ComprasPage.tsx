import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comprasApi, articulosApi } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowDownLeft, Plus, Trash2, X, Receipt, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ItemRow {
  articuloId: number;
  cantidadRecibida: number;
}

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
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Compras e Ingresos</h1>
          <p className="text-slate-400 text-sm">Registro de facturas, remitos y reposición de stock</p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nueva Compra</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando compras...</div>
        ) : compras.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay compras registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">N° Comprobante</th>
                  <th className="py-3 px-4">Fecha Compra</th>
                  <th className="py-3 px-4">Cargado Por</th>
                  <th className="py-3 px-4">Artículos Recibidos</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{c.nroComprobante}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {format(new Date(c.fechaCompra), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.usuarioNombre}</td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {c.detalles.map((d, i) => (
                          <div key={i} className="flex items-center space-x-2 text-slate-200">
                            <span className="font-semibold">{d.articuloNombre}</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              +{d.cantidadRecibida} {d.unidadMedida}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 italic">{c.observacionesDiferencia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Compra */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Registrar Comprobante de Compra</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">N° Comprobante / Factura / Remito *</label>
                  <input
                    type="text"
                    value={nroComprobante}
                    onChange={(e) => {
                      setNroComprobante(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Ej. FC-A-0001-0004523"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fecha de Emisión *</label>
                  <input
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => {
                      setFechaCompra(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 font-semibold">Detalle de Materiales Recibidos *</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                  {items.map((item, idx) => {
                    const art = articulos.find((a) => a.id === item.articuloId);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="flex-1">
                          <select
                            value={item.articuloId}
                            onChange={(e) => updateItemRow(idx, 'articuloId', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                            required
                          >
                            <option value={0} disabled>
                              Seleccione un material...
                            </option>
                            {articulos.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre} ({a.unidadMedida}) {!a.esFraccionable ? '[Solo Enteros]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-32">
                          <div className="relative">
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
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 font-mono text-right"
                              required
                            />
                            {art && (
                              <span className="absolute -bottom-3.5 right-1 text-[9px] text-slate-500 font-mono">
                                {art.esFraccionable ? 'decimal' : 'entero'}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observaciones / Proveedor</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Proveedor: Ferretería Central. Entregado sin novedades."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/30"
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
