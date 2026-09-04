import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articulosApi, categoriasApi } from '../services/api';
import { Articulo } from '../types';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Power,
  AlertTriangle,
  X,
  Tags,
} from 'lucide-react';

const inputCls = 'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium';
const labelCls = 'block text-xs font-bold text-slate-800 mb-1.5';

export const ArticulosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [soloCriticos, setSoloCriticos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [formCategoriaId, setFormCategoriaId] = useState<number>(1);
  const [unidadMedida, setUnidadMedida] = useState('Unidad');
  const [esFraccionable, setEsFraccionable] = useState(false);
  const [stockActual, setStockActual] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(5);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: articulos = [], isLoading } = useQuery({
    queryKey: ['articulos', search, categoriaId, soloCriticos],
    queryFn: () => articulosApi.getAll({ search, categoriaId, soloCriticos }),
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getAll,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingArticulo) {
        return articulosApi.update(editingArticulo.id, {
          nombre,
          categoriaId: formCategoriaId,
          unidadMedida,
          esFraccionable,
          stockMinimo,
          activo: editingArticulo.activo,
        });
      } else {
        return articulosApi.create({
          nombre,
          categoriaId: formCategoriaId,
          unidadMedida,
          esFraccionable,
          stockActual,
          stockMinimo,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success(editingArticulo ? 'Artículo actualizado' : 'Artículo creado exitosamente');
      closeModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Error al guardar el artículo';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => articulosApi.toggleActivo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      toast.success('Estado del artículo modificado');
    },
  });

  const openCreateModal = () => {
    setEditingArticulo(null);
    setNombre('');
    setFormCategoriaId(categorias[0]?.id || 1);
    setUnidadMedida('Unidad');
    setEsFraccionable(false);
    setStockActual(0);
    setStockMinimo(5);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (a: Articulo) => {
    setEditingArticulo(a);
    setNombre(a.nombre);
    setFormCategoriaId(a.categoriaId);
    setUnidadMedida(a.unidadMedida);
    setEsFraccionable(a.esFraccionable);
    setStockActual(a.stockActual);
    setStockMinimo(a.stockMinimo);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingArticulo(null);
    setFormError(null);
  };

  const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!esFraccionable && (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-')) {
      e.preventDefault();
      setFormError('Este artículo no es fraccionable: solo se admiten números enteros.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim()) {
      const msg = 'El nombre del material / insumo es obligatorio.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (!editingArticulo && (isNaN(stockActual) || stockActual < 0)) {
      const msg = 'El stock inicial debe ser un número mayor o igual a 0.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
      const msg = 'El stock mínimo debe ser un número mayor o igual a 0.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (!esFraccionable) {
      if (!editingArticulo && stockActual % 1 !== 0) {
        const msg = 'Este artículo no es fraccionable: el stock inicial debe ser un número entero (sin decimales).';
        setFormError(msg);
        toast.error(msg);
        return;
      }
      if (stockMinimo % 1 !== 0) {
        const msg = 'Este artículo no es fraccionable: el stock mínimo debe ser un número entero (sin decimales).';
        setFormError(msg);
        toast.error(msg);
        return;
      }
      if (editingArticulo && editingArticulo.stockActual % 1 !== 0) {
        const msg = `No se puede guardar como no fraccionable porque el stock actual (${editingArticulo.stockActual}) tiene decimales. Ajuste el stock primero.`;
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    saveMutation.mutate();
  };

  const stockProgress = (actual: number, minimo: number) => {
    if (minimo === 0) return 100;
    const ratio = actual / (minimo * 2);
    return Math.min(Math.round(ratio * 100), 100);
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pañol / Artículos</h1>
          <p className="text-slate-600 text-sm mt-0.5">Catálogo de insumos, materiales y control de existencias</p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/categorias?tab=articulos"
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-xs font-bold shadow-xs transition-all duration-150"
          >
            <Tags className="w-3.5 h-3.5 text-slate-500" />
            <span>Categorías</span>
          </Link>

          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-bold shadow-xs transition-all duration-150 active:scale-[0.99]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Artículo</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de artículo..."
            className="w-full pl-9 pr-4 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
          />
        </div>

        <div className="w-full md:w-52">
          <select
            value={categoriaId || ''}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center space-x-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 h-9 rounded-md cursor-pointer shrink-0 transition-colors hover:bg-amber-100">
          <input
            type="checkbox"
            checked={soloCriticos}
            onChange={(e) => setSoloCriticos(e.target.checked)}
            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          <span>Solo Stock Bajo</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm font-medium">Cargando artículos...</div>
        ) : articulos.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-medium">No se encontraron artículos con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Fraccionable</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Stock Mínimo</th>
                  <th className="py-3 px-4 text-center w-28">Nivel</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articulos.map((a) => {
                  const isLow = a.stockActual <= a.stockMinimo;
                  const progress = stockProgress(a.stockActual, a.stockMinimo);
                  return (
                    <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${!a.activo ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm">{a.nombre}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{a.categoriaNombre}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.esFraccionable ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {a.esFraccionable ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-bold text-sm tabular-nums ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                          {a.stockActual} {a.unidadMedida}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 font-medium tabular-nums">
                        {a.stockMinimo} {a.unidadMedida}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{a.stockActual <= 0 ? 'Sin Stock' : 'Stock Bajo'}</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-md border border-slate-300 transition-colors shadow-xs"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(a.id)}
                          className={`p-1.5 rounded-md border transition-colors shadow-xs ${
                            a.activo
                              ? 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border-slate-300 hover:border-rose-300'
                              : 'bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border-slate-300 hover:border-emerald-300'
                          }`}
                          title={a.activo ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <Package className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}
                </h3>
              </div>
              <button onClick={closeModal} className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} noValidate className="px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-800 text-xs font-medium flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{formError}</div>
                </div>
              )}

              <div>
                <label className={labelCls}>Nombre del Material / Insumo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); if (formError) setFormError(null); }}
                  placeholder="Ej. Cinta Aisladora 3M 20m"
                  className={inputCls}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Categoría / Rubro *</label>
                  <select
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(Number(e.target.value))}
                    className={inputCls}
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Unidad de Medida *</label>
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className={inputCls}
                  >
                    <option value="Unidad">Unidad (u)</option>
                    <option value="Metro">Metro (m)</option>
                    <option value="Litro">Litro (L)</option>
                    <option value="Kg">Kilogramo (kg)</option>
                    <option value="Rollo">Rollo</option>
                    <option value="Par">Par</option>
                    <option value="Bolsa">Bolsa</option>
                    <option value="Tira">Tira (4m / 6m)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editingArticulo && (
                  <div>
                    <label className={labelCls}>
                      Stock Inicial <span className="text-slate-500 font-medium">({esFraccionable ? 'decimal' : 'entero'})</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stockActual}
                      onKeyDown={handleIntegerKeyDown}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setStockActual(val);
                        if (!esFraccionable && val % 1 !== 0) {
                          setFormError('Los artículos no fraccionables solo permiten números enteros en el stock inicial.');
                        } else {
                          setFormError(null);
                        }
                      }}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                )}

                <div className={editingArticulo ? 'col-span-2' : ''}>
                  <label className={labelCls}>
                    Stock Mínimo (Alerta) <span className="text-slate-500 font-medium">({esFraccionable ? 'decimal' : 'entero'})</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stockMinimo}
                    onKeyDown={handleIntegerKeyDown}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setStockMinimo(val);
                      if (!esFraccionable && val % 1 !== 0) {
                        setFormError('Los artículos no fraccionables solo permiten números enteros en el stock mínimo.');
                      } else {
                        setFormError(null);
                      }
                    }}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2.5 pt-1 cursor-pointer group">
                <input
                  type="checkbox"
                  id="esFraccionable"
                  checked={esFraccionable}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEsFraccionable(checked);
                    if (!checked) {
                      if ((!editingArticulo && stockActual % 1 !== 0) || stockMinimo % 1 !== 0) {
                        setFormError('Atención: Al quitar fraccionable, los campos de stock deben ser números enteros.');
                      } else {
                        setFormError(null);
                      }
                    } else {
                      setFormError(null);
                    }
                  }}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors select-none">
                  Permite egresos fraccionados (decimales como 1.5 metros)
                </span>
              </label>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-bold shadow-xs transition-all duration-150 active:scale-[0.99]"
                >
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
