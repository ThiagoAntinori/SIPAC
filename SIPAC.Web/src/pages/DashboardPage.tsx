import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const DashboardPage: React.FC = () => {
  const { data: resumen, isLoading, error } = useQuery({
    queryKey: ['dashboardResumen'],
    queryFn: dashboardApi.getResumen,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !resumen) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-sm font-medium">
        Error al cargar métricas del Dashboard.
      </div>
    );
  }

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'Finalizado':   return 'bg-emerald-50 text-emerald-800 border border-emerald-300';
      case 'En Proceso':   return 'bg-sky-50 text-sky-800 border border-sky-300';
      case 'Suspendido':   return 'bg-violet-50 text-violet-800 border border-violet-300';
      case 'Cancelado':    return 'bg-slate-100 text-slate-700 border border-slate-300';
      default:             return 'bg-amber-50 text-amber-900 border border-amber-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-600 text-sm mt-0.5">Resumen integral de pañol, consumos y órdenes de trabajo</p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2">
          <Link
            to="/salidas"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-orange-600" />
            <span>Registrar Salida</span>
          </Link>
          <Link
            to="/compras"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.99]"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Registrar Compra</span>
          </Link>
          <Link
            to="/ordenes"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-bold shadow-xs transition-all duration-150 active:scale-[0.99]"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Nueva OT</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Artículos</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{resumen.totalArticulos}</p>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Stock Crítico</p>
            <p className="text-2xl font-bold text-amber-950 mt-0.5 tabular-nums">{resumen.articulosStockBajo}</p>
          </div>
          <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">OTs Activas</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{resumen.totalOrdenesActivas}</p>
          </div>
          <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-lg shadow-sm flex items-center justify-between ${
          resumen.totalAlertasInactividad > 0
            ? 'bg-rose-50 border border-rose-300'
            : 'bg-white border border-slate-200'
        }`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${
              resumen.totalAlertasInactividad > 0 ? 'text-rose-800' : 'text-slate-600'
            }`}>+5 Días Inactiva</p>
            <p className={`text-2xl font-bold mt-0.5 tabular-nums ${
              resumen.totalAlertasInactividad > 0 ? 'text-rose-900' : 'text-slate-900'
            }`}>{resumen.totalAlertasInactividad || 0}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${
            resumen.totalAlertasInactividad > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stock Critico Warning Banner & Table */}
      {resumen.stockCritico && resumen.stockCritico.length > 0 && (
        <div className="bg-white border border-amber-300 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-300">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-bold text-amber-950">Materiales con Stock Bajo o Nulo</h2>
            </div>
            <Link to="/articulos" className="text-xs text-orange-700 hover:text-orange-800 font-bold transition-colors">
              Ver catálogo →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Stock Mínimo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumen.stockCritico.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">{art.nombre}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{art.categoriaNombre}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm tabular-nums">
                      {art.stockActual} {art.unidadMedida}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 font-medium tabular-nums">
                      {art.stockMinimo} {art.unidadMedida}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        art.stockActual <= 0
                          ? 'bg-rose-50 text-rose-800 border border-rose-300'
                          : 'bg-amber-50 text-amber-900 border border-amber-300'
                      }`}>
                        {art.stockActual <= 0 ? 'Sin Stock' : 'Stock Bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Egresos Recientes & Ultimas Órdenes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Egresos Recientes */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
              <span>Salidas / Consumos Recientes</span>
            </h2>
            <Link to="/salidas" className="text-xs text-orange-700 hover:text-orange-800 font-bold transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {resumen.egresosRecientes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center font-medium">No hay salidas registradas aún.</p>
            ) : (
              resumen.egresosRecientes.map((eg) => (
                <div key={eg.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{eg.articuloNombre}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      OT: <span className="font-mono font-bold text-slate-800">{eg.numeroOT}</span>
                      {' · '}<span className="text-slate-700 font-medium">{eg.unidadFuncionalDisplay || '-'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Por: {eg.empleadoNombre}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="font-bold text-rose-700 font-mono tabular-nums text-sm">
                      -{eg.cantidad} {eg.unidadMedida}
                    </span>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {format(new Date(eg.fechaHora), 'dd/MM HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas Órdenes de Trabajo */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              <span>Órdenes de Trabajo Recientes</span>
            </h2>
            <Link to="/ordenes" className="text-xs text-orange-700 hover:text-orange-800 font-bold transition-colors">
              Ver todas →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {resumen.ultimasOrdenes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center font-medium">No hay órdenes registradas.</p>
            ) : (
              resumen.ultimasOrdenes.map((ot) => (
                <div
                  key={ot.idOt}
                  className={`px-4 py-3 flex items-start justify-between ${
                    ot.esAlertaInactividad ? 'border-l-4 border-rose-500 pl-3 bg-rose-50/50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-mono font-bold text-slate-900 text-xs">{ot.numeroOT}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${estadoBadge(ot.estado)}`}>
                        {ot.estado}
                      </span>
                      {ot.esAlertaInactividad && (
                        <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 rounded-full font-bold">
                          +{ot.diasPendiente}d
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-900 font-semibold truncate">{ot.unidadFuncionalDisplay}</p>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{ot.problemaReportado}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs text-slate-800 font-semibold">{ot.responsableNombre}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {formatDistanceToNow(new Date(ot.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
