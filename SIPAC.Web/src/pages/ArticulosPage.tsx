import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articulosApi, categoriasApi } from '../services/api';
import { Articulo } from '../types';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Power,
  AlertTriangle,
  X,
  Boxes,
} from 'lucide-react';

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
      toast.error(err.response?.data?.message || 'Error al guardar el artículo');
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
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingArticulo(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Pañol / Artículos</h1>
          <p className="text-slate-400 text-sm">Catálogo de insumos, materiales y control de existencias</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Artículo</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de artículo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={categoriaId || ''}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center space-x-2 text-xs font-semibold text-amber-400 bg-amber-950/20 border border-amber-900/40 px-3 py-2 rounded-lg cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={soloCriticos}
            onChange={(e) => setSoloCriticos(e.target.checked)}
            className="rounded border-slate-800 text-amber-500 focus:ring-amber-500"
          />
          <span>Solo Stock Bajo</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando artículos...</div>
        ) : articulos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No se encontraron artículos con los filtros aplicados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Fraccionable</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Stock Mínimo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {articulos.map((a) => {
                  const isLow = a.stockActual <= a.stockMinimo;
                  return (
                    <tr key={a.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{a.nombre}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{a.categoriaNombre}</td>
                      <td className="py-3 px-4 text-center text-slate-400">
                        {a.esFraccionable ? 'Sí' : 'No'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={`font-bold ${
                            isLow ? 'text-red-400 font-extrabold' : 'text-slate-200'
                          }`}
                        >
                          {a.stockActual} {a.unidadMedida}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {a.stockMinimo} {a.unidadMedida}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Bajo</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(a)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-lg border border-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(a.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            a.activo
                              ? 'bg-slate-900 hover:bg-red-950 text-red-400 border-slate-800'
                              : 'bg-slate-900 hover:bg-emerald-950 text-emerald-400 border-slate-800'
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-400" />
                <span>{editingArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}</span>
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre del Material / Insumo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Cinta Aisladora 3M 20m"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría / Rubro *</label>
                  <select
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unidad de Medida *</label>
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
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
                    <label className="block text-slate-300 font-semibold mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={stockActual}
                      onChange={(e) => setStockActual(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className={editingArticulo ? 'col-span-2' : ''}>
                  <label className="block text-slate-300 font-semibold mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="esFraccionable"
                  checked={esFraccionable}
                  onChange={(e) => setEsFraccionable(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="esFraccionable" className="text-slate-300 cursor-pointer">
                  Permite egresos fraccionados (decimales como 1.5 metros)
                </label>
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
