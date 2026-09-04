import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import { Wrench, Lock, User, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login({ username, password });
      setAuth(res.token, res.usuario);
      toast.success(`¡Bienvenido, ${res.usuario.nombreCompleto}!`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión. Verifique sus credenciales.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center p-4">
      {/* Background pattern with higher visibility */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />

      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-md p-8 z-10 relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-orange-600 rounded-xl text-white mb-4 shadow-sm">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SIPAC</h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">Sistema Integral de Pañol y Abastecimiento</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                className="w-full pl-9 pr-4 h-10 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 h-10 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 h-10 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-md text-sm transition-all duration-150 active:scale-[0.99] flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-slate-500 font-medium z-10">
        BASI Fix · Sistema de Pañol y Mantenimiento
      </p>
    </div>
  );
};
