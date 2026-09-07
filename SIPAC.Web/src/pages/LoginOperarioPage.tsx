import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { operariosApi } from '../services/api';
import toast from 'react-hot-toast';
import { Wrench, ShieldCheck, ArrowRight, Eye, EyeOff, Building2 } from 'lucide-react';

export const LoginOperarioPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [usuario, setUsuario] = useState('');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Si ya hay sesión activa de operario, redirigir
  const currentUser = useAuthStore((s) => s.user);
  useEffect(() => {
    if (currentUser?.rol === 'Operario') {
      navigate('/operario', { replace: true });
    }
  }, [currentUser, navigate]);

  const handlePinChange = (index: number, value: string) => {
    // Si pegan los 4 dígitos juntos
    if (value.length > 1) {
      const numbersOnly = value.replace(/\D/g, '').slice(0, 4).split('');
      const newDigits = [...pinDigits];
      numbersOnly.forEach((digit, i) => {
        if (i < 4) newDigits[i] = digit;
      });
      setPinDigits(newDigits);
      const nextIndex = Math.min(numbersOnly.length, 3);
      inputRefs[nextIndex]?.current?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    // Auto-focus a la siguiente casilla si ingresó dígito
    if (digit && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join('');

    if (!usuario.trim()) {
      toast.error('Por favor, ingresa tu nombre de usuario');
      return;
    }

    if (pin.length !== 4) {
      toast.error('El PIN debe constar exactamente de 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      const data = await operariosApi.login(usuario.trim(), pin);
      setAuth(data.token, {
        id: data.operario.id,
        nombreCompleto: data.operario.nombreCompleto,
        username: data.operario.usuario,
        rol: 'Operario',
        activo: true,
        email: data.operario.email,
      });

      toast.success(`¡Bienvenido, ${data.operario.nombreCompleto}!`);
      navigate('/operario', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión. Revisa tu usuario y PIN.';
      toast.error(msg);
      // Reset PIN inputs on error
      setPinDigits(['', '', '', '']);
      inputRefs[0]?.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Header móvil */}
      <div className="w-full max-w-sm mx-auto pt-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-lg shadow-orange-600/30 mb-4">
          <Wrench className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">SITRAC MÓVIL</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Portal de Autoservicio para Operarios
        </p>
      </div>

      {/* Tarjeta de Login */}
      <div className="w-full max-w-sm mx-auto my-auto bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-2xl p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Input Usuario */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Nombre de Usuario
            </label>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value.toLowerCase())}
              placeholder="ej: cgomez"
              className="w-full px-4 h-12 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              required
            />
          </div>

          {/* 4 Casillas de PIN numérico */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                PIN de 4 Dígitos
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? 'Ocultar' : 'Ver'}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {pinDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-full h-14 bg-slate-900/90 border-2 border-slate-700 rounded-xl text-center text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-inner"
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Ingresa el código numérico asignado en tu activación.
            </p>
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={loading || pinDigits.join('').length !== 4 || !usuario.trim()}
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center space-x-2 text-base transition-all duration-150 active:scale-[0.99]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Ingresar a mis Tareas</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer y enlace a panel administrativo */}
      <div className="w-full max-w-sm mx-auto text-center pb-4 space-y-3">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400 font-medium transition-colors"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Acceso de Administración y Pañol</span>
        </Link>
        <p className="text-[11px] text-slate-500">
          SITRAC &copy; {new Date().getFullYear()} • Sistema Integral de Trabajos y Abastecimiento para Consorcios
        </p>
      </div>
    </div>
  );
};
