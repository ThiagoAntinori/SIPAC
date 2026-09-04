import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ordenesApi,
  unidadesFuncionalesApi,
  responsablesApi,
  categoriasTrabajoApi,
} from '../services/api';
import { OrdenTrabajo, UnidadFuncional } from '../types';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  User,
  Wrench,
  History,
  Info,
  Edit3,
  Trash2,
  Package,
  Layers,
  FileText,
  Check,
  Tags,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Design tokens
const inputCls = 'w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium';
const labelCls = 'block text-xs font-bold text-slate-800 mb-1.5';
const selectCls = `${inputCls}`;

// Estado badge factory (light mode)
const estadoBadge = (estado: string) => {
  switch (estado) {
    case 'Finalizado':  return 'bg-emerald-50 text-emerald-900 border border-emerald-300';
    case 'En Proceso':  return 'bg-sky-50 text-sky-900 border border-sky-300';
    case 'Suspendido':  return 'bg-violet-50 text-violet-900 border border-violet-300';
    case 'Cancelado':   return 'bg-slate-100 text-slate-700 border border-slate-300';
    default:            return 'bg-amber-50 text-amber-950 border border-amber-300';
  }
};

// Bitácora operation badge
const bitacoraBadge = (tipo: string) => {
  switch (tipo) {
    case 'ALTA':          return 'bg-sky-50 text-sky-700 border border-sky-200';
    case 'CAMBIO_ESTADO': return 'bg-violet-50 text-violet-700 border border-violet-200';
    case 'BAJA_LOGICA':   return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:              return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
};

export const OrdenesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [rubroFilter, setRubroFilter] = useState<string>('');
  const [responsableFilter, setResponsableFilter] = useState<string>('');
  const [soloAlertas, setSoloAlertas] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Active OT for Edit / Detail / Delete
  const [selectedOt, setSelectedOt] = useState<OrdenTrabajo | null>(null);
  const [selectedUfIdForHistorial, setSelectedUfIdForHistorial] = useState<string | null>(null);

  // Quick Create Cascading State
  const [sectorSelected, setSectorSelected] = useState<string>('');
  const [pisoSelected, setPisoSelected] = useState<string>('');
  const [deptoSelected, setDeptoSelected] = useState<string>('');
  const [ufFinalId, setUfFinalId] = useState<string | null>(null);
  const [createResponsableId, setCreateResponsableId] = useState<string>('');
  const [createCategoriaId, setCreateCategoriaId] = useState<string>('');
  const [createProblema, setCreateProblema] = useState('');
  const [createObservaciones, setCreateObservaciones] = useState('');

  // Edit OT State
  const [editResponsableId, setEditResponsableId] = useState<string>('');
  const [editCategoriaId, setEditCategoriaId] = useState<string>('');
  const [editProblema, setEditProblema] = useState('');
  const [editSolucion, setEditSolucion] = useState('');
  const [editEstado, setEditEstado] = useState<string>('Pendiente');
  const [editObservaciones, setEditObservaciones] = useState('');

  // Status Change Quick Modal State
  const [quickStatusModalOpen, setQuickStatusModalOpen] = useState(false);
  const [quickStatusTarget, setQuickStatusTarget] = useState<string>('');
  const [quickStatusSolucion, setQuickStatusSolucion] = useState<string>('');

  // Queries
  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ['ordenes', estadoFilter, rubroFilter, responsableFilter, search, soloAlertas],
    queryFn: () =>
      ordenesApi.getAll({
        estado: estadoFilter || undefined,
        categoriaId: rubroFilter || undefined,
        responsableId: responsableFilter || undefined,
        soloAlertas: soloAlertas || undefined,
        search: search || undefined,
      }),
  });

  const { data: responsables = [] } = useQuery({
    queryKey: ['responsables'],
    queryFn: () => responsablesApi.getAll({ soloActivos: true }),
  });

  const { data: rubros = [] } = useQuery({
    queryKey: ['categoriastrabajo'],
    queryFn: () => categoriasTrabajoApi.getAll({ soloActivas: true }),
  });

  const { data: sectores = [] } = useQuery({
    queryKey: ['sectoresUf'],
    queryFn: unidadesFuncionalesApi.getSectores,
    enabled: createModalOpen,
  });

  const { data: pisos = [] } = useQuery({
    queryKey: ['pisosUf', sectorSelected],
    queryFn: () => unidadesFuncionalesApi.getPisos(sectorSelected),
    enabled: createModalOpen && Boolean(sectorSelected),
  });

  const { data: deptos = [] } = useQuery({
    queryKey: ['deptosUf', sectorSelected, pisoSelected],
    queryFn: () => unidadesFuncionalesApi.getDeptos(sectorSelected, pisoSelected),
    enabled: createModalOpen && Boolean(sectorSelected) && Boolean(pisoSelected),
  });

  const { data: historialUf, isLoading: isLoadingHistorial } = useQuery({
    queryKey: ['historialUf', selectedUfIdForHistorial],
    queryFn: () => unidadesFuncionalesApi.getHistorial(selectedUfIdForHistorial!),
    enabled: Boolean(selectedUfIdForHistorial),
  });

  const isLocal = sectorSelected.toUpperCase() === 'LOCAL';

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      ordenesApi.create({
        unidadFuncionalId: ufFinalId!,
        responsableId: createResponsableId,
        categoriaId: createCategoriaId,
        problemaReportado: createProblema,
        observaciones: createObservaciones,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success('¡Orden de Trabajo creada exitosamente!');
      closeCreateModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al crear la Orden de Trabajo');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      ordenesApi.update(selectedOt!.idOt, {
        responsableId: editResponsableId,
        categoriaId: editCategoriaId,
        problemaReportado: editProblema,
        solucionRealizada: editSolucion,
        estado: editEstado,
        observaciones: editObservaciones,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success('Orden de Trabajo actualizada correctamente');
      setEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar la OT');
    },
  });

  const changeEstadoMutation = useMutation({
    mutationFn: ({ id, estado, solucion }: { id: string; estado: string; solucion?: string }) =>
      ordenesApi.changeEstado(id, { estado, solucionRealizada: solucion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      toast.success('Estado de OT actualizado');
      setQuickStatusModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ordenesApi.delete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardResumen'] });
      if (data.tipoBaja === 'BAJA_FISICA') {
        toast.success('OT eliminada permanentemente (Baja Física)');
      } else {
        toast.success('OT dada de baja lógicamente (Cancelada)');
      }
      setDeleteModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al procesar la baja');
    },
  });

  // Handlers for Modals
  const openCreateModal = () => {
    setSectorSelected('');
    setPisoSelected('');
    setDeptoSelected('');
    setUfFinalId(null);
    setCreateResponsableId(responsables[0]?.id || '');
    setCreateCategoriaId(rubros[0]?.id || '');
    setCreateProblema('');
    setCreateObservaciones('');
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
  };

  const handleSectorChange = (sec: string) => {
    setSectorSelected(sec);
    setPisoSelected('');
    setDeptoSelected('');
    setUfFinalId(null);
  };

  const handlePisoChange = (piso: string) => {
    setPisoSelected(piso);
    setDeptoSelected('');
    if (sectorSelected.toUpperCase() === 'LOCAL') {
      unidadesFuncionalesApi.getDeptos('LOCAL', piso).then((data) => {
        if (data && data.length > 0) {
          setUfFinalId(data[0].id);
        }
      });
    } else {
      setUfFinalId(null);
    }
  };

  const handleDeptoChange = (depto: string) => {
    setDeptoSelected(depto);
    const match = deptos.find((d) => d.depto === depto);
    if (match) {
      setUfFinalId(match.id);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ufFinalId) {
      toast.error('Debe completar la selección de la Unidad Funcional');
      return;
    }
    if (!createResponsableId || !createCategoriaId || !createProblema.trim()) {
      toast.error('Complete todos los campos obligatorios (*)');
      return;
    }
    createMutation.mutate();
  };

  const openEditModal = (ot: OrdenTrabajo) => {
    setSelectedOt(ot);
    setEditResponsableId(ot.responsableId);
    setEditCategoriaId(ot.categoriaId);
    setEditProblema(ot.problemaReportado);
    setEditSolucion(ot.solucionRealizada || '');
    setEditEstado(ot.estado);
    setEditObservaciones(ot.observaciones || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editEstado === 'Finalizado' && !editSolucion.trim()) {
      toast.error('Para pasar la OT a Finalizado es obligatorio ingresar la Solución Realizada.');
      return;
    }
    updateMutation.mutate();
  };

  const openHistorialModal = (ufId: string) => {
    setSelectedUfIdForHistorial(ufId);
    setHistorialModalOpen(true);
  };

  const openDetalleModal = (ot: OrdenTrabajo) => {
    setSelectedOt(ot);
    setDetalleModalOpen(true);
  };

  const openDeleteModal = (ot: OrdenTrabajo) => {
    setSelectedOt(ot);
    setDeleteModalOpen(true);
  };

  const handleQuickStatusChange = (ot: OrdenTrabajo, newStatus: string) => {
    if (newStatus === 'Finalizado') {
      setSelectedOt(ot);
      setQuickStatusTarget('Finalizado');
      setQuickStatusSolucion(ot.solucionRealizada || '');
      setQuickStatusModalOpen(true);
    } else {
      changeEstadoMutation.mutate({ id: ot.idOt, estado: newStatus });
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = ordenes.length;
    const pendientes = ordenes.filter((o) => o.estado === 'Pendiente').length;
    const enProceso = ordenes.filter((o) => o.estado === 'En Proceso').length;
    const finalizadas = ordenes.filter((o) => o.estado === 'Finalizado').length;
    const alertas = ordenes.filter((o) => o.esAlertaInactividad).length;
    return { total, pendientes, enProceso, finalizadas, alertas };
  }, [ordenes]);

  const modalOverlayCls = 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto';
  const modalCls = 'bg-white border border-slate-200 rounded-xl w-full shadow-xl my-8';
  const modalHeaderCls = 'flex items-center justify-between px-6 py-4 border-b border-slate-100';
  const modalCloseBtn = 'p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors';
  const btnSecondary = 'px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-sm font-semibold transition-colors';
  const btnPrimary = 'px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]';

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Órdenes de Trabajo</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/60">
              BASI Fix
            </span>
          </div>
          <p className="text-slate-600 text-sm mt-0.5 font-normal">
            Gestión de reclamos por Unidad Funcional, semáforo de inactividad y trazabilidad de insumos
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/categorias?tab=trabajo"
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-xs font-semibold shadow-xs transition-all duration-150"
          >
            <Tags className="w-3.5 h-3.5 text-slate-400" />
            <span>Gestionar Rubros</span>
          </Link>

          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva OT</span>
          </button>
        </div>
      </div>

      {/* KPI Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total OTs', value: stats.total, active: estadoFilter === '' && !soloAlertas, onClick: () => { setEstadoFilter(''); setSoloAlertas(false); }, activeCls: 'bg-slate-900 border-slate-700 text-white', valueCls: 'text-white' },
          { label: 'Pendientes', value: stats.pendientes, active: estadoFilter === 'Pendiente' && !soloAlertas, onClick: () => { setEstadoFilter('Pendiente'); setSoloAlertas(false); }, activeCls: 'bg-amber-50 border-amber-200 text-amber-800', valueCls: 'text-amber-900' },
          { label: 'En Proceso', value: stats.enProceso, active: estadoFilter === 'En Proceso' && !soloAlertas, onClick: () => { setEstadoFilter('En Proceso'); setSoloAlertas(false); }, activeCls: 'bg-sky-50 border-sky-200 text-sky-800', valueCls: 'text-sky-900' },
          { label: 'Finalizadas', value: stats.finalizadas, active: estadoFilter === 'Finalizado' && !soloAlertas, onClick: () => { setEstadoFilter('Finalizado'); setSoloAlertas(false); }, activeCls: 'bg-emerald-50 border-emerald-200 text-emerald-800', valueCls: 'text-emerald-900' },
        ].map((kpi) => (
          <button
            key={kpi.label}
            onClick={kpi.onClick}
            className={`p-3 rounded-lg border text-left transition-all duration-150 ${
              kpi.active
                ? kpi.activeCls
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-xl font-bold mt-0.5 tabular-nums ${kpi.active ? kpi.valueCls : 'text-slate-900'}`}>{kpi.value}</p>
          </button>
        ))}

        <button
          onClick={() => { setSoloAlertas(!soloAlertas); if (!soloAlertas) setEstadoFilter(''); }}
          className={`col-span-2 sm:col-span-1 p-3 rounded-lg border text-left transition-all duration-150 ${
            soloAlertas
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : stats.alertas > 0
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 border-slate-300'
          }`}
        >
          <div className="flex items-center space-x-1.5">
            {stats.alertas > 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
            <p className="text-xs font-bold uppercase tracking-wider">+5 Días Inactiva</p>
          </div>
          <p className={`text-xl font-bold mt-0.5 tabular-nums ${stats.alertas > 0 ? 'text-rose-800' : 'text-slate-900'}`}>{stats.alertas}</p>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2.5">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por UF, N° OT, problema o responsable..."
              className="w-full pl-9 pr-8 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={rubroFilter}
            onChange={(e) => setRubroFilter(e.target.value)}
            className="w-full md:w-44 px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          >
            <option value="">Todos los Rubros</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>

          <select
            value={responsableFilter}
            onChange={(e) => setResponsableFilter(e.target.value)}
            className="w-full md:w-44 px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          >
            <option value="">Todos los Responsables</option>
            {responsables.map((resp) => (
              <option key={resp.id} value={resp.id}>{resp.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['', 'Pendiente', 'En Proceso', 'Finalizado', 'Suspendido', 'Cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => { setEstadoFilter(st); setSoloAlertas(false); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                estadoFilter === st && !soloAlertas
                  ? st === '' ? 'bg-slate-900 text-white' : `${estadoBadge(st || 'Pendiente')} font-bold`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-semibold border border-slate-200'
              }`}
            >
              {st === '' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando órdenes de trabajo...</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-lg shadow-xs">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-600">No se encontraron órdenes de trabajo</p>
          <p className="text-xs text-slate-400 mt-1">Pruebe ajustando los filtros de búsqueda o cree una nueva OT.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ordenes.map((ot) => {
            const isAlert = ot.esAlertaInactividad;
            return (
              <div
                key={ot.idOt}
                className={`rounded-lg flex flex-col justify-between transition-all duration-150 shadow-xs ${
                  isAlert
                    ? 'bg-rose-50/70 border border-rose-300 border-l-4 border-l-rose-600 shadow-xs'
                    : 'bg-white border border-slate-300 hover:border-slate-400 hover:shadow-md transition-all'
                }`}
              >
                <div className="p-4">
                  {/* Card Header: OT Id & State & Inactivity Alert */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm tracking-tight">
                        {ot.numeroOT}
                      </span>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {formatDistanceToNow(new Date(ot.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${estadoBadge(ot.estado)}`}>
                        {ot.estado}
                      </span>

                      {isAlert && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>+{ot.diasPendiente}d sin actividad</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unidad Funcional (Clickable to open Critical History) */}
                  <button
                    onClick={() => openHistorialModal(ot.unidadFuncionalId)}
                    title="Ver Historial Crítico de esta Unidad Funcional"
                    className="w-full text-left p-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200/60 rounded-md transition-all duration-150 group mb-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 overflow-hidden">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 shrink-0 transition-colors" />
                        <span className="text-xs font-bold text-slate-900 group-hover:text-orange-700 truncate transition-colors">
                          {ot.unidadFuncionalDisplay}
                        </span>
                      </div>
                      <History className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 shrink-0 ml-2 transition-colors" />
                    </div>
                  </button>

                  {/* Rubro & Responsable Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-700">
                      <Wrench className="w-3 h-3 text-slate-400" />
                      <span>{ot.categoriaNombre}</span>
                    </span>

                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-700">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{ot.responsableNombre}</span>
                    </span>
                  </div>

                  {/* Problema Reportado */}
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Problema Reportado
                    </p>
                    <p className="text-xs text-slate-800 line-clamp-3 bg-slate-50/80 p-2.5 rounded-md border border-slate-200 leading-relaxed">
                      {ot.problemaReportado}
                    </p>
                  </div>

                  {/* Solución Realizada (if finalized) */}
                  {ot.solucionRealizada && (
                    <div className="mb-3 p-2 bg-emerald-50 border border-emerald-300 rounded-md">
                      <p className="text-[10px] font-semibold text-emerald-700 flex items-center space-x-1 mb-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Solución Realizada</span>
                      </p>
                      <p className="text-emerald-800 text-xs line-clamp-2">{ot.solucionRealizada}</p>
                    </div>
                  )}

                  {/* Insumos Consumidos de Pañol Badge */}
                  {ot.insumosConsumidos && ot.insumosConsumidos.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-300 rounded-md flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-amber-900 text-xs font-bold">
                        <Package className="w-3 h-3 text-amber-600" />
                        <span>
                          {ot.insumosConsumidos.length}{' '}
                          {ot.insumosConsumidos.length === 1 ? 'insumo consumido' : 'insumos consumidos'}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-medium">Pañol</span>
                    </div>
                  )}
                </div>

                {/* Card Actions & Footer */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <select
                    value={ot.estado}
                    onChange={(e) => handleQuickStatusChange(ot, e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded-md text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900/10 font-semibold transition-colors"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Suspendido">Suspendido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openDetalleModal(ot)}
                      title="Ver Bitácora y Detalle Completo"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(ot)}
                      title="Editar OT"
                      className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(ot)}
                      title="Eliminar OT (Protocolo RF04)"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={openCreateModal}
        title="Crear Nueva Orden de Trabajo"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg shadow-orange-600/25 hover:scale-105 active:scale-[0.97] transition-all duration-150 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal 1: Alta Rápida con Cascada Dinámica */}
      {createModalOpen && (
        <div className={modalOverlayCls}>
          <div className={`${modalCls} max-w-xl`}>
            <div className={modalHeaderCls}>
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <ClipboardList className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Alta Rápida de Orden de Trabajo</h3>
                  <p className="text-xs text-slate-500">Selector dinámico por Unidad Funcional (&lt;30 seg)</p>
                </div>
              </div>
              <button onClick={closeCreateModal} className={modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="px-6 py-4 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-600" />
                  <span>Selección de Unidad Funcional (3 Niveles)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className={labelCls}>1. Sector / Escalera *</label>
                    <select
                      value={sectorSelected}
                      onChange={(e) => handleSectorChange(e.target.value)}
                      className={selectCls}
                      required
                    >
                      <option value="">Seleccione Sector...</option>
                      {sectores.map((s) => (
                        <option key={s} value={s}>
                          {s === 'LOCAL' ? '🏢 LOCAL COMERCIAL' : `Sector ${s}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>{isLocal ? '2. Nº Local *' : '2. Piso *'}</label>
                    <select
                      value={pisoSelected}
                      onChange={(e) => handlePisoChange(e.target.value)}
                      disabled={!sectorSelected}
                      className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                      required
                    >
                      <option value="">{isLocal ? 'Seleccione Local...' : 'Seleccione Piso...'}</option>
                      {pisos.map((p) => (
                        <option key={p} value={p}>
                          {isLocal ? `Local Nº ${p}` : p === 'PB' ? 'Planta Baja (PB)' : `Piso ${p}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>3. Depto {isLocal ? '(N/A)' : '*'}</label>
                    <select
                      value={deptoSelected}
                      onChange={(e) => handleDeptoChange(e.target.value)}
                      disabled={isLocal || !pisoSelected}
                      className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                      required={!isLocal}
                    >
                      <option value="">{isLocal ? 'N/A (Local)' : 'Seleccione Depto...'}</option>
                      {deptos.map((d) => (
                        <option key={d.id} value={d.depto || ''}>
                          Depto "{d.depto}"
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {ufFinalId && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-800">
                        {isLocal
                          ? `LOCAL Nº ${pisoSelected} (UF #${ufFinalId})`
                          : `UF #${ufFinalId} — Sec ${sectorSelected}, ${pisoSelected}, Depto "${deptoSelected}"`}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase">Confirmada</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Rubro / Categoría *</label>
                  <select
                    value={createCategoriaId}
                    onChange={(e) => setCreateCategoriaId(e.target.value)}
                    className={selectCls}
                    required
                  >
                    <option value="" disabled>Seleccione rubro...</option>
                    {rubros.map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Responsable Asignado *</label>
                  <select
                    value={createResponsableId}
                    onChange={(e) => setCreateResponsableId(e.target.value)}
                    className={selectCls}
                    required
                  >
                    <option value="" disabled>Seleccione responsable...</option>
                    {responsables.map((resp) => (
                      <option key={resp.id} value={resp.id}>{resp.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Problema Reportado / Detalle del Incidente *</label>
                <textarea
                  value={createProblema}
                  onChange={(e) => setCreateProblema(e.target.value)}
                  placeholder="Describa con precisión el problema detectado o reportado..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Observaciones Adicionales</label>
                <textarea
                  value={createObservaciones}
                  onChange={(e) => setCreateObservaciones(e.target.value)}
                  placeholder="Información sobre turnos, llaves, prioridad o morador..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={closeCreateModal} className={btnSecondary}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !ufFinalId}
                  className={btnPrimary}
                >
                  {createMutation.isPending ? 'Guardando...' : 'Crear Orden de Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edición de OT con UF Bloqueada */}
      {editModalOpen && selectedOt && (
        <div className={modalOverlayCls}>
          <div className={`${modalCls} max-w-xl`}>
            <div className={modalHeaderCls}>
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-orange-600" />
                  <span>Editar {selectedOt.numeroOT}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">La Unidad Funcional original permanece inmutable.</p>
              </div>
              <button onClick={() => setEditModalOpen(false)} className={modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 py-4 space-y-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Unidad Funcional (Bloqueada)</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedOt.unidadFuncionalDisplay}</p>
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-400 text-[10px] rounded-md border border-slate-200 font-medium">
                  🔒 Inmutable
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Rubro / Categoría *</label>
                  <select value={editCategoriaId} onChange={(e) => setEditCategoriaId(e.target.value)} className={selectCls} required>
                    {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Responsable Asignado *</label>
                  <select value={editResponsableId} onChange={(e) => setEditResponsableId(e.target.value)} className={selectCls} required>
                    {responsables.map((resp) => <option key={resp.id} value={resp.id}>{resp.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Estado de la OT *</label>
                <select value={editEstado} onChange={(e) => setEditEstado(e.target.value)} className={`${selectCls} font-semibold`} required>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Finalizado">Finalizado (Requiere Solución)</option>
                  <option value="Suspendido">Suspendido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Problema Reportado *</label>
                <textarea
                  value={editProblema}
                  onChange={(e) => setEditProblema(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                  required
                />
              </div>

              <div className={editEstado === 'Finalizado' ? 'p-3 bg-emerald-50 border border-emerald-300 rounded-md' : ''}>
                <label className={`${labelCls} flex items-center justify-between`}>
                  <span>Solución Realizada {editEstado === 'Finalizado' ? '(OBLIGATORIA PARA FINALIZAR) *' : '(Opcional)'}</span>
                </label>
                <textarea
                  value={editSolucion}
                  onChange={(e) => setEditSolucion(e.target.value)}
                  placeholder="Detalle los trabajos efectuados y materiales reemplazados..."
                  rows={3}
                  className={`w-full px-3 py-2 bg-white border rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all ${editEstado === 'Finalizado' ? 'border-emerald-300 focus:border-emerald-500' : 'border-slate-300 focus:border-slate-900'}`}
                  required={editEstado === 'Finalizado'}
                />
              </div>

              <div>
                <label className={labelCls}>Observaciones</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditModalOpen(false)} className={btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" disabled={updateMutation.isPending} className={btnPrimary}>
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Status Change to Finalizado */}
      {quickStatusModalOpen && selectedOt && (
        <div className={modalOverlayCls}>
          <div className={`${modalCls} max-w-lg`}>
            <div className={modalHeaderCls}>
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-emerald-50 rounded-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Finalizar {selectedOt.numeroOT}</h3>
              </div>
              <button onClick={() => setQuickStatusModalOpen(false)} className={modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600">
                Para completar y cerrar la orden en{' '}
                <span className="font-semibold text-slate-900">{selectedOt.unidadFuncionalDisplay}</span>,
                es obligatorio detallar la solución realizada.
              </p>

              <div>
                <label className={labelCls}>Solución Realizada y Pruebas Efectuadas *</label>
                <textarea
                  value={quickStatusSolucion}
                  onChange={(e) => setQuickStatusSolucion(e.target.value)}
                  placeholder="Ej: Se reparó cañería con termofusión y se verificó estanqueidad..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setQuickStatusModalOpen(false)} className={btnSecondary}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickStatusSolucion.trim()) {
                      toast.error('Debe ingresar la solución realizada para finalizar');
                      return;
                    }
                    changeEstadoMutation.mutate({
                      id: selectedOt.idOt,
                      estado: 'Finalizado',
                      solucion: quickStatusSolucion.trim(),
                    });
                  }}
                  disabled={changeEstadoMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
                >
                  {changeEstadoMutation.isPending ? 'Guardando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Historial Crítico por UF */}
      {historialModalOpen && (
        <div className={modalOverlayCls}>
          <div className={`${modalCls} max-w-3xl max-h-[90vh] flex flex-col`}>
            <div className={`${modalHeaderCls} shrink-0`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-50 rounded-md">
                  <History className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Historial Crítico de Reclamos por UF</h3>
                  <p className="text-xs text-slate-500">
                    {historialUf?.unidadFuncional.displayNombre || 'Cargando información...'}
                  </p>
                </div>
              </div>
              <button onClick={() => setHistorialModalOpen(false)} className={modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {isLoadingHistorial ? (
                <div className="p-8 text-center text-slate-400 text-sm">Cargando historial crítico...</div>
              ) : !historialUf || historialUf.reclamos.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-sm">
                  No hay reclamos históricos registrados para esta Unidad Funcional.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      Total de reclamos: <span className="font-bold text-slate-900">{historialUf.totalReclamos}</span>
                    </span>
                    <span className="text-slate-400">Orden cronológico descendente</span>
                  </div>

                  {/* Timeline vertical */}
                  <div className="relative">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

                    <div className="space-y-4">
                      {historialUf.reclamos.map((rec) => (
                        <div key={rec.idOt} className="relative pl-8">
                          <div className={`absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 border-white ${
                            rec.estado === 'Finalizado' ? 'bg-emerald-500' :
                            rec.estado === 'En Proceso' ? 'bg-sky-500' :
                            rec.estado === 'Cancelado' ? 'bg-slate-400' : 'bg-amber-500'
                          }`} />

                          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-semibold text-slate-700 text-sm">{rec.numeroOT}</span>
                                <span className="text-slate-400 text-xs">· {rec.categoriaNombre}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${estadoBadge(rec.estado)}`}>
                                {rec.estado}
                              </span>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Problema Reportado</p>
                              <p className="text-sm text-slate-700">{rec.problemaReportado}</p>
                            </div>

                            {rec.solucionRealizada && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-md">
                                <p className="text-[10px] font-bold text-emerald-700 mb-1">Solución Aplicada</p>
                                <p className="text-xs text-emerald-800">{rec.solucionRealizada}</p>
                              </div>
                            )}

                            {rec.insumosConsumidos && rec.insumosConsumidos.length > 0 ? (
                              <div className="border-t border-slate-100 pt-2.5">
                                <p className="text-[10px] font-semibold text-amber-700 flex items-center space-x-1.5 mb-2 uppercase">
                                  <Package className="w-3 h-3" />
                                  <span>Materiales de Pañol Consumidos</span>
                                </p>
                                <div className="divide-y divide-slate-100 rounded-md border border-slate-200 overflow-hidden">
                                  {rec.insumosConsumidos.map((ins) => (
                                    <div
                                      key={ins.id}
                                      className="px-3 py-2 flex items-center justify-between bg-white text-xs"
                                    >
                                      <div>
                                        <span className="font-semibold text-slate-700">{ins.articuloNombre}</span>
                                        {ins.observacion && (
                                          <span className="text-slate-400 italic ml-2">({ins.observacion})</span>
                                        )}
                                      </div>
                                      <span className="font-mono font-bold text-amber-700 tabular-nums">
                                        {ins.cantidad} {ins.unidadMedida}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic pt-1">
                                Sin consumo de materiales registrado en pañol para esta orden.
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                              <span>Responsable: {rec.responsableNombre}</span>
                              <span>{format(new Date(rec.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setHistorialModalOpen(false)} className={btnSecondary}>
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Detalle Completo y Bitácora */}
      {detalleModalOpen && selectedOt && (
        <div className={modalOverlayCls}>
          <div className={`${modalCls} max-w-2xl max-h-[90vh] flex flex-col`}>
            <div className={`${modalHeaderCls} shrink-0`}>
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Detalle y Bitácora: {selectedOt.numeroOT}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedOt.unidadFuncionalDisplay}</p>
              </div>
              <button onClick={() => setDetalleModalOpen(false)} className={modalCloseBtn}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Rubro</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedOt.categoriaNombre}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Responsable</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedOt.responsableNombre}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Estado Actual</p>
                  <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${estadoBadge(selectedOt.estado)}`}>
                    {selectedOt.estado}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Fecha de Creación</p>
                  <p className="font-mono text-slate-700 mt-0.5">
                    {format(new Date(selectedOt.createdAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Problema Reportado</p>
                  <p className="text-slate-800">{selectedOt.problemaReportado}</p>
                </div>

                {selectedOt.solucionRealizada && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-lg">
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase mb-1">Solución Realizada</p>
                    <p className="text-emerald-800">{selectedOt.solucionRealizada}</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <p className="text-[10px] font-semibold text-amber-700 flex items-center space-x-1.5 uppercase">
                  <Package className="w-3.5 h-3.5" />
                  <span>Insumos y Materiales de Pañol Consumidos</span>
                </p>

                {selectedOt.insumosConsumidos && selectedOt.insumosConsumidos.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
                    {selectedOt.insumosConsumidos.map((ins) => (
                      <div key={ins.id} className="px-3 py-2 flex items-center justify-between bg-white">
                        <div>
                          <p className="font-semibold text-slate-700">{ins.articuloNombre}</p>
                          <p className="text-[10px] text-slate-400">
                            Despachado por: {ins.usuarioNombre} · {format(new Date(ins.fechaHora), 'dd/MM HH:mm')}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-amber-700 tabular-nums">
                          {ins.cantidad} {ins.unidadMedida}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">No se han registrado consumos de pañol para esta OT.</p>
                )}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-3">
                <p className="text-[10px] font-semibold text-slate-600 flex items-center space-x-1.5 uppercase">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Bitácora de Auditoría Inmutable</span>
                </p>

                {selectedOt.bitacora && selectedOt.bitacora.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOt.bitacora.map((b) => (
                      <div key={b.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${bitacoraBadge(b.tipoOperacion)}`}>
                            {b.tipoOperacion}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {format(new Date(b.fechaHora), 'dd/MM/yyyy HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px]">{b.detalleCambio}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">No hay registros de bitácora.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setDetalleModalOpen(false)} className={btnSecondary}>
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Protocolo de Bajas */}
      {deleteModalOpen && selectedOt && (() => {
        const isPending = selectedOt.estado === 'Pendiente';
        const hoursAgo = (new Date().getTime() - new Date(selectedOt.createdAt).getTime()) / (1000 * 60 * 60);
        const isPhysicalDelete = isPending && hoursAgo < 24;

        return (
          <div className={`${modalOverlayCls} items-center`}>
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-5">
                  <div className={`p-2.5 rounded-lg ${isPhysicalDelete ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Protocolo de Bajas (RF04)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedOt.numeroOT} · {selectedOt.unidadFuncionalDisplay}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {isPhysicalDelete ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5 text-rose-800 text-xs">
                      <p className="font-bold text-rose-700">⚠️ BAJA FÍSICA (Hard Delete)</p>
                      <p>
                        La orden está en estado <span className="font-bold">Pendiente</span> y tiene menos de 24 horas de
                        antigüedad ({hoursAgo.toFixed(1)} horas). Se borrará físicamente y de forma permanente de la base de datos.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-lg space-y-1.5 text-amber-800 text-xs">
                      <p className="font-bold text-amber-700">📋 BAJA LÓGICA (Soft Delete)</p>
                      <p>
                        La orden {hoursAgo >= 24 ? `tiene más de 24 horas de creada (${hoursAgo.toFixed(1)} horas)` : `se encuentra en estado '${selectedOt.estado}'`}.
                        No se borrará físicamente: pasará a estado <span className="font-bold">Cancelado</span> y se registrará en la bitácora de auditoría.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className={btnSecondary}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(selectedOt.idOt)}
                    disabled={deleteMutation.isPending}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
                  >
                    {deleteMutation.isPending
                      ? 'Procesando...'
                      : isPhysicalDelete
                      ? 'Confirmar Baja Física'
                      : 'Confirmar Baja Lógica'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
