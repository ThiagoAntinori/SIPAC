import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import { Boxes, Lock, User, KeyRound, CheckCircle2 } from 'lucide-react';

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

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SIPAC</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema Integral de Pañol y Abastecimiento</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. admin o panolero"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all duration-150 flex items-center justify-center space-x-2"
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

        {/* Demo credentials hint */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Credenciales de prueba:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin', 'Admin123!')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-colors group"
            >
              <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-0.5">
                <span>Admin</span>
                <CheckCircle2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">admin / Admin123!</p>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('panolero', 'Panol123!')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-colors group"
            >
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-0.5">
                <span>Pañolero</span>
                <CheckCircle2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">panolero / Panol123!</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
