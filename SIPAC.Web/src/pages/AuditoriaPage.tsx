import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditoriaApi } from '../services/api';
import { AuditLog } from '../types';
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface ChangeItem {
  campo: string;
  nombreVisible: string;
  valorAnterior?: any;
  valorNuevo?: any;
}

const safeParseJson = (jsonStr?: string | null): Record<string, any> | null => {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
};

const formatPropertyName = (name: string): string => {
  const dictionary: Record<string, string> = {
    Nombre: 'Nombre',
    CategoriaId: 'Categoría ID',
    UnidadMedida: 'Unidad de Medida',
    EsFraccionable: 'Es Fraccionable',
    StockActual: 'Stock Actual',
    StockMinimo: 'Stock Mínimo',
    Activo: 'Estado Activo',
    Estado: 'Estado OT',
    ProblemaReportado: 'Problema Reportado',
    SolucionRealizada: 'Solución Realizada',
    Observaciones: 'Observaciones',
    ResponsableId: 'Responsable ID',
    UnidadFuncionalId: 'Unidad Funcional ID',
    Cantidad: 'Cantidad',
    CantidadRecibida: 'Cantidad Recibida',
    NroComprobante: 'N° Comprobante',
    FechaCompra: 'Fecha de Compra',
    Motivo: 'Motivo',
    Justificacion: 'Justificación',
    TipoAjuste: 'Tipo de Ajuste',
    Id: 'Identificador (ID)',
  };

  if (dictionary[name]) return dictionary[name];
  return name.replace(/([A-Z])/g, ' $1').trim();
};

