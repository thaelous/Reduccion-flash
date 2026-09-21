import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  LogOut,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldCheck,
  Flame,
  Trophy,
  Sparkles,
  ArrowRight,
  Eye,
  Crown,
} from 'lucide-react';
import {
  RoomData,
  RoomPlayer,
  getRoomByPin,
  joinRoom,
  subscribeToRoom,
  subscribeToPlayers,
  submitPlayerAnswer,
} from '../utils/firebase';
import { soundManager } from '../utils/audio';

interface StudentRoomScreenProps {
  initialPin?: string;
  onBackToMenu: () => void;
}

export const StudentRoomScreen: React.FC<StudentRoomScreenProps> = ({
  initialPin = '',
  onBackToMenu,
}) => {
  const [pinInput, setPinInput] = useState<string>(initialPin.toUpperCase());
  const [nameInput, setNameInput] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Player session state
  const [joinedPin, setJoinedPin] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);

  // Local synced gameplay states
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [activeNumberIndex, setActiveNumberIndex] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerTimeMs, setAnswerTimeMs] = useState<number>(0);

  const answerStartTimeRef = useRef<number>(0);

  // Generate or retrieve persistent local player ID
  useEffect(() => {
    let localId = localStorage.getItem('reduccion_student_id');
    if (!localId) {
      localId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('reduccion_student_id', localId);
    }
    setPlayerId(localId);

    const savedName = localStorage.getItem('reduccion_student_name');
    if (savedName) {
      setNameInput(savedName);
    }
  }, []);

  // Update pin input if initialPin changes from URL
  useEffect(() => {
    if (initialPin) {
      setPinInput(initialPin.toUpperCase());
    }
  }, [initialPin]);

  // Handle joining room
  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim().toUpperCase();
    const cleanName = nameInput.trim();

    if (!cleanPin) {
      setJoinError('Por favor ingresa el código PIN de la sala.');
      return;
    }
    if (!cleanName) {
      setJoinError('Por favor ingresa tu nombre.');
      return;
    }

    try {
      setIsJoining(true);
      setJoinError(null);
      soundManager.playClick();

      const room = await getRoomByPin(cleanPin);
      if (!room) {
        setJoinError('No se encontró ninguna sala activa con ese PIN. Verifica el código con tu profesor.');
        setIsJoining(false);
        return;
      }

      localStorage.setItem('reduccion_student_name', cleanName);
      const success = await joinRoom(cleanPin, playerId, cleanName);

      if (success) {
        setJoinedPin(cleanPin);
      } else {
        setJoinError('No se pudo conectar a la sala.');
      }
    } catch (err) {
      console.error('Join error:', err);
      setJoinError('Error al conectar. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setIsJoining(false);
    }
  };

  // Subscribe to Room & Players once joined
  useEffect(() => {
    if (!joinedPin) return;

    const unsubRoom = subscribeToRoom(joinedPin, (data) => {
      setRoomData(data);
    });

    const unsubPlayers = subscribeToPlayers(joinedPin, (data) => {
      setPlayers(data);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [joinedPin]);

  // Game lifecycle synchronized with host
  useEffect(() => {
    if (!roomData) return;

    if (roomData.status === 'countdown') {
      setHasAnswered(false);
      setSelectedAnswer(null);
      setCountdownNum(3);
      soundManager.playTick();

      const countTimer = setInterval(() => {
        setCountdownNum((prev) => {
          if (prev <= 1) {
            clearInterval(countTimer);
            return 0;
          }
          soundManager.playTick();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countTimer);
    }

    if (roomData.status === 'showing_sequence') {
      setHasAnswered(false);
      setSelectedAnswer(null);
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
        }
      }, intervalMs);

      return () => clearInterval(stepTimer);
    }

    if (roomData.status === 'answering') {
      answerStartTimeRef.current = Date.now();
      soundManager.playCountdownEnd();
    }

    if (roomData.status === 'round_result') {
      const myData = players.find((p) => p.id === playerId);
      if (myData?.isCorrect) {
        soundManager.playWin();
      } else if (myData?.lastAnswer !== null) {
        soundManager.playLose();
      }
    }

    if (roomData.status === 'game_over') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [roomData?.status, roomData?.currentRound, players, playerId]);

  // Submit Answer handler
  const handleSelectDigit = async (digit: number) => {
    if (hasAnswered || !roomData || !joinedPin || roomData.status !== 'answering') return;

    const timeSpent = Date.now() - answerStartTimeRef.current;
    setSelectedAnswer(digit);
    setHasAnswered(true);
    setAnswerTimeMs(timeSpent);
    soundManager.playClick();

    await submitPlayerAnswer(
      joinedPin,
      playerId,
      digit,
      timeSpent,
      roomData.correctAnswer
    );
  };

  const currentPlayer = players.find((p) => p.id === playerId);
  const myRank = players.findIndex((p) => p.id === playerId) + 1;

  // -------------------------------------------------------------
  // VIEW 1: Join Room Form (Clean, Zero Registrations, Direct PIN)
  // -------------------------------------------------------------
  if (!joinedPin || !roomData) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Acceso Alumno</span>
          </div>
        </div>

        {/* Join Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-7 backdrop-blur-sm shadow-2xl space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-white">Unirse a la Partida</h2>
            <p className="text-xs text-slate-400">
              Ingresa el código PIN proyectado por tu profesor y tu nombre para entrar en vivo.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {/* PIN Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Código PIN de la Sala
              </label>
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="Ej: A1B2 o 7429"
                maxLength={8}
                className="w-full text-center px-4 py-3 bg-slate-950 border-2 border-indigo-500/40 focus:border-indigo-500 rounded-2xl text-2xl font-mono font-black tracking-widest text-indigo-300 outline-none transition-all placeholder:text-slate-700 uppercase"
                autoFocus={!pinInput}
              />
            </div>

            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tu Nombre o Apodo
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ej: Lucas, Sofía M..."
                maxLength={20}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white text-sm font-semibold outline-none transition-all placeholder:text-slate-600"
                autoFocus={Boolean(pinInput)}
              />
            </div>

            {joinError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium text-center">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{isJoining ? 'Conectando...' : '¡Entrar a la Sala!'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Waiting in Lobby
  // -------------------------------------------------------------
  if (roomData.status === 'waiting') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">¡Estás Dentro!</h2>
          <p className="text-xs text-slate-400">
            Conectado como <strong className="text-white">{nameInput}</strong>
          </p>
        </div>

        {/* Room Info */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-400">Profesor / Anfitrión:</span>
            <span className="font-bold text-white">{roomData.hostName}</span>
          </div>
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-400">Código PIN:</span>
            <span className="font-mono font-bold text-indigo-400">{roomData.code}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Modo:</span>
            <span className="font-bold text-emerald-400 capitalize">{roomData.settings.mode}</span>
          </div>
        </div>

        {/* Animated waiting prompt */}
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-xs text-slate-400 flex items-center justify-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span>Esperando que el profesor inicie la ronda...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: Countdown (3, 2, 1)
  // -------------------------------------------------------------
  if (roomData.status === 'countdown') {
    return (
      <div className="w-full max-w-sm mx-auto px-4 py-16 text-center space-y-6">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
          Ronda {roomData.currentRound} de {roomData.settings.totalRounds}
        </span>
        <h2 className="text-xl font-bold text-white">¡Prepárate!</h2>
        <div className="w-32 h-32 mx-auto rounded-full bg-indigo-600/20 border-4 border-indigo-500 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-pulse">
          <span className="font-mono font-black text-6xl text-white">
            {countdownNum}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 4: Showing Sequence
  // -------------------------------------------------------------
  if (roomData.status === 'showing_sequence') {
    const currentNum = roomData.sequence[activeNumberIndex] ?? 0;
    const currentStep = roomData.steps[activeNumberIndex];

    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 space-y-5 text-center">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Ronda {roomData.currentRound} / {roomData.settings.totalRounds}</span>
          <span>Número {activeNumberIndex + 1} de {roomData.sequence.length}</span>
        </div>

        {/* Big Number Card */}
        <div className="bg-slate-900/70 border-2 border-indigo-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm space-y-3">
          <span className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-widest block">
            {activeNumberIndex === 0 ? 'Número Inicial' : `Suma y Reduce (+${currentNum})`}
          </span>

          <div
            key={activeNumberIndex}
            className="font-mono font-black text-7xl sm:text-8xl text-white tracking-tight drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-pulse"
          >
            {currentNum}
          </div>

          {/* Beginner Mode Live Helper for Students */}
          {roomData.settings.mode === 'beginner' && currentStep && (
            <div className="pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-300">
              {activeNumberIndex === 0 ? (
                <span>Comienza en: <strong className="text-emerald-400">{currentNum}</strong></span>
              ) : (
                <span>
                  {currentStep.prevAccumulator} + {currentStep.number} = {currentStep.sum}{' '}
                  ➔ <strong className="text-emerald-400">{currentStep.reductionResult}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 5: Answering Phase (Rapid Single-Digit Keypad)
  // -------------------------------------------------------------
  if (roomData.status === 'answering') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4 text-center">
        <div className="space-y-1">
          <span className="text-xs font-mono text-rose-400 font-bold uppercase tracking-widest animate-pulse">
            ¡Ingresa la Reducción Final!
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {hasAnswered ? '¡Respuesta Enviada!' : '¿Cuál es el resultado reducido (1 dígito)?'}
          </h2>
        </div>

        {/* Selected Answer Feedback */}
        {hasAnswered ? (
          <div className="p-6 bg-slate-900/80 border border-emerald-500/40 rounded-3xl space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-3xl">
              {selectedAnswer}
            </div>
            <p className="text-xs text-slate-300">
              Respuesta registrada en {(answerTimeMs / 1000).toFixed(2)}s. Esperando que termine el tiempo...
            </p>
          </div>
        ) : (
          /* Responsive 0-9 Keypad */
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-4 sm:p-5 backdrop-blur-sm space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleSelectDigit(digit)}
                  className="h-16 rounded-2xl bg-slate-950 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500 text-white font-mono font-black text-2xl transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => handleSelectDigit(0)}
                className="w-1/3 h-16 rounded-2xl bg-slate-950 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500 text-white font-mono font-black text-2xl transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
              >
                0
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 6: Round Result for Student
  // -------------------------------------------------------------
  if (roomData.status === 'round_result') {
    const isCorrect = currentPlayer?.isCorrect;

    return (
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-5 text-center">
        {/* Outcome Card */}
        <div
          className={`p-6 rounded-3xl border backdrop-blur-sm space-y-3 shadow-2xl ${
            isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-rose-500/10 border-rose-500/40'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center">
            {isCorrect ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            ) : (
              <XCircle className="w-12 h-12 text-rose-400" />
            )}
          </div>

          <h2 className="text-2xl font-black text-white">
            {isCorrect ? '¡Correcto!' : '¡Incorrecto!'}
          </h2>

          <div className="text-xs text-slate-300">
            Respuesta correcta: <strong className="text-emerald-400 font-mono text-base">{roomData.correctAnswer}</strong>
            {currentPlayer?.lastAnswer !== null && (
              <span className="block text-slate-400 mt-0.5">
                Tu respuesta: <strong className="font-mono">{currentPlayer?.lastAnswer}</strong>
              </span>
            )}
          </div>

          {currentPlayer?.pointsAwarded ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full text-emerald-300 font-mono font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{currentPlayer.pointsAwarded} puntos</span>
            </div>
          ) : null}
        </div>

        {/* Student Stats & Position */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Tu Posición Actual:</span>
            <span className="font-bold text-indigo-400">
              #{myRank} de {players.length} alumnos
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Puntaje Total:</span>
            <span className="font-mono font-bold text-white">
              {currentPlayer?.score.toLocaleString()} pts
            </span>
          </div>
          {currentPlayer && currentPlayer.streak > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Racha activa:</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flame className="w-3.5 h-3.5" /> {currentPlayer.streak} aciertos
              </span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 animate-pulse">
          Esperando que el profesor inicie la siguiente ronda...
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 7: Game Over for Student
  // -------------------------------------------------------------
  if (roomData.status === 'game_over') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
    const p1 = sortedPlayers[0];
    const p2 = sortedPlayers[1];
    const p3 = sortedPlayers[2];

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 text-center">
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5 shadow-sm">
            <Trophy className="w-3.5 h-3.5" />
            <span>¡Fin de la Partida!</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Podio de Ganadores</h2>
          <p className="text-xs text-slate-400">Resultados finales de la sala</p>
        </div>

        {/* Podium Layout */}
        <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-1 max-w-sm mx-auto">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            {p2 ? (
              <div className="w-full flex flex-col items-center space-y-1.5 animate-fadeIn">
                <span className="font-bold text-[11px] text-slate-300 truncate max-w-[85px]">
                  {p2.name}
                </span>
                <div className="w-full h-20 bg-slate-800/90 border-t-4 border-slate-300 rounded-t-2xl flex flex-col items-center justify-center p-1 shadow-md">
                  <span className="text-lg font-black text-slate-300">2º</span>
                  <span className="font-mono text-[11px] font-bold text-indigo-300">
                    {p2.score.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-1" />
            )}
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            {p1 ? (
              <div className="w-full flex flex-col items-center space-y-1.5 animate-fadeIn">
                <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                <span className="font-black text-xs text-white truncate max-w-[95px]">
                  {p1.name}
                </span>
                <div className="w-full h-28 bg-amber-500/20 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-center p-1 shadow-lg shadow-amber-500/10">
                  <span className="text-2xl font-black text-amber-400">1º</span>
                  <span className="font-mono text-xs font-black text-white">
                    {p1.score.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-1" />
            )}
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            {p3 ? (
              <div className="w-full flex flex-col items-center space-y-1.5 animate-fadeIn">
                <span className="font-bold text-[11px] text-slate-300 truncate max-w-[85px]">
                  {p3.name}
                </span>
                <div className="w-full h-16 bg-amber-900/30 border-t-4 border-amber-600 rounded-t-2xl flex flex-col items-center justify-center p-1 shadow-md">
                  <span className="text-base font-black text-amber-600">3º</span>
                  <span className="font-mono text-[11px] font-bold text-indigo-300">
                    {p3.score.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-1" />
            )}
          </div>
        </div>

        {/* Current Student's Result Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="text-left">
              <span className="text-xs text-slate-400 block">Tu resultado:</span>
              <span className="font-bold text-base text-white">{nameInput}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center gap-1.5">
                <span className="text-xs text-indigo-300 font-bold uppercase">Puesto</span>
                <span className="text-base font-black text-white font-mono">#{myRank}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold pt-1">
            <span className="text-slate-400">Puntaje Final Acumulado:</span>
            <span className="font-mono font-bold text-base text-indigo-300">
              {currentPlayer?.score.toLocaleString()} pts
            </span>
          </div>

          {currentPlayer && currentPlayer.streak > 1 && (
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Mejor racha de aciertos:</span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flame className="w-3.5 h-3.5" /> {currentPlayer.streak}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onBackToMenu}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          Volver al Menú Principal
        </button>
      </div>
    );
  }

  return null;
};
