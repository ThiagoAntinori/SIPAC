import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { categoriasApi, categoriasTrabajoApi } from '../services/api';
import { Categoria, CategoriaTrabajo } from '../types';
import toast from 'react-hot-toast';
import {
  Tags,
  Package,
  ClipboardList,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  X,
  AlertTriangle,
  CheckCircle2,
  Layers,
  FolderTree,
  AlertCircle,
  Check,
} from 'lucide-react';

export const CategoriasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'articulos' | 'trabajo'
  const currentTab = (searchParams.get('tab') as 'articulos' | 'trabajo') || 'articulos';

  const setTab = (tab: 'articulos' | 'trabajo') => {
    setSearchParams({ tab });
  };

  // -------------------------------------------------------------
  // 1. ESTADO: CATEGORÍAS DE ARTÍCULOS (PAÑOL)
  // -------------------------------------------------------------
  const [searchArticulos, setSearchArticulos] = useState('');
  const [modalArticuloOpen, setModalArticuloOpen] = useState(false);
  const [editingArticuloCat, setEditingArticuloCat] = useState<Categoria | null>(null);
  const [nombreArticuloCat, setNombreArticuloCat] = useState('');
  const [deleteArticuloCat, setDeleteArticuloCat] = useState<Categoria | null>(null);

  // Queries Artículos
  const { data: categoriasArticulos = [], isLoading: isLoadingArticulos } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasApi.getAll,
  });

  // Filtrado Artículos
  const filteredCategoriasArticulos = useMemo(() => {
    return categoriasArticulos.filter((c) =>
      c.nombre.toLowerCase().includes(searchArticulos.toLowerCase())
    );
  }, [categoriasArticulos, searchArticulos]);

  // KPIs Artículos
  const statsArticulos = useMemo(() => {
    const total = categoriasArticulos.length;
    const conArticulos = categoriasArticulos.filter((c) => (c.cantidadArticulos || 0) > 0).length;
    const totalArticulos = categoriasArticulos.reduce(
      (acc, c) => acc + (c.cantidadArticulos || 0),
      0
    );
    return { total, conArticulos, totalArticulos };
  }, [categoriasArticulos]);

  // Mutaciones Artículos
  const saveArticuloCatMutation = useMutation({
    mutationFn: async () => {
      if (editingArticuloCat) {
        return categoriasApi.update(editingArticuloCat.id, { nombre: nombreArticuloCat.trim() });
      } else {
        return categoriasApi.create({ nombre: nombreArticuloCat.trim() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      toast.success(
        editingArticuloCat ? 'Categoría de artículo actualizada' : 'Categoría de artículo creada'
      );
      closeModalArticulo();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al guardar la categoría');
    },
  });

  const deleteArticuloCatMutation = useMutation({
    mutationFn: (id: number) => categoriasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      toast.success('Categoría de artículo eliminada');
      setDeleteArticuloCat(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al eliminar la categoría');
    },
  });

  const openCreateArticuloCat = () => {
    setEditingArticuloCat(null);
    setNombreArticuloCat('');
    setModalArticuloOpen(true);
  };

  const openEditArticuloCat = (cat: Categoria) => {
    setEditingArticuloCat(cat);
    setNombreArticuloCat(cat.nombre);
    setModalArticuloOpen(true);
  };

  const closeModalArticulo = () => {
    setModalArticuloOpen(false);
    setEditingArticuloCat(null);
    setNombreArticuloCat('');
  };

  // -------------------------------------------------------------
  // 2. ESTADO: RUBROS DE TRABAJO (ÓRDENES DE TRABAJO)
  // -------------------------------------------------------------
  const [searchTrabajo, setSearchTrabajo] = useState('');
  const [filtroEstadoTrabajo, setFiltroEstadoTrabajo] = useState<'todos' | 'activos' | 'inactivos'>(
    'todos'
  );
  const [modalTrabajoOpen, setModalTrabajoOpen] = useState(false);
  const [editingTrabajoCat, setEditingTrabajoCat] = useState<CategoriaTrabajo | null>(null);
  const [nombreTrabajoCat, setNombreTrabajoCat] = useState('');
  const [activoTrabajoCat, setActivoTrabajoCat] = useState(true);
  const [deleteTrabajoCat, setDeleteTrabajoCat] = useState<CategoriaTrabajo | null>(null);

  // Queries Rubros
  const { data: categoriasTrabajo = [], isLoading: isLoadingTrabajo } = useQuery({
    queryKey: ['categoriastrabajo', 'all'],
    queryFn: () => categoriasTrabajoApi.getAll({ soloActivas: false }),
  });

  // Filtrado Rubros
  const filteredCategoriasTrabajo = useMemo(() => {
    return categoriasTrabajo.filter((c) => {
      const matchSearch = c.nombre.toLowerCase().includes(searchTrabajo.toLowerCase());
      if (!matchSearch) return false;
      if (filtroEstadoTrabajo === 'activos') return c.activo;
      if (filtroEstadoTrabajo === 'inactivos') return !c.activo;
      return true;
    });
  }, [categoriasTrabajo, searchTrabajo, filtroEstadoTrabajo]);

  // KPIs Rubros
  const statsTrabajo = useMemo(() => {
    const total = categoriasTrabajo.length;
    const activos = categoriasTrabajo.filter((c) => c.activo).length;
    const totalOrdenes = categoriasTrabajo.reduce(
      (acc, c) => acc + (c.cantidadOrdenes || 0),
      0
    );
    return { total, activos, totalOrdenes };
  }, [categoriasTrabajo]);

  // Mutaciones Rubros
  const saveTrabajoCatMutation = useMutation({
    mutationFn: async () => {
      if (editingTrabajoCat) {
        return categoriasTrabajoApi.update(editingTrabajoCat.id, {
          nombre: nombreTrabajoCat.trim(),
          activo: activoTrabajoCat,
        });
      } else {
        return categoriasTrabajoApi.create({ nombre: nombreTrabajoCat.trim() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoriastrabajo'] });
      toast.success(editingTrabajoCat ? 'Rubro de trabajo actualizado' : 'Rubro de trabajo creado');
      closeModalTrabajo();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al guardar el rubro');
    },
  });

  const toggleActivoTrabajoMutation = useMutation({
    mutationFn: (cat: CategoriaTrabajo) =>
      categoriasTrabajoApi.update(cat.id, {
        nombre: cat.nombre,
        activo: !cat.activo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoriastrabajo'] });
      toast.success('Estado del rubro actualizado');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado');
    },
  });

  const deleteTrabajoCatMutation = useMutation({
    mutationFn: (id: string) => categoriasTrabajoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoriastrabajo'] });
      toast.success('Rubro de trabajo eliminado');
      setDeleteTrabajoCat(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al eliminar el rubro');
    },
  });

  const openCreateTrabajoCat = () => {
    setEditingTrabajoCat(null);
    setNombreTrabajoCat('');
    setActivoTrabajoCat(true);
    setModalTrabajoOpen(true);
  };

  const openEditTrabajoCat = (cat: CategoriaTrabajo) => {
    setEditingTrabajoCat(cat);
    setNombreTrabajoCat(cat.nombre);
    setActivoTrabajoCat(cat.activo);
    setModalTrabajoOpen(true);
  };

  const closeModalTrabajo = () => {
    setModalTrabajoOpen(false);
    setEditingTrabajoCat(null);
    setNombreTrabajoCat('');
    setActivoTrabajoCat(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Tags className="w-5 h-5 text-slate-500" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Categorías</h1>
          </div>
          <p className="text-slate-600 text-sm mt-0.5">
            Administración centralizada de categorías de artículos de pañol y rubros de órdenes de trabajo
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
          <button
            onClick={() => setTab('articulos')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentTab === 'articulos'
                ? 'bg-white text-orange-600 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Artículos (Pañol)</span>
          </button>
          <button
            onClick={() => setTab('trabajo')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentTab === 'trabajo'
                ? 'bg-white text-orange-600 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Rubros (Órdenes de Trabajo)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: CATEGORÍAS DE ARTÍCULOS (PAÑOL)                 */}
      {/* ========================================================= */}
      {currentTab === 'articulos' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center space-x-4 shadow-xs">
              <div className="p-2.5 bg-orange-50 border border-orange-200/60 text-orange-600 rounded-lg">
                <FolderTree className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Categorías</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{statsArticulos.total}</h3>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center space-x-4 shadow-xs">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/60 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Categorías en Uso</p>
                <h3 className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {statsArticulos.conArticulos}
                </h3>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center space-x-4 shadow-xs">
              <div className="p-2.5 bg-amber-50 border border-amber-200/60 text-amber-600 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Artículos Clasificados</p>
                <h3 className="text-2xl font-bold text-amber-700 tabular-nums">
                  {statsArticulos.totalArticulos}
                </h3>
              </div>
            </div>
          </div>

          {/* Action and Search Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchArticulos}
                onChange={(e) => setSearchArticulos(e.target.value)}
                placeholder="Buscar categoría de artículo por nombre..."
                className="w-full pl-9 pr-4 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <button
              onClick={openCreateArticuloCat}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Categoría</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            {isLoadingArticulos ? (
              <div className="p-8 text-center text-slate-400">Cargando categorías...</div>
            ) : filteredCategoriasArticulos.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No se encontraron categorías de artículos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-16 text-center">#</th>
                      <th className="py-3 px-4">Nombre de Categoría</th>
                      <th className="py-3 px-4 text-center">Artículos Asociados</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategoriasArticulos.map((cat, idx) => {
                      const count = cat.cantidadArticulos || 0;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-sm">{cat.nombre}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                count > 0
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200/60'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              <Package className="w-3 h-3" />
                              <span>{count} {count === 1 ? 'artículo' : 'artículos'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => openEditArticuloCat(cat)}
                              className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200 transition-colors inline-flex items-center space-x-1"
                              title="Editar nombre"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Editar</span>
                            </button>
                            <button
                              onClick={() => setDeleteArticuloCat(cat)}
                              className={`p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition-colors inline-flex items-center space-x-1 ${
                                count > 0
                                  ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={
                                count > 0
                                  ? `Tiene ${count} artículos vinculados`
                                  : 'Eliminar categoría'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Eliminar</span>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: RUBROS DE TRABAJO (ÓRDENES DE TRABAJO)           */}
      {/* ========================================================= */}
      {currentTab === 'trabajo' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center space-x-4 shadow-xs">
              <div className="p-2.5 bg-orange-50 border border-orange-200/60 text-orange-600 rounded-lg">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Rubros</p>
                <h3 className="text-2xl font-bold text-slate-900 tabular-nums">{statsTrabajo.total}</h3>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center space-x-4 shadow-xs">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/60 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Rubros Activos</p>
                <h3 className="text-2xl font-bold text-emerald-700 tabular-nums">{statsTrabajo.activos}</h3>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center space-x-4 shadow-xs">
              <div className="p-2.5 bg-sky-50 border border-sky-200/60 text-sky-600 rounded-lg">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Órdenes Vinculadas</p>
                <h3 className="text-2xl font-bold text-sky-700 tabular-nums">{statsTrabajo.totalOrdenes}</h3>
              </div>
            </div>
          </div>

          {/* Action and Search Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchTrabajo}
                onChange={(e) => setSearchTrabajo(e.target.value)}
                placeholder="Buscar rubro por especialidad / nombre..."
                className="w-full pl-9 pr-4 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              />
            </div>

            <div className="w-full md:w-48">
              <select
                value={filtroEstadoTrabajo}
                onChange={(e: any) => setFiltroEstadoTrabajo(e.target.value)}
                className="w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
              >
                <option value="todos">Todos los Estados</option>
                <option value="activos">Solo Activos</option>
                <option value="inactivos">Solo Inactivos</option>
              </select>
            </div>

            <button
              onClick={openCreateTrabajoCat}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Rubro</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            {isLoadingTrabajo ? (
              <div className="p-8 text-center text-slate-400">Cargando rubros de trabajo...</div>
            ) : filteredCategoriasTrabajo.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No se encontraron rubros de trabajo con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-16 text-center">#</th>
                      <th className="py-3 px-4">Rubro / Especialidad</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Órdenes Asociadas</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategoriasTrabajo.map((cat, idx) => {
                      const count = cat.cantidadOrdenes || 0;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-sm">{cat.nombre}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {cat.activo ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                                <Check className="w-3 h-3" />
                                <span>Activo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                                <span>Inactivo</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                count > 0
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              <ClipboardList className="w-3 h-3" />
                              <span>{count} {count === 1 ? 'orden' : 'órdenes'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => toggleActivoTrabajoMutation.mutate(cat)}
                              className={`p-1.5 rounded-lg border transition-colors inline-flex items-center space-x-1 ${
                                cat.activo
                                  ? 'bg-white border-emerald-200 text-emerald-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
                                  : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'
                              }`}
                              title={cat.activo ? 'Desactivar rubro' : 'Activar rubro'}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">
                                {cat.activo ? 'Desactivar' : 'Activar'}
                              </span>
                            </button>

                            <button
                              onClick={() => openEditTrabajoCat(cat)}
                              className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200 transition-colors inline-flex items-center space-x-1"
                              title="Editar rubro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Editar</span>
                            </button>

                            <button
                              onClick={() => setDeleteTrabajoCat(cat)}
                              className={`p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition-colors inline-flex items-center space-x-1 ${
                                count > 0
                                  ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={
                                count > 0
                                  ? `Tiene ${count} órdenes vinculadas`
                                  : 'Eliminar rubro'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Eliminar</span>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALES: CATEGORÍA DE ARTÍCULO (CREAR / EDITAR)           */}
      {/* ========================================================= */}
      {modalArticuloOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">
                  {editingArticuloCat ? 'Editar Categoría de Artículo' : 'Nueva Categoría de Artículo'}
                </h3>
              </div>
              <button
                onClick={closeModalArticulo}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nombreArticuloCat.trim()) {
                  toast.error('El nombre de la categoría es obligatorio');
                  return;
                }
                saveArticuloCatMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  value={nombreArticuloCat}
                  onChange={(e) => setNombreArticuloCat(e.target.value)}
                  placeholder="Ej: Sanitarios, Electricidad, Herramientas..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModalArticulo}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveArticuloCatMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
                >
                  {saveArticuloCatMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR CATEGORÍA DE ARTÍCULO */}
      {deleteArticuloCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3 text-red-400">
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Eliminar Categoría</h3>
                  <p className="text-xs text-slate-400">Acción irreversible</p>
                </div>
              </div>

              <p className="text-sm text-slate-300">
                ¿Estás seguro de que deseas eliminar la categoría{' '}
                <strong className="text-white font-semibold">"{deleteArticuloCat.nombre}"</strong>?
              </p>

              {(deleteArticuloCat.cantidadArticulos || 0) > 0 ? (
                <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200">
                    <p className="font-semibold">No se puede eliminar directamente:</p>
                    <p className="mt-1">
                      Esta categoría contiene actualmente{' '}
                      <strong>{deleteArticuloCat.cantidadArticulos} artículo(s)</strong> vinculados.
                      Debes reasignar o eliminar dichos artículos antes de poder eliminar la categoría.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Esta categoría no tiene artículos asociados y se puede eliminar de manera segura.
                </p>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteArticuloCat(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={
                    deleteArticuloCatMutation.isPending ||
                    (deleteArticuloCat.cantidadArticulos || 0) > 0
                  }
                  onClick={() => deleteArticuloCatMutation.mutate(deleteArticuloCat.id)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-600/20 disabled:opacity-40 transition-all"
                >
                  {deleteArticuloCatMutation.isPending ? 'Eliminando...' : 'Confirmar Eliminación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALES: RUBRO DE TRABAJO (CREAR / EDITAR)                */}
      {/* ========================================================= */}
      {modalTrabajoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">
                  {editingTrabajoCat ? 'Editar Rubro de Trabajo' : 'Nuevo Rubro de Trabajo'}
                </h3>
              </div>
              <button
                onClick={closeModalTrabajo}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nombreTrabajoCat.trim()) {
                  toast.error('El nombre del rubro es obligatorio');
                  return;
                }
                saveTrabajoCatMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nombre del Rubro / Especialidad *
                </label>
                <input
                  type="text"
                  value={nombreTrabajoCat}
                  onChange={(e) => setNombreTrabajoCat(e.target.value)}
                  placeholder="Ej: Plomería, Electricidad, Cerrajería, Albañilería..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {editingTrabajoCat && (
                <div className="pt-2">
                  <label className="flex items-center space-x-3 p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activoTrabajoCat}
                      onChange={(e) => setActivoTrabajoCat(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">Rubro Activo</p>
                      <p className="text-xs text-slate-400">
                        Los rubros activos están disponibles para nuevas órdenes de trabajo.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModalTrabajo}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveTrabajoCatMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
                >
                  {saveTrabajoCatMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR RUBRO DE TRABAJO */}
      {deleteTrabajoCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-3 text-red-400">
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Eliminar Rubro de Trabajo</h3>
                  <p className="text-xs text-slate-400">Acción irreversible</p>
                </div>
              </div>

              <p className="text-sm text-slate-300">
                ¿Estás seguro de que deseas eliminar el rubro{' '}
                <strong className="text-white font-semibold">"{deleteTrabajoCat.nombre}"</strong>?
              </p>

              {(deleteTrabajoCat.cantidadOrdenes || 0) > 0 ? (
                <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200">
                    <p className="font-semibold">No se puede eliminar directamente:</p>
                    <p className="mt-1">
                      Este rubro posee actualmente{' '}
                      <strong>{deleteTrabajoCat.cantidadOrdenes} orden(es) de trabajo</strong> asociadas
                      en el historial.
                    </p>
                    <p className="mt-2 text-slate-300">
                      Recomendación: En su lugar, puedes <strong>desactivarlo</strong> para que no aparezca
                      al crear nuevas órdenes de trabajo, preservando todo el historial previo.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Este rubro no tiene órdenes de trabajo asociadas y se puede eliminar de manera segura.
                </p>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTrabajoCat(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
                {(deleteTrabajoCat.cantidadOrdenes || 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      toggleActivoTrabajoMutation.mutate({
                        ...deleteTrabajoCat,
                        activo: true, // will be negated in toggle to false
                      });
                      setDeleteTrabajoCat(null);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-600/20 transition-all"
                  >
                    Desactivar Rubro
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={deleteTrabajoCatMutation.isPending}
                    onClick={() => deleteTrabajoCatMutation.mutate(deleteTrabajoCat.id)}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-600/20 disabled:opacity-40 transition-all"
                  >
                    {deleteTrabajoCatMutation.isPending ? 'Eliminando...' : 'Confirmar Eliminación'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

