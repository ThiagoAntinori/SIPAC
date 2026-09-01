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
  Clock,
  MapPin,
  User,
  Wrench,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const { data: resumen, isLoading, error } = useQuery({
    queryKey: ['dashboardResumen'],
    queryFn: dashboardApi.getResumen,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !resumen) {
    return (
      <div className="p-4 bg-red-950/40 border border-red-900 rounded-xl text-red-300">
        Error al cargar métricas del Dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Panel de Control</h1>
          <p className="text-slate-400 text-sm">Resumen integral de pañol, consumos y órdenes de trabajo (BASI Fix)</p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2">
          <Link
            to="/salidas"
            className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Registrar Salida</span>
          </Link>
          <Link
            to="/compras"
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Registrar Compra</span>
          </Link>
          <Link
            to="/ordenes"
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Nueva OT</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Artículos en Catálogo</p>
            <p className="text-2xl font-bold text-white mt-1">{resumen.totalArticulos}</p>
          </div>
          <div className="p-2.5 bg-blue-600/15 border border-blue-500/30 rounded-xl text-blue-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border border-amber-900/40 rounded-xl flex items-center justify-between bg-amber-950/10">
          <div>
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Stock Crítico</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">{resumen.articulosStockBajo}</p>
          </div>
          <div className="p-2.5 bg-amber-600/15 border border-amber-500/30 rounded-xl text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Órdenes Activas</p>
            <p className="text-2xl font-bold text-white mt-1">{resumen.totalOrdenesActivas}</p>
          </div>
          <div className="p-2.5 bg-indigo-600/15 border border-indigo-500/30 rounded-xl text-indigo-400">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border border-red-900/40 rounded-xl flex items-center justify-between bg-red-950/10">
          <div>
            <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">+5 Días Inactiva</p>
            <p className="text-2xl font-bold text-red-300 mt-1">{resumen.totalAlertasInactividad || 0}</p>
          </div>
          <div className="p-2.5 bg-red-600/15 border border-red-500/30 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Egresos Hoy</p>
            <p className="text-2xl font-bold text-white mt-1">{resumen.egresosHoy}</p>
          </div>
          <div className="p-2.5 bg-emerald-600/15 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stock Critico Warning Banner & Table */}
      {resumen.stockCritico && resumen.stockCritico.length > 0 && (
        <div className="bg-slate-950 border border-amber-900/50 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Alerta de Materiales con Stock Bajo o Nulo</h2>
            </div>
            <Link to="/articulos" className="text-xs text-amber-400 hover:underline font-medium">
              Ver catálogo completo →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Artículo</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Stock Mínimo</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resumen.stockCritico.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{art.nombre}</td>
                    <td className="py-2.5 px-3 text-slate-400">{art.categoriaNombre}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">
                      {art.stockActual} {art.unidadMedida}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {art.stockMinimo} {art.unidadMedida}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/60 text-red-400 border border-red-800/40">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Egresos Recientes */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <ArrowUpRight className="w-5 h-5 text-blue-400" />
              <span>Salidas / Consumos Recientes</span>
            </h2>
            <Link to="/salidas" className="text-xs text-blue-400 hover:underline">
              Ver todos →
            </Link>
          </div>

          {resumen.egresosRecientes.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No hay salidas registradas aún.</p>
          ) : (
            <div className="space-y-3">
              {resumen.egresosRecientes.map((eg) => (
                <div
                  key={eg.id}
                  className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{eg.articuloNombre}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      OT: <span className="text-blue-400 font-mono font-semibold">{eg.numeroOT}</span> • UF:{' '}
                      <span className="text-slate-300 font-medium">{eg.unidadFuncionalDisplay || '-'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Receptor: {eg.empleadoNombre}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-300 font-mono">
                      -{eg.cantidad} {eg.unidadMedida}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {format(new Date(eg.fechaHora), 'dd/MM HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas Órdenes de Trabajo */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              <span>Órdenes de Trabajo Recientes</span>
            </h2>
            <Link to="/ordenes" className="text-xs text-blue-400 hover:underline">
              Ver todas →
            </Link>
          </div>

          {resumen.ultimasOrdenes.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No hay órdenes registradas.</p>
          ) : (
            <div className="space-y-3">
              {resumen.ultimasOrdenes.map((ot) => (
                <div
                  key={ot.idOt}
                  className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
                    ot.esAlertaInactividad
                      ? 'bg-red-950/20 border-red-800/80'
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="truncate max-w-[70%]">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-blue-400 font-bold">{ot.numeroOT}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          ot.estado === 'Finalizado'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ot.estado === 'En Proceso'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : ot.estado === 'Suspendido'
                            ? 'bg-purple-950 text-purple-400 border border-purple-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {ot.estado}
                      </span>
                      {ot.esAlertaInactividad && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-red-600 text-white rounded font-bold">
                          +5 DÍAS
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-200 truncate mt-1">
                      {ot.unidadFuncionalDisplay} • {ot.categoriaNombre}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate">{ot.problemaReportado}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400 font-semibold">{ot.responsableNombre}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {format(new Date(ot.createdAt), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
