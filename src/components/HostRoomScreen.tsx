import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Users,
  Play,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  Sliders,
  Sparkles,
  Trophy,
  ArrowRight,
  RefreshCw,
  LogOut,
  Flame,
  Award,
  Crown,
  Eye,
  Hash,
} from 'lucide-react';
import { GameMode, SequenceLength } from '../types';
import {
  RoomData,
  RoomPlayer,
  RoomSettings,
  createRoom,
  subscribeToRoom,
  subscribeToPlayers,
  updateRoomStatus,
  startNewRoundInRoom,
  resetPlayersRoundState,
  auth,
  signOut,
  onAuthStateChanged,
  User,
} from '../utils/firebase';
import { soundManager } from '../utils/audio';
import { AuthScreen } from './AuthScreen';

interface HostRoomScreenProps {
  onBackToMenu: () => void;
}

export const HostRoomScreen: React.FC<HostRoomScreenProps> = ({ onBackToMenu }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Automatically derive the host name from the logged-in user's display name or email prefix
  const getHostDisplayName = (): string => {
    if (currentUser?.displayName && currentUser.displayName.trim()) {
      return currentUser.displayName.trim();
    }
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'Profesor';
  };
  const [selectedMode, setSelectedMode] = useState<GameMode>('advanced');
  const [selectedLength, setSelectedLength] = useState<SequenceLength>(5);
  const [stepInterval, setStepInterval] = useState<number>(1.5);
  const [answeringTime, setAnsweringTime] = useState<number>(8);
  const [totalRounds, setTotalRounds] = useState<number>(3);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // In-Game local playback state for sync broadcast
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [activeNumberIndex, setActiveNumberIndex] = useState<number>(0);
  const [answeringSecondsLeft, setAnsweringSecondsLeft] = useState<number>(0);

  const hostIdRef = useRef<string>(`host_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answeringTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Invite URL to encode into the QR code and copy button
  const getInviteUrl = (pin: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?room=${pin}`;
  };

  // 1. Create Room handler
  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      soundManager.playClick();
      const autoHostName = getHostDisplayName();
      const settings: RoomSettings = {
        mode: selectedMode,
        sequenceLength: selectedLength,
        stepIntervalSeconds: stepInterval,
        answeringTimeSeconds: answeringTime,
        totalRounds: totalRounds,
      };

      const pin = await createRoom(hostIdRef.current, autoHostName, settings);
      setRoomId(pin);
    } catch (err: any) {
      console.error('Error creating room:', err);
      setCreateError('Error al crear la sala: ' + (err?.message || 'Verifica tu conexión a Firebase.'));
    } finally {
      setIsCreating(false);
    }
  };

  // 2. Subscribe to Room and Players
  useEffect(() => {
    if (!roomId) return;

    const unsubscribeRoom = subscribeToRoom(roomId, (updatedRoom) => {
      setRoomData(updatedRoom);
    });

    const unsubscribePlayers = subscribeToPlayers(roomId, (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
    };
  }, [roomId]);

  // 3. Host State Machine for Game Flow
  useEffect(() => {
    if (!roomData) return;

    if (roomData.status === 'countdown') {
      setCountdownNum(3);
      soundManager.playTick();
      const interval = setInterval(() => {
        setCountdownNum((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Switch to sequence
            if (roomId) {
              updateRoomStatus(roomId, 'showing_sequence', {
                sequenceStartTime: Date.now(),
              });
            }
            return 0;
          }
          soundManager.playTick();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }

    if (roomData.status === 'showing_sequence') {
      setActiveNumberIndex(0);
      soundManager.playNumberTransition();

      const totalItems = roomData.sequence.length;
      const intervalMs = Math.round(roomData.settings.stepIntervalSeconds * 1000);

      let currentIdx = 0;
      const stepTimer = setInterval(() => {
        currentIdx += 1;
        if (currentIdx < totalItems) {
          setActiveNumberIndex(currentIdx);
          soundManager.playNumberTransition();
        } else {
          clearInterval(stepTimer);
          // Sequence finished -> transition to answering phase
          if (roomId) {
            updateRoomStatus(roomId, 'answering', {
              answeringStartTime: Date.now(),
            });
          }
        }
      }, intervalMs);

      return () => clearInterval(stepTimer);
    }

    if (roomData.status === 'answering') {
      const limit = roomData.settings.answeringTimeSeconds || 8;
      setAnsweringSecondsLeft(limit);

      const ansTimer = setInterval(() => {
        setAnsweringSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(ansTimer);
            // Time out -> show round results
            if (roomId) {
              updateRoomStatus(roomId, 'round_result');
            }
            return 0;
          }
          if (prev <= 3) {
            soundManager.playTick();
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(ansTimer);
    }

    if (roomData.status === 'game_over') {
      soundManager.playWin();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [roomData?.status, roomData?.currentRound, roomId]);

  // Copy helper
  const handleCopy = (text: string, type: 'link' | 'pin') => {
    navigator.clipboard.writeText(text);
    soundManager.playClick();
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // Start match handler
  const handleStartMatch = async () => {
    if (!roomId || !roomData) return;
    soundManager.playStart();
    await resetPlayersRoundState(
      roomId,
      players.map((p) => p.id)
    );
    await startNewRoundInRoom(roomId, 1, roomData.settings.sequenceLength);
  };

  // Next round handler
  const handleNextRound = async () => {
    if (!roomId || !roomData) return;
    const nextRound = roomData.currentRound + 1;
    if (nextRound > roomData.settings.totalRounds) {
      await updateRoomStatus(roomId, 'game_over');
    } else {
      soundManager.playStart();
      await resetPlayersRoundState(
        roomId,
        players.map((p) => p.id)
      );
      await startNewRoundInRoom(roomId, nextRound, roomData.settings.sequenceLength);
    }
  };

  // -------------------------------------------------------------
  // GUARD: If teacher is not authenticated via Firebase Auth, show AuthScreen
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
        onCancel={onBackToMenu}
      />
    );
  }

  // -------------------------------------------------------------
  // VIEW 1: Creation Screen (Before Room is created)
  // -------------------------------------------------------------
  if (!roomId || !roomData) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Top Header with Teacher Account */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Volver al Menú</span>
          </button>

          <button
            onClick={async () => {
              try {
                await signOut(auth);
              } catch {
                // Ignore
              }
              try {
                window.close();
              } catch {
                // Ignore
              }
              onBackToMenu();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-700/50 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
            title="Cerrar sesión y salir"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Room Configuration Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Crear Sala de Clase en Vivo
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Configura la partida interactiva. Tus alumnos se conectarán escaneando un código QR o ingresando el código PIN.
            </p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Modo de Juego
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSelectedMode('beginner');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedMode === 'beginner'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">Principiante</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Muestra el paso a paso visual y la reducción en cada etapa.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSelectedMode('advanced');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedMode === 'advanced'
                    ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white">Avanzado</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Cálculo mental puro a gran velocidad sin pistas.
                </p>
              </button>
            </div>
          </div>

          {/* Game Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sequence Length */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Números por Ronda
              </span>
              <div className="flex items-center justify-between">
                <select
                  value={selectedLength}
                  onChange={(e) => setSelectedLength(Number(e.target.value))}
                  className="bg-transparent text-white font-mono font-bold text-sm outline-none cursor-pointer w-full"
                >
                  {[3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((len) => (
                    <option key={len} value={len} className="bg-slate-900 text-white">
                      {len} números
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time interval between numbers */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Tiempo entre números
              </span>
              <div className="flex items-center justify-between">
                <select
                  value={stepInterval}
                  onChange={(e) => setStepInterval(Number(e.target.value))}
                  className="bg-transparent text-white font-mono font-bold text-sm outline-none cursor-pointer w-full"
                >
                  {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((sec) => (
                    <option key={sec} value={sec} className="bg-slate-900 text-white">
                      {sec.toFixed(1)} segundos
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Total Rounds */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Rondas Totales
              </span>
              <div className="flex items-center justify-between">
                <select
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(Number(e.target.value))}
                  className="bg-transparent text-white font-mono font-bold text-sm outline-none cursor-pointer w-full"
                >
                  {[1, 2, 3, 5, 7, 10].map((r) => (
                    <option key={r} value={r} className="bg-slate-900 text-white">
                      {r} {r === 1 ? 'ronda' : 'rondas'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error Message if Creation Fails */}
          {createError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-semibold text-center">
              {createError}
            </div>
          )}

          {/* Create Room CTA */}
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCreating ? 'Generando Sala...' : 'Crear Sala y Mostrar Código QR'}</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Lobby (Waiting for Students with QR & PIN)
  // -------------------------------------------------------------
  if (roomData.status === 'waiting') {
    const inviteUrl = getInviteUrl(roomData.code);

    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-3 sm:py-5 space-y-5">
        {/* Top Bar with Exit */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir de la Sala</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Sala en Vivo
            </span>
          </div>
        </div>

        {/* Main Lobby Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left / Center Column: QR Code and PIN Prominence */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-indigo-400 font-semibold uppercase tracking-widest">
                Escanea para unirte gratis
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Acceso Rápido para Alumnos
              </h2>
            </div>

            {/* High Quality Visual QR Code */}
            <div className="relative group p-4 bg-white rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.3)] border-4 border-indigo-500/30 transition-transform hover:scale-105">
              <QRCodeSVG
                value={inviteUrl}
                size={220}
                level="H"
                includeMargin={false}
                fgColor="#05070A"
              />
            </div>

            {/* PIN Code Box */}
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  Código PIN de la Sala:
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 border-2 border-indigo-500/40 rounded-2xl">
                <span className="font-mono font-black text-3xl sm:text-4xl tracking-[0.25em] text-indigo-400 pl-3">
                  {roomData.code}
                </span>
                <button
                  onClick={() => handleCopy(roomData.code, 'pin')}
                  className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-xl text-indigo-300 hover:text-white transition-all text-xs flex items-center gap-1 font-semibold"
                  title="Copiar PIN"
                >
                  {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPin ? 'Copiado' : 'Copiar PIN'}</span>
                </button>
              </div>

              {/* Direct Invite Link */}
              <button
                onClick={() => handleCopy(inviteUrl, 'link')}
                className="w-full flex items-center justify-center gap-2 p-2 bg-slate-950/70 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-all font-mono"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[280px]">{inviteUrl}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Connected Students List & Game Start Control */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Connected Students Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-sm flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Alumnos Conectados</h3>
                </div>
                <span className="font-mono font-black text-sm text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                  {players.length} {players.length === 1 ? 'alumno' : 'alumnos'}
                </span>
              </div>

              {/* Students Grid / Scroll Area */}
              <div className="flex-1 min-h-[160px] max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {players.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
                    <Users className="w-8 h-8 opacity-30 animate-pulse" />
                    <p className="text-xs">
                      Esperando que los alumnos escaneen el código QR o ingresen el PIN...
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {players.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 p-2 bg-slate-950/80 border border-slate-800/80 rounded-xl animate-fadeIn"
                      >
                        <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <span className="font-semibold text-xs text-slate-200 truncate">
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room Summary Info */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-[10px] text-slate-400">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                  <span className="block text-slate-500 uppercase font-bold">Modo</span>
                  <span className="font-semibold text-white capitalize">{roomData.settings.mode}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                  <span className="block text-slate-500 uppercase font-bold">Longitud</span>
                  <span className="font-semibold text-white">{roomData.settings.sequenceLength} núms</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                  <span className="block text-slate-500 uppercase font-bold">Ritmo</span>
                  <span className="font-semibold text-white">{roomData.settings.stepIntervalSeconds}s</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartMatch}
              disabled={players.length === 0}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>
                {players.length === 0
                  ? 'Esperando al menos 1 alumno...'
                  : `Comenzar Partida con ${players.length} ${players.length === 1 ? 'alumno' : 'alumnos'}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: In-Game Synchronized Countdown (3, 2, 1)
  // -------------------------------------------------------------
  if (roomData.status === 'countdown') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-6">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-1 rounded-full border border-indigo-500/20">
          Ronda {roomData.currentRound} de {roomData.settings.totalRounds}
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          ¡Atentos a la pantalla!
        </h2>
        <div className="w-36 h-36 rounded-full bg-indigo-600/20 border-4 border-indigo-500 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)] animate-pulse">
          <span className="font-mono font-black text-7xl text-white">
            {countdownNum}
          </span>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm">
          Aparecerán {roomData.settings.sequenceLength} números consecutivos. ¡Reduce en cada paso!
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 4: In-Game Number Stream Broadcast
  // -------------------------------------------------------------
  if (roomData.status === 'showing_sequence') {
    const currentNum = roomData.sequence[activeNumberIndex] ?? 0;
    const progressPercent = ((activeNumberIndex + 1) / roomData.sequence.length) * 100;
    const currentStep = roomData.steps[activeNumberIndex];

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Header Indicators */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-300 font-mono font-bold text-xs">
              Ronda {roomData.currentRound} / {roomData.settings.totalRounds}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Número {activeNumberIndex + 1} de {roomData.sequence.length}
            </span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{roomData.settings.stepIntervalSeconds}s / núm</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Big Broadcast Number Presentation Card */}
        <div className="bg-slate-900/70 border-2 border-indigo-500/40 rounded-3xl p-8 sm:p-12 text-center shadow-2xl backdrop-blur-sm space-y-4">
          <span className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-widest">
            {activeNumberIndex === 0 ? 'Primer Número' : `Suma y Reduce (+${currentNum})`}
          </span>

          <div
            key={activeNumberIndex}
            className="font-mono font-black text-7xl sm:text-9xl text-white tracking-tight drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-pulse"
          >
            {currentNum}
          </div>

          {/* Beginner Mode Live Breakdown on Teacher Display */}
          {roomData.settings.mode === 'beginner' && currentStep && (
            <div className="pt-4 border-t border-slate-800/80 max-w-md mx-auto space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
                <Eye className="w-3.5 h-3.5" />
                <span>Desglose de Etapa {activeNumberIndex + 1}:</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                {activeNumberIndex === 0 ? (
                  <span>Inicia con: <strong className="text-emerald-400">{currentNum}</strong></span>
                ) : (
                  <span>
                    {currentStep.prevAccumulator} + {currentStep.number} = {currentStep.sum}{' '}
                    {currentStep.isIntermediateMultiDigit ? (
                      <>➔ {currentStep.intermediateDigits?.join(' + ')} = <strong className="text-emerald-400">{currentStep.reductionResult}</strong></>
                    ) : (
                      <>➔ <strong className="text-emerald-400">{currentStep.reductionResult}</strong></>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 5: Answering Phase (Students Submitting Answers)
  // -------------------------------------------------------------
  if (roomData.status === 'answering') {
    const answeredCount = players.filter((p) => p.lastAnswer !== null).length;
    const totalCount = players.length;

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 text-center space-y-6">
        <div className="space-y-1">
          <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-widest animate-pulse">
            ¡Tiempo de Respuesta!
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Los alumnos están respondiendo
          </h2>
        </div>

        {/* Countdown Ring */}
        <div className="w-28 h-28 mx-auto rounded-full bg-rose-500/10 border-4 border-rose-500 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.4)]">
          <span className="font-mono font-black text-4xl text-white">
            {answeringSecondsLeft}s
          </span>
        </div>

        {/* Response Count Progress */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Progreso de Respuestas</span>
            <span className="font-mono text-indigo-400">
              {answeredCount} / {totalCount} Alumnos
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{
                width: totalCount > 0 ? `${(answeredCount / totalCount) * 100}%` : '0%',
              }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (roomId) updateRoomStatus(roomId, 'round_result');
          }}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
        >
          Cerrar Tiempo y Ver Resultados Ahora
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 6: Round Results & Leaderboard
  // -------------------------------------------------------------
  if (roomData.status === 'round_result') {
    const isFinalRound = roomData.currentRound >= roomData.settings.totalRounds;

    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-wider">
              Resultados de la Ronda {roomData.currentRound} de {roomData.settings.totalRounds}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Respuesta Correcta: <strong className="text-emerald-400 font-mono text-2xl sm:text-3xl">{roomData.correctAnswer}</strong>
            </h2>
          </div>

          <button
            onClick={handleNextRound}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>{isFinalRound ? 'Ver Podio Final' : 'Siguiente Ronda'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Sequence and Reduction Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm space-y-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Secuencia evaluada:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {roomData.sequence.map((num, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-200"
              >
                {num}
              </span>
            ))}
            <span className="text-xs font-mono font-bold text-slate-400">➔ Reducción Final:</span>
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-sm font-mono font-black text-emerald-400">
              {roomData.correctAnswer}
            </span>
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Tabla de Posiciones en Vivo</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {players.length} Alumnos
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  idx === 0
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : idx === 1
                    ? 'bg-slate-800/60 border-slate-700'
                    : idx === 2
                    ? 'bg-amber-900/20 border-amber-700/30'
                    : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>
                        Respuesta:{' '}
                        <strong
                          className={
                            p.isCorrect
                              ? 'text-emerald-400'
                              : p.lastAnswer !== null
                              ? 'text-rose-400'
                              : 'text-slate-500'
                          }
                        >
                          {p.lastAnswer !== null ? p.lastAnswer : 'Sin responder'}
                        </strong>
                      </span>
                      {p.streak > 1 && (
                        <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                          <Flame className="w-3 h-3" /> {p.streak} racha
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-sm text-indigo-300 block">
                    {p.score.toLocaleString()} pts
                  </span>
                  {p.pointsAwarded > 0 && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      +{p.pointsAwarded} pts
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 7: Game Over / Final Podium
  // -------------------------------------------------------------
  if (roomData.status === 'game_over') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
    const p1 = sortedPlayers[0];
    const p2 = sortedPlayers[1];
    const p3 = sortedPlayers[2];

    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-6 text-center">
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5 shadow-sm">
            <Trophy className="w-3.5 h-3.5" />
            <span>¡Partida Finalizada!</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Podio de Ganadores
          </h2>
          <p className="text-xs text-slate-400">
            ¡Felicitaciones a todos los participantes por su rapidez y agilidad de cálculo!
          </p>
        </div>

        {/* Podium Layout - Column 1: 2nd, Column 2: 1st, Column 3: 3rd */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6 pb-2 max-w-xl mx-auto">
          {/* 2nd Place (Left) */}
          <div className="flex flex-col items-center">
            {p2 ? (
              <div className="w-full flex flex-col items-center space-y-2 animate-fadeIn">
                <span className="font-bold text-xs text-slate-300 truncate max-w-[90px] sm:max-w-[120px]">
                  {p2.name}
                </span>
                <div className="w-full h-24 sm:h-28 bg-slate-800/90 border-t-4 border-slate-300 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-lg">
                  <span className="text-xl font-black text-slate-300">2º</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-indigo-300">
                    {p2.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-1" />
            )}
          </div>

          {/* 1st Place (Center) */}
          <div className="flex flex-col items-center">
            {p1 ? (
              <div className="w-full flex flex-col items-center space-y-2 animate-fadeIn">
                <Crown className="w-7 h-7 text-amber-400 animate-bounce" />
                <span className="font-black text-sm sm:text-base text-white truncate max-w-[100px] sm:max-w-[140px]">
                  {p1.name}
                </span>
                <div className="w-full h-32 sm:h-36 bg-amber-500/20 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-xl shadow-amber-500/10">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">1º</span>
                  <span className="font-mono text-sm sm:text-base font-black text-white">
                    {p1.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-1" />
            )}
          </div>

          {/* 3rd Place (Right) */}
          <div className="flex flex-col items-center">
            {p3 ? (
              <div className="w-full flex flex-col items-center space-y-2 animate-fadeIn">
                <span className="font-bold text-xs text-slate-300 truncate max-w-[90px] sm:max-w-[120px]">
                  {p3.name}
                </span>
                <div className="w-full h-20 sm:h-24 bg-amber-900/30 border-t-4 border-amber-600 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-lg">
                  <span className="text-lg font-black text-amber-600">3º</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-indigo-300">
                    {p3.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-1" />
            )}
          </div>
        </div>

        {/* Full Classroom Final Leaderboard */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-sm space-y-3 text-left max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Clasificación Final de la Sala</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {sortedPlayers.length} {sortedPlayers.length === 1 ? 'Alumno' : 'Alumnos'}
            </span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  idx === 0
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : idx === 1
                    ? 'bg-slate-800/60 border-slate-700'
                    : idx === 2
                    ? 'bg-amber-900/20 border-amber-700/30'
                    : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}º
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      {p.name}
                    </span>
                    {p.streak > 1 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-amber-400 font-semibold">
                        <Flame className="w-3 h-3" /> Mejor racha: {p.streak}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-sm text-indigo-300">
                    {p.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => {
              soundManager.playClick();
              setRoomId(null);
              setRoomData(null);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Crear Otra Sala</span>
          </button>

          <button
            onClick={onBackToMenu}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-2xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Volver al Menú Principal</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