const formatValue = (val: any): string => {
  if (val === null || val === undefined) return '(Vacío)';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

const extractChanges = (
  log: AuditLog
): { changes: ChangeItem[]; type: 'modified' | 'added' | 'deleted' | 'empty' } => {
  const ant = safeParseJson(log.valoresAnteriores) || {};
  const nue = safeParseJson(log.valoresNuevos) || {};

  if (log.accion === 'Added') {
    const keys = Object.keys(nue);
    if (keys.length === 0) return { changes: [], type: 'empty' };
    const items: ChangeItem[] = keys.map((k) => ({
      campo: k,
      nombreVisible: formatPropertyName(k),
      valorNuevo: nue[k],
    }));
    return { changes: items, type: 'added' };
  }

  if (log.accion === 'Deleted') {
    const keys = Object.keys(ant);
    if (keys.length === 0) return { changes: [], type: 'empty' };
    const items: ChangeItem[] = keys.map((k) => ({
      campo: k,
      nombreVisible: formatPropertyName(k),
      valorAnterior: ant[k],
    }));
    return { changes: items, type: 'deleted' };
  }

  // Modificación (Modified): SOLO atributos que cambiaron
  const allKeys = Array.from(new Set([...Object.keys(ant), ...Object.keys(nue)]));
  const diffKeys = allKeys.filter((k) => {
    const v1 = ant[k];
    const v2 = nue[k];
    if (v1 === undefined && v2 === undefined) return false;
    if (v1 !== undefined && v2 !== undefined && JSON.stringify(v1) === JSON.stringify(v2)) {
      return false;
    }
    return true;
  });

  if (diffKeys.length === 0) return { changes: [], type: 'empty' };

  const items: ChangeItem[] = diffKeys.map((k) => ({
    campo: k,
    nombreVisible: formatPropertyName(k),
    valorAnterior: ant[k],
    valorNuevo: nue[k],
  }));

  return { changes: items, type: 'modified' };
};

export const AuditoriaPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [accionFilter, setAccionFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: auditoriaApi.getAll,
  });

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const modelsAvailable = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.model) set.add(l.model);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (accionFilter && l.accion !== accionFilter) return false;
      if (modelFilter && l.model !== modelFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const inUser = l.usuarioNombre?.toLowerCase().includes(s);
        const inModel = l.model?.toLowerCase().includes(s);
        const inId = String(l.modelId || '').toLowerCase().includes(s);
        const inValAnt = l.valoresAnteriores?.toLowerCase().includes(s);
        const inValNue = l.valoresNuevos?.toLowerCase().includes(s);
        if (!inUser && !inModel && !inId && !inValAnt && !inValNue) return false;
      }
      return true;
    });
  }, [logs, accionFilter, modelFilter, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center space-x-2.5">
          <ShieldAlert className="w-6 h-6 text-blue-400" />
          <span>Trazabilidad y Auditoría</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Registro inmutable de cambios y modificaciones en las entidades del sistema
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario, entidad, ID o valor modificado..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={accionFilter}
            onChange={(e) => setAccionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas las Acciones</option>
            <option value="Added">Altas (Added)</option>
            <option value="Modified">Modificaciones (Modified)</option>
            <option value="Deleted">Bajas (Deleted)</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas las Entidades</option>
            {modelsAvailable.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando registros de auditoría...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No se encontraron registros de auditoría con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                  <th className="py-3 px-4">Entidad Afectada</th>
                  <th className="py-3 px-4 text-right">Detalle de Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.map((l) => {
                  const isExpanded = !!expandedIds[l.id];
                  const { changes, type } = extractChanges(l);

                  return (
                    <React.Fragment key={l.id}>
                      <tr className={`hover:bg-slate-900/50 transition-colors ${isExpanded ? 'bg-slate-900/30' : ''}`}>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {format(new Date(l.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                        </td>
                        <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                          {l.usuarioNombre}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              l.accion === 'Added'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : l.accion === 'Modified'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {l.accion === 'Added'
                              ? 'Alta'
                              : l.accion === 'Modified'
                              ? 'Modificación'
                              : 'Baja'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-300">
                          <span className="font-semibold text-white">{l.model}</span>{' '}
                          <span className="text-slate-500 text-[11px]">(ID #{l.modelId || '-'})</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <div className="flex items-center justify-end space-x-2.5">
                            {type === 'modified' && (
                              <span className="inline-block text-[11px] font-medium text-slate-400">
                                <span className="font-bold text-blue-400">{changes.length}</span>{' '}
                                {changes.length === 1 ? 'campo modificado' : 'campos modificados'}
                              </span>
                            )}
                            {type === 'added' && (
                              <span className="inline-block text-[11px] font-medium text-emerald-400">
                                Creación ({changes.length} campos)
                              </span>
                            )}
                            {type === 'deleted' && (
                              <span className="inline-block text-[11px] font-medium text-red-400">
                                Eliminación ({changes.length} campos)
                              </span>
                            )}
                            {type === 'empty' && (
                              <span className="inline-block text-[11px] text-slate-500 italic">
                                Sin cambios registrados
                              </span>
                            )}

                            <button
                              onClick={() => toggleExpand(l.id)}
                              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                isExpanded
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
                              }`}
                              title={isExpanded ? 'Ocultar detalles' : 'Ver atributos'}
                            >
                              <span>{isExpanded ? 'Cerrar' : 'Ver Detalle'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Fila desplegable con el detalle específico */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-y border-slate-800/80">
                          <td colSpan={5} className="py-4 px-6 font-sans">
                            {type === 'modified' && (
                              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner">
                                <div className="text-xs font-bold text-slate-200 mb-3 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                    <span>Atributos Modificados ({changes.length})</span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    Solo se exhiben los campos cuyos valores fueron alterados
                                  </span>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-slate-800/80">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                                      <tr>
                                        <th className="py-2.5 px-4">Atributo</th>
                                        <th className="py-2.5 px-4 text-left">Valor Anterior</th>
                                        <th className="py-2.5 px-2 text-center w-10"></th>
                                        <th className="py-2.5 px-4 text-left">Valor Nuevo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                      {changes.map((c) => (
                                        <tr key={c.campo} className="hover:bg-slate-800/40 transition-colors">
                                          <td className="py-2.5 px-4 font-sans font-semibold text-slate-200">
                                            {c.nombreVisible}{' '}
                                            <span className="text-[10px] text-slate-500 font-mono font-normal">
                                              ({c.campo})
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-4 text-red-400">
                                            <span className="inline-block px-2 py-0.5 bg-red-950/50 border border-red-900/50 rounded line-through opacity-80">
                                              {formatValue(c.valorAnterior)}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-2 text-center text-slate-500 font-sans">
                                            <ArrowRight className="w-3.5 h-3.5 mx-auto text-blue-400" />
                                          </td>
                                          <td className="py-2.5 px-4 text-emerald-400 font-bold">
                                            <span className="inline-block px-2 py-0.5 bg-emerald-950/50 border border-emerald-900/50 rounded">
                                              {formatValue(c.valorNuevo)}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {type === 'added' && (
                              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner">
                                <div className="text-xs font-bold text-emerald-400 mb-3 flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                  <span>Valores Iniciales del Registro Creado ({changes.length} atributos)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {changes.map((c) => (
                                    <div
                                      key={c.campo}
                                      className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg"
                                    >
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                        {c.nombreVisible}
                                      </div>
                                      <div
                                        className="text-xs font-mono font-semibold text-emerald-300 truncate mt-1"
                                        title={formatValue(c.valorNuevo)}
                                      >
                                        {formatValue(c.valorNuevo)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {type === 'deleted' && (
                              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner">
                                <div className="text-xs font-bold text-red-400 mb-3 flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                  <span>Valores Previos a la Baja ({changes.length} atributos)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {changes.map((c) => (
                                    <div
                                      key={c.campo}
                                      className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg"
                                    >
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                        {c.nombreVisible}
                                      </div>
                                      <div
                                        className="text-xs font-mono font-semibold text-red-300 truncate mt-1"
                                        title={formatValue(c.valorAnterior)}
                                      >
                                        {formatValue(c.valorAnterior)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {type === 'empty' && (
                              <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-900/40 rounded-xl border border-slate-800">
                                No se encontraron atributos detallados en este registro histórico.
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
