import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditoriaApi } from '../services/api';
import { ShieldAlert, History, User, Activity } from 'lucide-react';
import { format } from 'date-fns';

export const AuditoriaPage: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: auditoriaApi.getAll,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center space-x-2.5">
          <ShieldAlert className="w-6 h-6 text-blue-400" />
          <span>Trazabilidad y Auditoría</span>
        </h1>
        <p className="text-slate-400 text-sm">Registro inmutable de transacciones y cambios en el sistema</p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando registros de auditoría...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay registros de auditoría aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                  <th className="py-3 px-4">Entidad Afectada</th>
                  <th className="py-3 px-4">Valores Modificados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400">
                      {format(new Date(l.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                      {l.usuarioNombre}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.accion === 'Added'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : l.accion === 'Modified'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {l.accion === 'Added' ? 'Alta' : l.accion === 'Modified' ? 'Modificación' : 'Baja'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      <span className="font-semibold">{l.model}</span> (ID #{l.modelId || '-'})
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                      {l.valoresNuevos || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
