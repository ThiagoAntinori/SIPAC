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

  const accionBadge = (accion: string) => {
    switch (accion) {
      case 'Added':    return 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold';
      case 'Modified': return 'bg-sky-50 text-sky-800 border border-sky-300 font-bold';
      default:         return 'bg-rose-50 text-rose-800 border border-rose-300 font-bold';
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-slate-500" />
          <span>Trazabilidad y Auditoría</span>
        </h1>
        <p className="text-slate-600 text-sm mt-0.5">
          Registro inmutable de cambios y modificaciones en las entidades del sistema
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario, entidad, ID o valor modificado..."
            className="w-full pl-9 pr-4 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={accionFilter}
            onChange={(e) => setAccionFilter(e.target.value)}
            className="w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
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
            className="w-full px-3 h-9 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
          >
            <option value="">Todas las Entidades</option>
            {modelsAvailable.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando registros de auditoría...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No se encontraron registros con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                  <th className="py-3 px-4">Entidad Afectada</th>
                  <th className="py-3 px-4 text-right">Detalle de Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.map((l) => {
                  const isExpanded = !!expandedIds[l.id];
                  const { changes, type } = extractChanges(l);

                  return (
                    <React.Fragment key={l.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/80' : ''}`}>
                        <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap tabular-nums">
                          {format(new Date(l.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                          {l.usuarioNombre}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${accionBadge(l.accion)}`}>
                            {l.accion === 'Added' ? 'Alta' : l.accion === 'Modified' ? 'Modificación' : 'Baja'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-600">
                          <span className="font-semibold text-slate-900">{l.model}</span>{' '}
                          <span className="text-slate-400 text-[11px]">(ID #{l.modelId || '-'})</span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end space-x-2.5">
                            {type === 'modified' && (
                              <span className="inline-block text-[11px] font-medium text-slate-500">
                                <span className="font-bold text-sky-600">{changes.length}</span>{' '}
                                {changes.length === 1 ? 'campo modificado' : 'campos modificados'}
                              </span>
                            )}
                            {type === 'added' && (
                              <span className="inline-block text-[11px] font-medium text-emerald-600">
                                Creación ({changes.length} campos)
                              </span>
                            )}
                            {type === 'deleted' && (
                              <span className="inline-block text-[11px] font-medium text-rose-600">
                                Eliminación ({changes.length} campos)
                              </span>
                            )}
                            {type === 'empty' && (
                              <span className="inline-block text-[11px] text-slate-400 italic">
                                Sin cambios registrados
                              </span>
                            )}

                            <button
                              onClick={() => toggleExpand(l.id)}
                              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                isExpanded
                                  ? 'bg-slate-900 text-white border-slate-700'
                                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
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
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={5} className="py-4 px-6 font-sans">
                            {type === 'modified' && (
                              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                                <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                                    <span>Atributos Modificados ({changes.length})</span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    Solo se exhiben los campos cuyos valores fueron alterados
                                  </span>
                                </div>

                                <div className="overflow-x-auto rounded-md border border-slate-200">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                                      <tr>
                                        <th className="py-2.5 px-4">Atributo</th>
                                        <th className="py-2.5 px-4 text-left">Valor Anterior</th>
                                        <th className="py-2.5 px-2 text-center w-10" />
                                        <th className="py-2.5 px-4 text-left">Valor Nuevo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                      {changes.map((c) => (
                                        <tr key={c.campo} className="hover:bg-slate-50 transition-colors">
                                          <td className="py-2.5 px-4 font-sans font-semibold text-slate-700">
                                            {c.nombreVisible}{' '}
                                            <span className="text-[10px] text-slate-400 font-mono font-normal">({c.campo})</span>
                                          </td>
                                          <td className="py-2.5 px-4 text-rose-600">
                                            <span className="inline-block px-2 py-0.5 bg-rose-50 border border-rose-200 rounded line-through opacity-80">
                                              {formatValue(c.valorAnterior)}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-2 text-center text-slate-400 font-sans">
                                            <ArrowRight className="w-3.5 h-3.5 mx-auto text-slate-400" />
                                          </td>
                                          <td className="py-2.5 px-4 text-emerald-700 font-bold">
                                            <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded">
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
                              <div className="bg-white border border-emerald-200/60 rounded-lg p-4 shadow-xs">
                                <div className="text-xs font-semibold text-emerald-700 mb-3 flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Valores Iniciales del Registro Creado ({changes.length} atributos)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {changes.map((c) => (
                                    <div key={c.campo} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                        {c.nombreVisible}
                                      </div>
                                      <div
                                        className="text-xs font-mono font-semibold text-emerald-700 truncate mt-1"
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
                              <div className="bg-white border border-rose-200/60 rounded-lg p-4 shadow-xs">
                                <div className="text-xs font-semibold text-rose-700 mb-3 flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  <span>Valores Previos a la Baja ({changes.length} atributos)</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {changes.map((c) => (
                                    <div key={c.campo} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                        {c.nombreVisible}
                                      </div>
                                      <div
                                        className="text-xs font-mono font-semibold text-rose-700 truncate mt-1"
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
                              <div className="p-4 text-center text-slate-400 text-xs italic bg-white rounded-lg border border-slate-200">
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
