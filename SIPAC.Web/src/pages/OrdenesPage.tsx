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
  Clock,
  AlertTriangle,
  XCircle,
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
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileText,
  Check,
  Tags,
} from 'lucide-react';
import { format } from 'date-fns';

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

  // Dynamic UF Resolver in Cascade
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
      // Find the local matching this number
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

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-wide">Órdenes de Trabajo (OT)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
              BASI Fix
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">
            Gestión de reclamos por Unidad Funcional, semáforo de inactividad y trazabilidad de insumos
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/categorias?tab=trabajo"
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Tags className="w-4 h-4 text-blue-400" />
            <span>Gestionar Rubros</span>
          </Link>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden de Trabajo</span>
          </button>
        </div>
      </div>

      {/* ── KPI Quick Bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          onClick={() => {
            setEstadoFilter('');
            setSoloAlertas(false);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            estadoFilter === '' && !soloAlertas
              ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider">Total OTs</p>
          <p className="text-xl font-bold text-white mt-0.5">{stats.total}</p>
        </button>

        <button
          onClick={() => {
            setEstadoFilter('Pendiente');
            setSoloAlertas(false);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            estadoFilter === 'Pendiente' && !soloAlertas
              ? 'bg-amber-600/15 border-amber-500/40 text-amber-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider">Pendientes</p>
          <p className="text-xl font-bold text-amber-300 mt-0.5">{stats.pendientes}</p>
        </button>

        <button
          onClick={() => {
            setEstadoFilter('En Proceso');
            setSoloAlertas(false);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            estadoFilter === 'En Proceso' && !soloAlertas
              ? 'bg-blue-600/15 border-blue-500/40 text-blue-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider">En Proceso</p>
          <p className="text-xl font-bold text-blue-300 mt-0.5">{stats.enProceso}</p>
        </button>

        <button
          onClick={() => {
            setEstadoFilter('Finalizado');
            setSoloAlertas(false);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            estadoFilter === 'Finalizado' && !soloAlertas
              ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider">Finalizadas</p>
          <p className="text-xl font-bold text-emerald-300 mt-0.5">{stats.finalizadas}</p>
        </button>

        <button
          onClick={() => {
            setSoloAlertas(!soloAlertas);
            if (!soloAlertas) setEstadoFilter('');
          }}
          className={`col-span-2 sm:col-span-1 p-3 rounded-xl border text-left transition-all ${
            soloAlertas || stats.alertas > 0
              ? 'bg-red-950/40 border-red-800/80 text-red-400 animate-pulse'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>+5 Días Inactiva</span>
            </p>
          </div>
          <p className="text-xl font-bold text-red-300 mt-0.5">{stats.alertas}</p>
        </button>
      </div>

      {/* ── Filter & Search Bar ────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Predictive Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por UF (ej: 'Sec 28', 'Local 3', 'UF 150'), N° OT, problema o responsable..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Rubro Selector */}
          <select
            value={rubroFilter}
            onChange={(e) => setRubroFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los Rubros</option>
            {rubros.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>

          {/* Responsable Selector */}
          <select
            value={responsableFilter}
            onChange={(e) => setResponsableFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los Responsables</option>
            {responsables.map((resp) => (
              <option key={resp.id} value={resp.id}>
                {resp.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* State Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {['', 'Pendiente', 'En Proceso', 'Finalizado', 'Suspendido', 'Cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setEstadoFilter(st);
                setSoloAlertas(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                estadoFilter === st && !soloAlertas
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {st === '' ? 'Todos los Estados' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards Grid Mobile-First (Vertical Cards) ───────────────────────── */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Cargando órdenes de trabajo...</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-xl">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-300">No se encontraron órdenes de trabajo</p>
          <p className="text-xs text-slate-500 mt-1">Pruebe ajustando los filtros de búsqueda o cree una nueva OT.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordenes.map((ot) => {
            const isAlert = ot.esAlertaInactividad;
            return (
              <div
                key={ot.idOt}
                className={`rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl ${
                  isAlert
                    ? 'bg-red-950/20 border-2 border-red-700/80 shadow-red-950/30 ring-1 ring-red-600/30'
                    : 'bg-slate-950 border border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header: OT Id & State & Inactivity Alert */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono font-bold text-blue-400 text-sm tracking-wider">
                        {ot.numeroOT}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {format(new Date(ot.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          ot.estado === 'Finalizado'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ot.estado === 'En Proceso'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : ot.estado === 'Suspendido'
                            ? 'bg-purple-950 text-purple-400 border border-purple-800'
                            : ot.estado === 'Cancelado'
                            ? 'bg-slate-900 text-slate-400 border border-slate-700'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {ot.estado}
                      </span>

                      {isAlert && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-red-600 text-white shadow-sm flex items-center space-x-1 animate-bounce">
                          <AlertTriangle className="w-3 h-3" />
                          <span>ALERTA: +{ot.diasPendiente} DÍAS PENDIENTE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unidad Funcional (Clickable to open Critical History) */}
                  <div className="mb-3">
                    <button
                      onClick={() => openHistorialModal(ot.unidadFuncionalId)}
                      title="Ver Historial Crítico de esta Unidad Funcional"
                      className="w-full text-left p-2.5 bg-slate-900/80 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <MapPin className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-100 group-hover:text-blue-300 truncate">
                            {ot.unidadFuncionalDisplay}
                          </span>
                        </div>
                        <History className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0 ml-2" />
                      </div>
                    </button>
                  </div>

                  {/* Rubro & Responsable Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-semibold text-slate-300">
                      <Wrench className="w-3 h-3 text-amber-400" />
                      <span>{ot.categoriaNombre}</span>
                    </span>

                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-semibold text-slate-300">
                      <User className="w-3 h-3 text-blue-400" />
                      <span>{ot.responsableNombre}</span>
                    </span>
                  </div>

                  {/* Problema Reportado */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                      Problema Reportado:
                    </p>
                    <p className="text-xs text-slate-200 line-clamp-3 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                      {ot.problemaReportado}
                    </p>
                  </div>

                  {/* Solución Realizada (if finalized) */}
                  {ot.solucionRealizada && (
                    <div className="mb-3 p-2.5 bg-emerald-950/30 border border-emerald-900/60 rounded-xl text-xs">
                      <p className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Solución Realizada:</span>
                      </p>
                      <p className="text-slate-200 text-xs line-clamp-2">{ot.solucionRealizada}</p>
                    </div>
                  )}

                  {/* Insumos Consumidos de Pañol Badge */}
                  {ot.insumosConsumidos && ot.insumosConsumidos.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-[11px]">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {ot.insumosConsumidos.length}{' '}
                          {ot.insumosConsumidos.length === 1 ? 'insumo consumido' : 'insumos consumidos'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 italic">Pañol</span>
                    </div>
                  )}
                </div>

                {/* Card Actions & Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {/* State Select */}
                  <select
                    value={ot.estado}
                    onChange={(e) => handleQuickStatusChange(ot, e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Suspendido">Suspendido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openDetalleModal(ot)}
                      title="Ver Bitácora y Detalle Completo"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(ot)}
                      title="Editar OT"
                      className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(ot)}
                      title="Eliminar OT (Protocolo RF04)"
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors"
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

      {/* ── Floating Action Button (FAB) Mobile-First ──────────────────────── */}
      <button
        onClick={openCreateModal}
        title="Crear Nueva Orden de Trabajo"
        className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-600/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* ── Modal 1: Alta Rápida con Cascada Dinámica (RF01) ───────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Alta Rápida de Orden de Trabajo</h3>
                  <p className="text-xs text-slate-400">Selector dinámico por Unidad Funcional (&lt;30 seg)</p>
                </div>
              </div>
              <button onClick={closeCreateModal} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Cascada Dinámica: Sector -> Piso -> Depto */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <p className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Selección de Unidad Funcional (3 Niveles)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Nivel 1: Sector / Escalera */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      1. Sector / Escalera *
                    </label>
                    <select
                      value={sectorSelected}
                      onChange={(e) => handleSectorChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 font-semibold"
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

                  {/* Nivel 2: Piso o Nº Local */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      {isLocal ? '2. Nº Local *' : '2. Piso *'}
                    </label>
                    <select
                      value={pisoSelected}
                      onChange={(e) => handlePisoChange(e.target.value)}
                      disabled={!sectorSelected}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 disabled:opacity-40 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 font-semibold"
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

                  {/* Nivel 3: Depto (Deshabilitado si es Local) */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      3. Depto {isLocal ? '(No aplica)' : '*'}
                    </label>
                    <select
                      value={deptoSelected}
                      onChange={(e) => handleDeptoChange(e.target.value)}
                      disabled={isLocal || !pisoSelected}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 disabled:opacity-40 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 font-semibold"
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

                {/* Confirmed UF Resolution Banner */}
                {ufFinalId && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">
                        {isLocal
                          ? `LOCAL Nº ${pisoSelected} (UF #${ufFinalId})`
                          : `UF #${ufFinalId} (Sec ${sectorSelected} - ${pisoSelected} "${deptoSelected}")`}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold">Confirmada</span>
                  </div>
                )}
              </div>

              {/* Rubro & Responsable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rubro / Categoría *</label>
                  <select
                    value={createCategoriaId}
                    onChange={(e) => setCreateCategoriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="" disabled>
                      Seleccione rubro...
                    </option>
                    {rubros.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Responsable Asignado *</label>
                  <select
                    value={createResponsableId}
                    onChange={(e) => setCreateResponsableId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="" disabled>
                      Seleccione responsable...
                    </option>
                    {responsables.map((resp) => (
                      <option key={resp.id} value={resp.id}>
                        {resp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Problema Reportado */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Problema Reportado / Detalle del Incidente *
                </label>
                <textarea
                  value={createProblema}
                  onChange={(e) => setCreateProblema(e.target.value)}
                  placeholder="Describa con precisión el problema detectado o reportado..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observaciones Adicionales</label>
                <textarea
                  value={createObservaciones}
                  onChange={(e) => setCreateObservaciones(e.target.value)}
                  placeholder="Información sobre turnos, llaves, prioridad o morador..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !ufFinalId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs shadow-lg shadow-blue-600/30"
                >
                  {createMutation.isPending ? 'Guardando...' : 'Crear Orden de Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Edición de OT con UF Bloqueada/Inmutable (RF02) ────────── */}
      {editModalOpen && selectedOt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-blue-400" />
                  <span>Editar {selectedOt.numeroOT}</span>
                </h3>
                <p className="text-xs text-slate-400">La Unidad Funcional original permanece inmutable.</p>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* UF Inmutable Display */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Unidad Funcional (Bloqueada)</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{selectedOt.unidadFuncionalDisplay}</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-900 text-slate-400 text-[10px] rounded-lg border border-slate-800">
                  🔒 Inmutable
                </span>
              </div>

              {/* Rubro & Responsable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rubro / Categoría *</label>
                  <select
                    value={editCategoriaId}
                    onChange={(e) => setEditCategoriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  >
                    {rubros.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Responsable Asignado *</label>
                  <select
                    value={editResponsableId}
                    onChange={(e) => setEditResponsableId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  >
                    {responsables.map((resp) => (
                      <option key={resp.id} value={resp.id}>
                        {resp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estado de la OT *</label>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 font-bold"
                  required
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Finalizado">Finalizado (Requiere Solución)</option>
                  <option value="Suspendido">Suspendido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {/* Problema Reportado */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Problema Reportado *</label>
                <textarea
                  value={editProblema}
                  onChange={(e) => setEditProblema(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Solución Realizada (Required if Finalizado) */}
              <div className={editEstado === 'Finalizado' ? 'p-3 bg-emerald-950/20 border border-emerald-800/80 rounded-xl' : ''}>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Solución Realizada {editEstado === 'Finalizado' ? '(OBLIGATORIA PARA FINALIZAR) *' : '(Opcional)'}</span>
                </label>
                <textarea
                  value={editSolucion}
                  onChange={(e) => setEditSolucion(e.target.value)}
                  placeholder="Detalle los trabajos efectuados y materiales reemplazados..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                  required={editEstado === 'Finalizado'}
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observaciones</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-blue-600/30"
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Quick Status Change to Finalizado ─────────────────────── */}
      {quickStatusModalOpen && selectedOt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Finalizar {selectedOt.numeroOT}</span>
              </h3>
              <button onClick={() => setQuickStatusModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                Para completar y cerrar la orden en <span className="font-bold text-white">{selectedOt.unidadFuncionalDisplay}</span>,
                es obligatorio detallar la solución realizada.
              </p>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Solución Realizada y Pruebas Efectuadas *
                </label>
                <textarea
                  value={quickStatusSolucion}
                  onChange={(e) => setQuickStatusSolucion(e.target.value)}
                  placeholder="Ej: Se reparó cañería con termofusión y se verificó estanqueidad..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickStatusModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/30"
                >
                  {changeEstadoMutation.isPending ? 'Guardando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Historial Crítico por UF (RF05 & RF06) ────────────────── */}
      {historialModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Historial Crítico de Reclamos por UF</h3>
                  <p className="text-xs text-slate-400">
                    {historialUf?.unidadFuncional.displayNombre || 'Cargando información...'}
                  </p>
                </div>
              </div>
              <button onClick={() => setHistorialModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {isLoadingHistorial ? (
                <div className="p-8 text-center text-slate-400">Cargando historial crítico...</div>
              ) : !historialUf || historialUf.reclamos.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                  No hay reclamos históricos registrados para esta Unidad Funcional.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-300">
                      Total de Reclamos Registrados: <span className="font-bold text-white">{historialUf.totalReclamos}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Orden cronológico descendente</span>
                  </div>

                  {historialUf.reclamos.map((rec) => (
                    <div
                      key={rec.idOt}
                      className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-400 text-sm">{rec.numeroOT}</span>
                          <span className="text-slate-400 text-xs">• Rubro: {rec.categoriaNombre}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            rec.estado === 'Finalizado'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : rec.estado === 'En Proceso'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {rec.estado}
                        </span>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-400 text-[11px] uppercase">Problema Reportado:</p>
                        <p className="text-slate-200 mt-0.5">{rec.problemaReportado}</p>
                      </div>

                      {rec.solucionRealizada && (
                        <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg">
                          <p className="font-bold text-emerald-400 text-[11px]">Solución Aplicada:</p>
                          <p className="text-slate-200 mt-0.5">{rec.solucionRealizada}</p>
                        </div>
                      )}

                      {/* Consumos de Pañol en este trabajo */}
                      {rec.insumosConsumidos && rec.insumosConsumidos.length > 0 ? (
                        <div className="pt-2 border-t border-slate-800/80">
                          <p className="font-bold text-amber-400 text-[11px] flex items-center space-x-1.5 mb-2">
                            <Package className="w-3.5 h-3.5" />
                            <span>Materiales e Insumos de Pañol Consumidos:</span>
                          </p>
                          <div className="space-y-1.5">
                            {rec.insumosConsumidos.map((ins) => (
                              <div
                                key={ins.id}
                                className="p-2 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-[11px]"
                              >
                                <div>
                                  <span className="font-semibold text-slate-200">{ins.articuloNombre}</span>
                                  {ins.observacion && (
                                    <span className="text-slate-400 italic ml-2">({ins.observacion})</span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-amber-300">
                                  {ins.cantidad} {ins.unidadMedida}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic pt-1">
                          Sin consumo de materiales registrado en pañol para esta orden.
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                        <span>Responsable: {rec.responsableNombre}</span>
                        <span>Fecha: {format(new Date(rec.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setHistorialModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 5: Detalle Completo y Bitácora de Auditoría ──────────────── */}
      {detalleModalOpen && selectedOt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span>Detalle y Bitácora: {selectedOt.numeroOT}</span>
                </h3>
                <p className="text-xs text-slate-400">{selectedOt.unidadFuncionalDisplay}</p>
              </div>
              <button onClick={() => setDetalleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {/* Info General */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Rubro</p>
                  <p className="font-bold text-slate-200">{selectedOt.categoriaNombre}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Responsable</p>
                  <p className="font-bold text-slate-200">{selectedOt.responsableNombre}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Estado Actual</p>
                  <p className="font-bold text-blue-400">{selectedOt.estado}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Fecha de Creación</p>
                  <p className="font-mono text-slate-300">
                    {format(new Date(selectedOt.createdAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {/* Problema & Solución */}
              <div className="space-y-2">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="font-bold text-slate-300 mb-1">Problema Reportado:</p>
                  <p className="text-slate-200">{selectedOt.problemaReportado}</p>
                </div>

                {selectedOt.solucionRealizada && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/80 rounded-xl">
                    <p className="font-bold text-emerald-400 mb-1">Solución Realizada:</p>
                    <p className="text-slate-200">{selectedOt.solucionRealizada}</p>
                  </div>
                )}
              </div>

              {/* Insumos Consumidos de Pañol */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <p className="font-bold text-amber-400 flex items-center space-x-1.5">
                  <Package className="w-4 h-4" />
                  <span>Insumos y Materiales de Pañol Consumidos</span>
                </p>

                {selectedOt.insumosConsumidos && selectedOt.insumosConsumidos.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedOt.insumosConsumidos.map((ins) => (
                      <div
                        key={ins.id}
                        className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{ins.articuloNombre}</p>
                          <p className="text-[10px] text-slate-400">
                            Despachado por: {ins.usuarioNombre} • {format(new Date(ins.fechaHora), 'dd/MM HH:mm')}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-amber-300">
                          {ins.cantidad} {ins.unidadMedida}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No se han registrado consumos de pañol para esta OT.</p>
                )}
              </div>

              {/* Bitácora de Auditoría Inmutable */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <p className="font-bold text-blue-400 flex items-center space-x-1.5">
                  <History className="w-4 h-4" />
                  <span>Bitácora de Auditoría Inmutable (registro_bitacora_ot)</span>
                </p>

                {selectedOt.bitacora && selectedOt.bitacora.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOt.bitacora.map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-lg text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              b.tipoOperacion === 'ALTA'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : b.tipoOperacion === 'CAMBIO_ESTADO'
                                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                : b.tipoOperacion === 'BAJA_LOGICA'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {b.tipoOperacion}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {format(new Date(b.fechaHora), 'dd/MM/yyyy HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{b.detalleCambio}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No hay registros de bitácora.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setDetalleModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 6: Protocolo de Bajas (RF04) ─────────────────────────────── */}
      {deleteModalOpen && selectedOt && (() => {
        const isPending = selectedOt.estado === 'Pendiente';
        const hoursAgo = (new Date().getTime() - new Date(selectedOt.createdAt).getTime()) / (1000 * 60 * 60);
        const isPhysicalDelete = isPending && hoursAgo < 24;

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Protocolo de Bajas (RF04)</h3>
                  <p className="text-xs text-slate-400">
                    {selectedOt.numeroOT} • {selectedOt.unidadFuncionalDisplay}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs mb-6">
                {isPhysicalDelete ? (
                  <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl space-y-1.5 text-red-300">
                    <p className="font-bold text-red-400">⚠️ BAJA FÍSICA (Hard Delete)</p>
                    <p>
                      La orden está en estado <span className="font-bold text-white">Pendiente</span> y tiene menos de 24 horas de
                      antigüedad ({hoursAgo.toFixed(1)} horas). Se borrará físicamente y de forma permanente de la base de datos.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl space-y-1.5 text-amber-300">
                    <p className="font-bold text-amber-400">📋 BAJA LÓGICA (Soft Delete)</p>
                    <p>
                      La orden {hoursAgo >= 24 ? `tiene más de 24 horas de creada (${hoursAgo.toFixed(1)} horas)` : `se encuentra en estado '${selectedOt.estado}'`}.
                      No se borrará físicamente: pasará a estado <span className="font-bold text-white">Cancelado</span>, se registrará el evento en la bitácora de auditoría histórica y se ocultará de las vistas activas.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selectedOt.idOt)}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-red-600/30"
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
        );
      })()}
    </div>
  );
};
