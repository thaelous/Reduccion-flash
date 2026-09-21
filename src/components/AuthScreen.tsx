import React, { useState, useRef, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  LogIn,
  X,
  ShieldCheck,
  Loader2,
  Sparkles,
  TicketPercent,
  RefreshCw,
} from 'lucide-react';
import {
  auth,
  registerTeacherWithFirestore,
  loginTeacherWithFirestore,
  validateLicenseInFirestore,
  checkTeacherDeviceAccess,
  User,
} from '../utils/firebase';
import { soundManager } from '../utils/audio';
import {
  isDeviceLicenseRegistered,
  markDeviceLicenseRegistered,
} from '../utils/device';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  onCancel?: () => void;
  isMandatory?: boolean;
}

type MainTab = 'redeem_code' | 'login';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onCancel, isMandatory = false }) => {
  // Intelligent Boot:
  // - If this computer already has a validated license, open directly on 'login' (skipping redemption).
  // - If opening on a new computer without a validated license, open directly on 'redeem_code' requesting the purchase code.
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    return isDeviceLicenseRegistered() ? 'login' : 'redeem_code';
  });

  // Tab 1: Redeem Code & Registration State
  const [purchaseCode, setPurchaseCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [validatedCode, setValidatedCode] = useState<string | null>(() => {
    // Check if previously validated in this session
    try {
      return sessionStorage.getItem('reduccion_validated_license_code') || null;
    } catch {
      return null;
    }
  });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isCodeShaking, setIsCodeShaking] = useState(false);

  // Registration Form (unlocked once code is validated)
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Tab 2: Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Refs for smooth autofocus
  const codeInputRef = useRef<HTMLInputElement>(null);
  const regEmailRef = useRef<HTMLInputElement>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'redeem_code') {
      if (!validatedCode) {
        codeInputRef.current?.focus();
      } else {
        regEmailRef.current?.focus();
      }
    } else {
      loginEmailRef.current?.focus();
    }
  }, [activeTab, validatedCode]);

  // -------------------------------------------------------------
  // HANDLER: Validate Purchase / Activation Code against Firestore
  // -------------------------------------------------------------
  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = purchaseCode.trim().toUpperCase();

    if (!cleanCode) {
      setCodeError('Por favor, introduce el código de compra o activación (ej. FLA-0001).');
      setIsCodeShaking(true);
      setTimeout(() => setIsCodeShaking(false), 450);
      return;
    }

    setIsValidatingCode(true);
    setCodeError(null);

    try {
      // Validate directly against Firestore database 'suscripciones' collection
      const result = await validateLicenseInFirestore(cleanCode);

      if (result.valid) {
        soundManager.playStart();
        // If it was already bound to this exact computer, guide straight to login tab
        if (result.alreadyBoundToThisDevice) {
          markDeviceLicenseRegistered(result.code);
          setActiveTab('login');
          setLoginError(null);
          return;
        }

        setValidatedCode(result.code);
        setCodeError(null);
        setPurchaseCode(''); // Clear previous text so it doesn't linger
        try {
          sessionStorage.setItem('reduccion_validated_license_code', result.code);
        } catch {
          // ignore
        }
      } else {
        soundManager.playLose();
        setCodeError(result.message || 'El código de compra no es válido o ya fue utilizado.');
        setIsCodeShaking(true);
        setTimeout(() => setIsCodeShaking(false), 450);
        setPurchaseCode(''); // Clear old invalid code to start fresh
        setValidatedCode(null);
        try {
          sessionStorage.removeItem('reduccion_validated_license_code');
        } catch {
          // ignore
        }
        codeInputRef.current?.focus();
      }
    } catch (err: any) {
      console.error('Error during license validation:', err);
      soundManager.playLose();
      setCodeError('Error de red al consultar Firestore. Verifica tu conexión.');
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Handler to change code or re-enter a new code from scratch
  const handleResetCode = () => {
    soundManager.playClick();
    setValidatedCode(null);
    setPurchaseCode('');
    setCodeError(null);
    setRegError(null);
    try {
      sessionStorage.removeItem('reduccion_validated_license_code');
    } catch {
      // ignore
    }
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 50);
  };

  // -------------------------------------------------------------
  // HANDLER: Register Teacher Account & Link License in Firestore
  // -------------------------------------------------------------
  const handleRegisterWithLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!validatedCode) {
      setRegError('Debes validar primero un código de compra válido.');
      return;
    }
    if (!cleanEmail) {
      setRegError('Por favor, introduce tu correo electrónico.');
      return;
    }
    if (!regPassword) {
      setRegError('Por favor, introduce una contraseña.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setIsRegistering(true);
    setRegError(null);

    try {
      const defaultDisplayName = cleanEmail.split('@')[0];
      // Registers directly in Firestore 'usuarios' (email as doc ID) & updates 'suscripciones'
      const user = await registerTeacherWithFirestore(
        cleanEmail,
        regPassword,
        validatedCode,
        defaultDisplayName
      );

      soundManager.playWin();
      onSuccess(user);
    } catch (err: any) {
      soundManager.playLose();
      console.error('Registration error in Firestore:', err);
      setRegError(err?.message || 'Error al registrar la cuenta docente en Firestore.');
    } finally {
      setIsRegistering(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: Login with Existing Account (Pure Firestore)
  // -------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setLoginError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Por favor ingresa tu contraseña.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      // Queries Firestore 'usuarios' collection directly (email as doc ID)
      const user = await loginTeacherWithFirestore(cleanEmail, loginPassword);

      soundManager.playWin();
      onSuccess(user);
    } catch (err: any) {
      soundManager.playLose();
      console.error('Firestore Login error:', err);
      setLoginError(err?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070A]/90 flex flex-col items-center justify-center p-3 sm:p-4 selection:bg-indigo-500/30 selection:text-white overflow-y-auto backdrop-blur-md">
      {/* Background Ambient Glow */}
      <div className="absolute w-[360px] sm:w-[560px] h-[360px] sm:h-[560px] bg-indigo-600/15 rounded-full blur-[110px] pointer-events-none animate-pulse-glow" />

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl shadow-black/80 space-y-5 animate-fade-in my-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-indigo-300 text-[11px] font-bold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Acceso con Licencia &bull; Reducción Flash</span>
          </div>

          {!isMandatory && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Volver al Menú"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-slate-800/60 border border-slate-700/60 text-amber-400 flex items-center justify-center shadow-inner"
              title="Acceso Obligatorio con Licencia"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Acceso a Reducción Flash
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {activeTab === 'redeem_code'
              ? 'Canjea tu código de compra para activar tu licencia y acceder al juego completo.'
              : 'Accede con tu cuenta registrada para ingresar a Reducción Flash.'}
          </p>
        </div>

        {/* Top Navigation Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('redeem_code');
              setCodeError(null);
              setRegError(null);
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'redeem_code'
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Canjear Código</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: CANJEAR CÓDIGO DE COMPRA Y REGISTRO DE CUENTA          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'redeem_code' && (
          <div className="space-y-4">
            {/* SUB-STEP A: Enter & Validate Purchase Code in Firestore */}
            {!validatedCode ? (
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div className={`space-y-1.5 ${isCodeShaking ? 'animate-shake' : ''}`}>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="purchase-code"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                    >
                      Código de Compra o Activación
                    </label>
                    <span className="text-[10px] text-amber-400 font-medium">
                      Validación en Firestore
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="purchase-code"
                      ref={codeInputRef}
                      type="text"
                      value={purchaseCode}
                      onChange={(e) => {
                        setPurchaseCode(e.target.value.toUpperCase());
                        if (codeError) setCodeError(null);
                      }}
                      placeholder="Ej. FLA-0001"
                      disabled={isValidatingCode}
                      className={`w-full px-4 py-3.5 bg-slate-950/90 border rounded-2xl text-white text-sm font-semibold tracking-wider uppercase outline-none transition-all placeholder:text-slate-600 placeholder:normal-case ${
                        codeError
                          ? 'border-rose-500/70 focus:border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                          : 'border-slate-800 focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                      }`}
                    />
                    <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Introduce el código que obtuviste al adquirir el software para consultar la colección de suscripciones en Firestore.
                  </p>
                </div>

                {codeError && (
                  <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{codeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isValidatingCode}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isValidatingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando en Firestore...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar Código de Compra</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* SUB-STEP B: Code is Validated -> Clean Registration Form (green box and code removed) */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-white tracking-tight">
                    Registro de Cuenta Docente
                  </span>
                  <button
                    type="button"
                    onClick={handleResetCode}
                    className="text-[11px] font-semibold text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    title="Ingresar un código nuevo desde cero"
                  >
                    Cambiar código
                  </button>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleRegisterWithLicense} className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="teacher-reg-email"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <input
                        id="teacher-reg-email"
                        ref={regEmailRef}
                        type="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          if (regError) setRegError(null);
                        }}
                        placeholder="docente@escuela.edu"
                        disabled={isRegistering}
                        required
                        className="w-full px-3.5 py-2.5 pr-9 bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-xs font-medium outline-none transition-all placeholder:text-slate-600"
                      />
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="teacher-reg-password"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="teacher-reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regError) setRegError(null);
                        }}
                        placeholder="Mínimo 6 caracteres"
                        disabled={isRegistering}
                        required
                        className="w-full px-3.5 py-2.5 pr-9 bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-xs font-medium outline-none transition-all placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                        title={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {regError && (
                    <div className="flex items-start gap-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full py-3 px-5 rounded-2xl font-bold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/25 disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Registrando y Vinculando...</span>
                      </>
                    ) : (
                      <>
                        <span>Completar Registro y Entrar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: INICIAR SESIÓN (CUENTAS YA REGISTRADAS)                */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label
                htmlFor="teacher-login-email"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="teacher-login-email"
                  ref={loginEmailRef}
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="docente@escuela.edu"
                  disabled={isLoggingIn}
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 pr-10 bg-slate-950/90 border border-slate-800 focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)] rounded-2xl text-white text-sm font-medium outline-none transition-all placeholder:text-slate-600"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="teacher-login-password"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="teacher-login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Tu contraseña registrada"
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-11 bg-slate-950/90 border border-slate-800 focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)] rounded-2xl text-white text-sm font-medium outline-none transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <>
                  <span>Entrar al Panel de Profesor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('redeem_code');
                  setLoginError(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer transition-colors"
              >
                ¿Aún no has activado tu licencia? Canjear código de compra
              </button>
            </div>
          </form>
        )}

        {/* Card Footer */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Proyecto reduccionflash</span>
          <span>Firebase Auth &amp; Firestore</span>
        </div>
      </div>
    </div>
  );
};
