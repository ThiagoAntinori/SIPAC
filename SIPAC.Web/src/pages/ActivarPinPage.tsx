import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { operariosApi } from '../services/api';
import toast from 'react-hot-toast';
import { Shield, KeyRound, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const ActivarPinPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [nombreOperario, setNombreOperario] = useState('');
  const [usuario, setUsuario] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 4 casillas para el nuevo PIN
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  // 4 casillas para confirmación
  const [confirmDigits, setConfirmDigits] = useState<string[]>(['', '', '', '']);

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const confirmRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      setErrorMessage('No se ha proporcionado un token de activación en el enlace.');
      return;
    }

    const validate = async () => {
      setChecking(true);
      try {
        const res = await operariosApi.validarTokenPin(token);
        if (res.valido) {
          setValid(true);
          setNombreOperario(res.nombreOperario);
          setUsuario(res.usuario);
        } else {
          setValid(false);
          setErrorMessage(res.mensaje || 'Enlace de activación no válido.');
        }
      } catch (err: any) {
        setValid(false);
        setErrorMessage(
          err.response?.data?.mensaje ||
          err.response?.data?.message ||
          'El enlace de activación ha expirado o ya fue utilizado.'
        );
      } finally {
        setChecking(false);
      }
    };

    validate();
  }, [token]);

  const handleDigitChange = (
    index: number,
    value: string,
    digits: string[],
    setDigits: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 3) {
      refs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    digits: string[],
    refs: React.RefObject<HTMLInputElement>[]
  ) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join('');
    const confirm = confirmDigits.join('');

    if (pin.length !== 4) {
      toast.error('El PIN debe constar exactamente de 4 dígitos');
      return;
    }

    if (confirm.length !== 4) {
      toast.error('Por favor confirma los 4 dígitos de tu PIN');
      return;
    }

    if (pin !== confirm) {
      toast.error('Los PINs ingresados no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      await operariosApi.activarPin(token, pin);
      setSuccess(true);
      toast.success('¡PIN configurado exitosamente!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al configurar el PIN');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 text-sm font-medium">Validando enlace de activación...</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-800 border border-rose-500/40 rounded-2xl p-6 text-center shadow-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Enlace no válido o expirado</h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-5">{errorMessage}</p>
          <Link
            to="/login-operario"
            className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold block transition-colors"
          >
            Ir al Acceso de Operarios
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-800 border border-emerald-500/40 rounded-2xl p-6 text-center shadow-2xl space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">¡PIN Configurado con Éxito!</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tu cuenta ha sido activada para <strong>{nombreOperario}</strong> con el usuario{' '}
            <code className="px-1.5 py-0.5 bg-slate-900 text-orange-400 rounded font-bold">{usuario}</code>.
          </p>
          <button
            onClick={() => navigate('/login-operario')}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <span>Iniciar Sesión en el Portal Móvil</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-sm mx-auto pt-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-600/20 text-orange-400 border border-orange-500/30 mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Configuración de PIN</h1>
        <p className="text-xs text-slate-400 mt-1">Crea tu clave numérica de 4 dígitos para ingresar desde tu teléfono</p>
      </div>

      <div className="w-full max-w-sm mx-auto my-auto bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        {/* Identificación del operario */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
            {nombreOperario.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{nombreOperario}</p>
            <p className="text-xs text-slate-400">Usuario: <span className="text-orange-400 font-mono font-semibold">{usuario}</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ingreso de nuevo PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Ingresa tu PIN (4 dígitos)
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {pinDigits.map((digit, i) => (
                <input
                  key={`pin-${i}`}
                  ref={pinRefs[i]}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value, pinDigits, setPinDigits, pinRefs)}
                  onKeyDown={(e) => handleKeyDown(i, e, pinDigits, pinRefs)}
                  className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  required
                />
              ))}
            </div>
          </div>

          {/* Confirmación de PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Confirma tu PIN
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {confirmDigits.map((digit, i) => (
                <input
                  key={`conf-${i}`}
                  ref={confirmRefs[i]}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value, confirmDigits, setConfirmDigits, confirmRefs)}
                  onKeyDown={(e) => handleKeyDown(i, e, confirmDigits, confirmRefs)}
                  className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  required
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || pinDigits.join('').length !== 4 || confirmDigits.join('').length !== 4}
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 flex items-center justify-center space-x-2 text-sm transition-all"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Configurar PIN y Activar</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="w-full max-w-sm mx-auto text-center pb-4">
        <Link to="/login-operario" className="text-xs text-slate-400 hover:text-slate-200">
          ¿Ya tienes tu PIN? Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
};
