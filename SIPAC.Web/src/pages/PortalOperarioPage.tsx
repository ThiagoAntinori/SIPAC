import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { operariosApi } from '../services/api';
import { MisTareasItem } from '../types';
import { playTaskAlertSound } from '../utils/audioAlert';
import { generarOrdenTrabajoPdf } from '../utils/pdfGenerator';
import { subscribeToPushNotifications, isPushNotificationSupported, getExistingPushSubscription } from '../utils/pushNotifications';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Play,
  FileDown,
  Bell,
  Wifi,
  WifiOff,
  LogOut,
  RefreshCw,
  MapPin,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  PauseCircle,
} from 'lucide-react';

export const PortalOperarioPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Estados generales
  const [activeTab, setActiveTab] = useState<'tareas' | 'historial'>('tareas');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushSupported, setPushSupported] = useState<boolean>(false);

  // Estados de "Mis Tareas"
  const [tareas, setTareas] = useState<MisTareasItem[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [lastSoundAlertedIds, setLastSoundAlertedIds] = useState<Set<string>>(new Set());

  // Estados de "Historial"
  const [historial, setHistorial] = useState<MisTareasItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialTotalPages, setHistorialTotalPages] = useState(1);
  const [historialPage, setHistorialPage] = useState(1);
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState<string>('');
  const [filtroDesde, setFiltroDesde] = useState<string>('');
  const [filtroHasta, setFiltroHasta] = useState<string>('');

  // Modales
  const [modalFinalizar, setModalFinalizar] = useState<{ open: boolean; tarea: MisTareasItem | null }>({
    open: false,
    tarea: null,
  });
  const [solucionInput, setSolucionInput] = useState('');
  const [submittingFinalizar, setSubmittingFinalizar] = useState(false);

  const [modalSuspender, setModalSuspender] = useState<{ open: boolean; tarea: MisTareasItem | null }>({
    open: false,
    tarea: null,
  });
  const [motivoInput, setMotivoInput] = useState('');
  const [submittingSuspender, setSubmittingSuspender] = useState(false);

  const [modalDetalle, setModalDetalle] = useState<{ open: boolean; tarea: MisTareasItem | null }>({
    open: false,
    tarea: null,
  });

  // Redirigir si no es operario autenticado
  useEffect(() => {
    if (!user) {
      navigate('/login-operario', { replace: true });
    }
  }, [user, navigate]);

  // Listener de conectividad online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión reestablecida. Trabajando en línea.', { icon: '🟢' });
      fetchMisTareas(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Sin conexión a internet. Modo offline activo.', { icon: '🔴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    isPushNotificationSupported().then((supported) => {
      setPushSupported(supported);
      if (supported) {
        getExistingPushSubscription().then((sub) => {
          setPushSubscribed(!!sub);
        });
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carga de tareas activas
  const fetchMisTareas = useCallback(async (silent = false) => {
    if (!silent) setLoadingTareas(true);
    try {
      const data = await operariosApi.getMisTareas();
      setTareas(data);

      // Comprobar tareas no leídas y disparar alerta sonora si son nuevas
      const unread = data.filter((t) => !t.leidaPorOperario);
      if (unread.length > 0) {
        setLastSoundAlertedIds((prev) => {
          const hasNewUnread = unread.some((t) => !prev.has(t.idOt));
          if (hasNewUnread) {
            playTaskAlertSound();
            const next = new Set(prev);
            unread.forEach((t) => next.add(t.idOt));
            return next;
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.warn('Error al cargar tareas (posible offline):', err);
      if (isOnline) {
        toast.error('No se pudieron actualizar las tareas desde el servidor');
      }
    } finally {
      if (!silent) setLoadingTareas(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchMisTareas();
    const interval = setInterval(() => {
      if (navigator.onLine) {
        fetchMisTareas(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMisTareas]);

  // Carga de historial
  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const res = await operariosApi.getHistorial({
        estado: filtroEstadoHistorial || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        page: historialPage,
        pageSize: 10,
      });
      setHistorial(res.items);
      setHistorialTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Error al cargar historial:', err);
      toast.error('Error al obtener el historial de tareas.');
    } finally {
      setLoadingHistorial(false);
    }
  }, [filtroEstadoHistorial, filtroDesde, filtroHasta, historialPage]);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial();
    }
  }, [activeTab, fetchHistorial]);

  // Manejar acción: Marcar como Leída
  const handleMarcarLeida = async (t: MisTareasItem) => {
    if (!isOnline) {
      toast.error('Se requiere conexión para marcar tareas como leídas');
      return;
    }
    try {
      await operariosApi.marcarLeida(t.idOt);
      setTareas((prev) =>
        prev.map((item) => (item.idOt === t.idOt ? { ...item, leidaPorOperario: true } : item))
      );
    } catch (err) {
      console.error('Error al marcar como leída:', err);
    }
  };

  // Manejar acción: Iniciar Tarea
  const handleIniciarTarea = async (t: MisTareasItem) => {
    if (!isOnline) {
      toast.error('Se requiere conexión para cambiar el estado de la tarea');
      return;
    }
    try {
      await operariosApi.iniciarTarea(t.idOt);
      toast.success(`Tarea ${t.numeroOT} iniciada. ¡Buen trabajo!`);
      setTareas((prev) =>
        prev.map((item) =>
          item.idOt === t.idOt ? { ...item, estado: 'En Proceso', leidaPorOperario: true } : item
        )
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo iniciar la tarea');
    }
  };

  // Manejar acción: Elevar Finalización
  const handleConfirmarFinalizacion = async () => {
    if (!modalFinalizar.tarea) return;
    if (!solucionInput.trim()) {
      toast.error('Debes indicar la solución o trabajo realizado.');
      return;
    }
    if (!isOnline) {
      toast.error('Se requiere conexión a internet para elevar la finalización.');
      return;
    }

    setSubmittingFinalizar(true);
    try {
      await operariosApi.elevarFinalizacion(modalFinalizar.tarea.idOt, solucionInput.trim());
      toast.success('¡Finalización elevada con éxito! Esperando aprobación del encargado.');
      setModalFinalizar({ open: false, tarea: null });
      setSolucionInput('');
      fetchMisTareas(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al elevar finalización');
    } finally {
      setSubmittingFinalizar(false);
    }
  };

  // Manejar acción: Solicitar Suspensión
  const handleConfirmarSuspension = async () => {
    if (!modalSuspender.tarea) return;
    if (!motivoInput.trim()) {
      toast.error('Debes ingresar el motivo de la suspensión.');
      return;
    }
    if (!isOnline) {
      toast.error('Se requiere conexión a internet para solicitar la suspensión.');
      return;
    }

    setSubmittingSuspender(true);
    try {
      await operariosApi.elevarSuspension(modalSuspender.tarea.idOt, motivoInput.trim());
      toast.success('Solicitud de suspensión enviada al encargado.');
      setModalSuspender({ open: false, tarea: null });
      setMotivoInput('');
      fetchMisTareas(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al solicitar suspensión');
    } finally {
      setSubmittingSuspender(false);
    }
  };

  // Suscribirse a Push
  const handleSubscribePush = async () => {
    const res = await subscribeToPushNotifications();
    if (res.success) {
      setPushSubscribed(true);
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  // Descargar PDF
  const handleDescargarPdf = (t: MisTareasItem) => {
    try {
      generarOrdenTrabajoPdf(t, user?.nombreCompleto);
      toast.success(`PDF de ${t.numeroOT} generado y descargado`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      toast.error('No se pudo generar el documento PDF');
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar tu sesión del portal móvil?')) {
      logout();
      navigate('/login-operario', { replace: true });
    }
  };

  const unreadCount = tareas.filter((t) => !t.leidaPorOperario).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16">
      {/* ── HEADER MÓVIL ────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">SITRAC</span>
                <span className="text-[10px] bg-orange-500 text-white font-semibold px-1.5 py-0.5 rounded">
                  OPERARIO
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                {user?.nombreCompleto || user?.username || 'Operario'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Indicador de Conexión */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
              title={isOnline ? 'Conexión activa' : 'Sin conexión'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Botón Push */}
            {pushSupported && !pushSubscribed && (
              <button
                onClick={handleSubscribePush}
                className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 transition"
                title="Activar notificaciones Web Push"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}

            {/* Cerrar Sesión */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banner de Modo Offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-medium flex items-center justify-center space-x-2 shadow-inner">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Modo Offline: Visualizando tareas en caché. Requiere red para cambiar estados.</span>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="max-w-3xl mx-auto px-4 flex border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={() => setActiveTab('tareas')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'tareas'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Mis Tareas ({tareas.length})</span>
            {unreadCount > 0 && (
              <span className="bg-orange-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'historial'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Historial y Cierres</span>
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────────── */}
      <main className="max-w-3xl w-full mx-auto p-4 flex-1">
        {/* ── TAB: MIS TAREAS ────────────────────────────────────────── */}
        {activeTab === 'tareas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tareas Asignadas</h2>
                <p className="text-xs text-slate-500">Órdenes activas pendientes o en ejecución</p>
              </div>
              <button
                onClick={() => fetchMisTareas(false)}
                disabled={loadingTareas}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition shadow-sm"
                title="Actualizar tareas"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTareas ? 'animate-spin text-orange-600' : ''}`} />
              </button>
            </div>

            {loadingTareas && tareas.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-orange-500" />
                <p className="text-sm">Cargando tus tareas asignadas...</p>
              </div>
            ) : tareas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <h3 className="text-base font-semibold text-slate-800">¡Todo al día!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  No tienes órdenes de trabajo pendientes en este momento. Las nuevas asignaciones aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {tareas.map((tarea) => {
                  const isUnread = !tarea.leidaPorOperario;
                  const isPendiente = tarea.estado === 'Pendiente';
                  const isEnProceso = tarea.estado === 'En Proceso';
                  const isEsperandoFin = tarea.estado === 'Pendiente Aprobacion Finalizacion';
                  const isEsperandoSusp = tarea.estado === 'Pendiente Aprobacion Suspension';

                  return (
                    <div
                      key={tarea.idOt}
                      onClick={() => {
                        if (isUnread) handleMarcarLeida(tarea);
                      }}
                      className={`relative bg-white rounded-2xl p-4 transition-all duration-300 shadow-sm border ${
                        isUnread
                          ? 'border-amber-400 bg-gradient-to-br from-amber-50/70 to-white ring-2 ring-amber-400/60 animate-pulse'
                          : 'border-slate-200 hover:shadow-md'
                      }`}
                    >
                      {isUnread && (
                        <div className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow flex items-center space-x-1">
                          <Bell className="w-3 h-3 animate-spin" />
                          <span>¡Nueva Tarea No Leída!</span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-slate-900 tracking-tight">
                              {tarea.numeroOT}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {tarea.categoriaNombre}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(new Date(tarea.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              isPendiente
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isEnProceso
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : isEsperandoFin
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isEsperandoSusp
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tarea.estado}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-3 flex items-center space-x-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900">
                            {tarea.unidadFuncionalDisplay}
                          </span>
                          <span className="text-slate-500 ml-1.5">
                            (Sector: {tarea.sectorEscalera || 'N/D'} | Piso: {tarea.piso || 'PB'} | Depto:{' '}
                            {tarea.depto || '-'})
                          </span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                          Problema reportado:
                        </p>
                        <p className="text-xs text-slate-800 bg-amber-50/40 p-2 rounded-lg border border-amber-100/50 leading-relaxed">
                          {tarea.problemaReportado}
                        </p>
                      </div>

                      {isEsperandoFin && (
                        <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold">Finalización elevada al Encargado</p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              Solución reportada: &ldquo;{tarea.solucionRealizada}&rdquo;
                            </p>
                            <p className="text-[10px] text-emerald-600 italic mt-0.5">
                              En espera de revisión y cierre formal por supervisión.
                            </p>
                          </div>
                        </div>
                      )}

                      {isEsperandoSusp && (
                        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-800">
                          <PauseCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold">Suspensión solicitada al Encargado</p>
                            <p className="text-[11px] text-rose-700 mt-0.5">
                              Motivo informado: &ldquo;{tarea.motivoSuspension}&rdquo;
                            </p>
                            <p className="text-[10px] text-rose-600 italic mt-0.5">
                              En espera de revisión por el supervisor.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarcarLeida(tarea);
                            }}
                            className="flex-1 min-w-[130px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar Leída</span>
                          </button>
                        )}

                        {isPendiente && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIniciarTarea(tarea);
                            }}
                            disabled={!isOnline}
                            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition ${
                              isOnline
                                ? 'bg-orange-600 hover:bg-orange-700 active:scale-95 text-white'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Iniciar Tarea</span>
                          </button>
                        )}

                        {isEnProceso && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalFinalizar({ open: true, tarea });
                              }}
                              disabled={!isOnline}
                              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition ${
                                isOnline
                                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
                                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Elevar Finalización</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalSuspender({ open: true, tarea });
                              }}
                              disabled={!isOnline}
                              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition ${
                                isOnline
                                  ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                                  : 'border-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>Suspender</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUnread) handleMarcarLeida(tarea);
                            setModalDetalle({ open: true, tarea });
                          }}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                          title="Ver detalle completo"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDescargarPdf(tarea);
                          }}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                          title="Descargar comprobante en PDF (Funciona Offline)"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: HISTORIAL ─────────────────────────────────────────── */}
        {activeTab === 'historial' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Historial de Trabajos</h2>
              <p className="text-xs text-slate-500">
                Consulta y descarga comprobantes de tus órdenes finalizadas y suspendidas
              </p>
            </div>

            {/* Filtros */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estado</label>
                  <select
                    value={filtroEstadoHistorial}
                    onChange={(e) => {
                      setFiltroEstadoHistorial(e.target.value);
                      setHistorialPage(1);
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 py-1.5 px-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">Todos los cerrados</option>
                    <option value="Finalizado">Finalizados</option>
                    <option value="Suspendido">Suspendidos</option>
                    <option value="Cancelada">Canceladas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={filtroDesde}
                    onChange={(e) => {
                      setFiltroDesde(e.target.value);
                      setHistorialPage(1);
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 py-1.5 px-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={filtroHasta}
                    onChange={(e) => {
                      setFiltroHasta(e.target.value);
                      setHistorialPage(1);
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 py-1.5 px-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Listado de Historial */}
            {loadingHistorial ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-orange-500" />
                <p className="text-sm">Buscando registros...</p>
              </div>
            ) : historial.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold">No se encontraron tareas en el historial</p>
                <p className="text-xs mt-1">Prueba cambiando los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historial.map((item) => (
                  <div
                    key={item.idOt}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-bold text-slate-900">{item.numeroOT}</span>
                        <span className="text-xs text-slate-500 ml-2">({item.categoriaNombre})</span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.estado === 'Finalizado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado === 'Suspendido'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.estado}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-2 font-medium">
                      {item.unidadFuncionalDisplay}
                    </p>

                    {item.solucionRealizada && (
                      <p className="text-xs text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 mb-2">
                        <span className="font-semibold text-emerald-800">Solución:</span> {item.solucionRealizada}
                      </p>
                    )}

                    {item.motivoSuspension && (
                      <p className="text-xs text-slate-700 bg-rose-50/50 p-2 rounded-lg border border-rose-100 mb-2">
                        <span className="font-semibold text-rose-800">Motivo suspensión:</span>{' '}
                        {item.motivoSuspension}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {format(new Date(item.updatedAt || item.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </span>
                      <button
                        onClick={() => handleDescargarPdf(item)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Descargar PDF</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Paginación */}
                {historialTotalPages > 1 && (
                  <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setHistorialPage((p) => Math.max(1, p - 1))}
                      disabled={historialPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-600 font-medium">
                      Página {historialPage} de {historialTotalPages}
                    </span>
                    <button
                      onClick={() => setHistorialPage((p) => Math.min(historialTotalPages, p + 1))}
                      disabled={historialPage >= historialTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL: ELEVAR FINALIZACIÓN ───────────────────────────────── */}
      {modalFinalizar.open && modalFinalizar.tarea && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Elevar Finalización de Tarea</h3>
                <p className="text-xs text-slate-500">
                  {modalFinalizar.tarea.numeroOT} — {modalFinalizar.tarea.unidadFuncionalDisplay}
                </p>
              </div>
              <button
                onClick={() => setModalFinalizar({ open: false, tarea: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trabajo o Solución Realizada <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={solucionInput}
                onChange={(e) => setSolucionInput(e.target.value)}
                placeholder="Describe detalladamente el trabajo efectuado y el estado en el que quedó la unidad..."
                className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Al elevar la finalización, la orden pasará a revisión del supervisor para su aprobación y descuento de pañol.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setModalFinalizar({ open: false, tarea: null })}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFinalizacion}
                disabled={submittingFinalizar || !solucionInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center space-x-1 disabled:opacity-50"
              >
                {submittingFinalizar ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmar y Elevar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SOLICITAR SUSPENSIÓN ──────────────────────────────── */}
      {modalSuspender.open && modalSuspender.tarea && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Solicitar Suspensión de Tarea</h3>
                <p className="text-xs text-slate-500">
                  {modalSuspender.tarea.numeroOT} — {modalSuspender.tarea.unidadFuncionalDisplay}
                </p>
              </div>
              <button
                onClick={() => setModalSuspender({ open: false, tarea: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo / Impedimento de Suspensión <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={motivoInput}
                onChange={(e) => setMotivoInput(e.target.value)}
                placeholder="Ejemplo: Falta de repuesto especial, morador ausente, corte de suministro general..."
                className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                La tarea quedará en estado de espera hasta que el supervisor autorice la suspensión o indique cómo proseguir.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setModalSuspender({ open: false, tarea: null })}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarSuspension}
                disabled={submittingSuspender || !motivoInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center space-x-1 disabled:opacity-50"
              >
                {submittingSuspender ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PauseCircle className="w-3.5 h-3.5" />
                )}
                <span>Solicitar Suspensión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALLE COMPLETO DE TAREA ─────────────────────────── */}
      {modalDetalle.open && modalDetalle.tarea && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-orange-600 tracking-wide uppercase">
                  {modalDetalle.tarea.categoriaNombre}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {modalDetalle.tarea.numeroOT}
                </h3>
              </div>
              <button
                onClick={() => setModalDetalle({ open: false, tarea: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Ubicación / Unidad Funcional:</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {modalDetalle.tarea.unidadFuncionalDisplay}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Sector: {modalDetalle.tarea.sectorEscalera || 'N/D'} | Piso: {modalDetalle.tarea.piso || 'PB'} | Depto: {modalDetalle.tarea.depto || '-'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500">Problema Reportado:</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border mt-0.5 leading-relaxed">
                  {modalDetalle.tarea.problemaReportado}
                </p>
              </div>

              {modalDetalle.tarea.solucionRealizada && (
                <div>
                  <span className="font-semibold text-emerald-700">Solución Registrada:</span>
                  <p className="text-slate-800 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 mt-0.5 leading-relaxed">
                    {modalDetalle.tarea.solucionRealizada}
                  </p>
                </div>
              )}

              {modalDetalle.tarea.motivoSuspension && (
                <div>
                  <span className="font-semibold text-rose-700">Motivo de Suspensión:</span>
                  <p className="text-slate-800 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 mt-0.5 leading-relaxed">
                    {modalDetalle.tarea.motivoSuspension}
                  </p>
                </div>
              )}

              {modalDetalle.tarea.observaciones && (
                <div>
                  <span className="font-semibold text-slate-500">Observaciones del Encargado:</span>
                  <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border mt-0.5">
                    {modalDetalle.tarea.observaciones}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t grid grid-cols-2 gap-2 text-slate-500 text-[11px]">
                <div>
                  <span className="block font-semibold">Creada el:</span>
                  {format(new Date(modalDetalle.tarea.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
                <div>
                  <span className="block font-semibold">Días activa:</span>
                  {modalDetalle.tarea.diasPendiente} días
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end space-x-2">
              <button
                onClick={() => handleDescargarPdf(modalDetalle.tarea!)}
                className="py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => setModalDetalle({ open: false, tarea: null })}
                className="py-2 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
