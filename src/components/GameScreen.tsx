import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, SequenceLength, ReductionStep, GameResult } from '../types';
import { generateSequence, calculateReductionSteps, getDelayMsForMode } from '../utils/math';
import { soundManager } from '../utils/audio';
import { ArrowLeft, Clock, Eye, Sparkles, Delete, ShieldCheck, Zap } from 'lucide-react';

interface GameScreenProps {
  mode: GameMode;
  sequenceLength: SequenceLength;
  intervalSeconds: number;
  onFinishGame: (result: GameResult) => void;
  onAbort: () => void;
}

type Phase = 'countdown' | 'displaying' | 'answering';

export const GameScreen: React.FC<GameScreenProps> = ({
  mode,
  sequenceLength,
  intervalSeconds,
  onFinishGame,
  onAbort,
}) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>('countdown');
  const [startCountdown, setStartCountdown] = useState<number>(3);

  // Sequence data
  const sequenceRef = useRef<number[]>([]);
  const stepsRef = useRef<ReductionStep[]>([]);
  const totalSumRef = useRef<number>(0);
  const finalReducedRef = useRef<number>(0);

  // Active number index
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);

  // Beginner mode live accumulated reduction & current step data
  const [currentStepData, setCurrentStepData] = useState<ReductionStep | null>(null);
  const [accumulatedSteps, setAccumulatedSteps] = useState<ReductionStep[]>([]);

  // Answering state
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [answerTimeRemaining, setAnswerTimeRemaining] = useState<number>(5.0); // 5 seconds for Advanced
  const answerStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Initialize game sequence on mount
  useEffect(() => {
    const seq = generateSequence(sequenceLength);
    const { steps, totalSum, finalReduced } = calculateReductionSteps(seq);

    sequenceRef.current = seq;
    stepsRef.current = steps;
    totalSumRef.current = totalSum;
    finalReducedRef.current = finalReduced;
  }, [sequenceLength]);

  // Phase 1: 3-2-1 Countdown before start
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (startCountdown > 0) {
      soundManager.playClick();
      const timer = setTimeout(() => {
        setStartCountdown((prev) => prev - 1);
      }, 900);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished -> Start showing sequence
      setPhase('displaying');
      setCurrentIndex(0);
    }
  }, [phase, startCountdown]);

  // Phase 2: Sequence presentation with random 2-3s delay
  useEffect(() => {
    if (phase !== 'displaying') return;

    const seq = sequenceRef.current;
    if (!seq || seq.length === 0) return;

    if (currentIndex < seq.length) {
      const num = seq[currentIndex];
      setCurrentNumber(num);
      soundManager.playNumberAppear(num);

      // In beginner mode, update live reduction helper & step history
      if (mode === 'beginner') {
        const step = stepsRef.current[currentIndex];
        if (step) {
          setCurrentStepData(step);
          setAccumulatedSteps((prev) => [...prev.slice(0, currentIndex), step]);
        }
      }

      // Schedule next number with user-selected interval (0.5s to 5.0s)
      const delay = Math.max(500, Math.round((intervalSeconds || 1.5) * 1000));
      delayTimeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, delay);

      return () => {
        if (delayTimeoutRef.current) {
          clearTimeout(delayTimeoutRef.current);
        }
      };
    } else {
      // Sequence completed -> Move to answering phase
      setPhase('answering');
      answerStartTimeRef.current = Date.now();
    }
  }, [phase, currentIndex, mode, intervalSeconds]);

  // Handle submit action
  const handleSubmit = useCallback(
    (forcedAnswer?: number | null, isTimeout: boolean = false) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      const answerToEvaluate =
        forcedAnswer !== undefined
          ? forcedAnswer
          : userAnswer.trim() === ''
          ? null
          : parseInt(userAnswer, 10);

      const timeToAnswer = Date.now() - answerStartTimeRef.current;
      const isCorrect =
        answerToEvaluate !== null &&
        answerToEvaluate === finalReducedRef.current;

      const result: GameResult = {
        mode,
        sequenceLength,
        stepIntervalSeconds: intervalSeconds,
        sequence: sequenceRef.current,
        steps: stepsRef.current,
        correctAnswer: finalReducedRef.current,
        totalSum: totalSumRef.current,
        userAnswer: answerToEvaluate,
        isCorrect,
        timeToAnswerMs: timeToAnswer,
        timedOut: isTimeout,
        date: new Date().toISOString(),
      };

      onFinishGame(result);
    },
    [mode, sequenceLength, intervalSeconds, userAnswer, onFinishGame]
  );

  // Phase 3: Answering timer (Only active for Advanced mode)
  useEffect(() => {
    if (phase !== 'answering') return;

    if (mode === 'advanced') {
      const TOTAL_TIME = 5.0;
      const UPDATE_INTERVAL = 50; // 50ms smooth update
      let remaining = TOTAL_TIME;
      let lastTickSecond = 5;

      timerIntervalRef.current = setInterval(() => {
        remaining -= UPDATE_INTERVAL / 1000;

        // Sound tick at 4, 3, 2, 1 seconds
        const currentWholeSec = Math.ceil(remaining);
        if (currentWholeSec < lastTickSecond && currentWholeSec >= 1) {
          soundManager.playCountdownTick(currentWholeSec);
          lastTickSecond = currentWholeSec;
        }

        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setAnswerTimeRemaining(0);
          handleSubmit(null, true);
        } else {
          setAnswerTimeRemaining(parseFloat(remaining.toFixed(2)));
        }
      }, UPDATE_INTERVAL);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [phase, mode, handleSubmit]);

  // Keyboard input listener (1-9, Enter, Backspace)
  useEffect(() => {
    if (phase !== 'answering') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        soundManager.playClick();
        setUserAnswer(e.key);
        // In advanced mode, pressing a digit immediately submits
        if (mode === 'advanced') {
          handleSubmit(parseInt(e.key, 10), false);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        soundManager.playClick();
        setUserAnswer('');
      } else if (e.key === 'Enter') {
        if (userAnswer) {
          soundManager.playClick();
          handleSubmit(parseInt(userAnswer, 10), false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, mode, userAnswer, handleSubmit]);

  const handleNumpadClick = (digit: number) => {
    soundManager.playClick();
    setUserAnswer(String(digit));
    if (mode === 'advanced') {
      handleSubmit(digit, false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-between max-w-4xl mx-auto px-4 py-4 sm:py-6">
      {/* Top Bar Status Zone */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onAbort();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Abandonar</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                mode === 'beginner'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              }`}
            >
              {mode === 'beginner' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" /> Modo Principiante
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" /> Modo Avanzado
                </>
              )}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({sequenceLength} núms &bull; {intervalSeconds.toFixed(1)}s)
            </span>
          </div>
        </div>

        {/* Top Right Quick Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{intervalSeconds.toFixed(1)}s/núm</span>
          </div>
          {mode === 'beginner' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium">
              <Eye className="w-3.5 h-3.5" />
              <span>Práctica en vivo</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        {/* Phase 1: Countdown 3, 2, 1 */}
        {phase === 'countdown' && (
          <div className="text-center space-y-4 animate-scale-up">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Prepárate
            </span>
            <div className="w-32 h-32 rounded-3xl bg-slate-900/80 border border-indigo-500/40 flex items-center justify-center font-mono font-black text-6xl text-white shadow-2xl shadow-indigo-600/20 backdrop-blur-sm">
              {startCountdown > 0 ? startCountdown : '¡YA!'}
            </div>
            <p className="text-xs text-slate-400">
              {mode === 'beginner'
                ? 'Observa cada número y el recuadro de práctica de cada etapa'
                : 'Suma y reduce mentalmente cada dígito'}
            </p>
          </div>
        )}

        {/* Phase 2: Flashing Numbers Presentation */}
        {phase === 'displaying' && (
          <div className="w-full max-w-xl text-center space-y-5">
            {/* Progress indicator */}
            <div className="space-y-1.5 max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                <span>Etapa</span>
                <span className="text-white font-bold">
                  {Math.min(currentIndex + 1, sequenceLength)} / {sequenceLength}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / sequenceLength) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Central Number Display Box */}
            <div className="relative py-2">
              <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl pointer-events-none" />
                <span
                  key={currentIndex}
                  className="font-mono font-black text-6xl sm:text-7xl text-white tracking-tight animate-pop-in drop-shadow-lg"
                >
                  {currentNumber}
                </span>
              </div>
            </div>

            {/* RECUADRO DE PRÁCTICA POR ETAPA (MODO PRINCIPIANTE) */}
            {mode === 'beginner' && currentStepData && (
              <div className="w-full bg-slate-900/70 border border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-sm space-y-3 animate-fade-in">
                {/* Header of the Practice Box */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                      Recuadro de Práctica &bull; Etapa #{currentIndex + 1}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Número entrante: <strong className="text-white">+{currentStepData.number}</strong>
                  </span>
                </div>

                {/* Calculation and Step Result */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="text-left space-y-1">
                    <div className="text-[11px] text-slate-400 font-medium">
                      Operación de esta etapa:
                    </div>
                    <div className="text-sm sm:text-base font-mono text-slate-200">
                      {currentStepData.index === 0 ? (
                        <span>
                          Primer dígito: <strong className="text-white">{currentStepData.number}</strong>
                        </span>
                      ) : (
                        <span>
                          {currentStepData.prevAccumulator} + {currentStepData.number} ={' '}
                          <strong className="text-indigo-300">{currentStepData.sum}</strong>
                          {currentStepData.isIntermediateMultiDigit && (
                            <span className="text-slate-400 text-xs ml-1.5">
                              (➔ {String(currentStepData.sum).split('').join(' + ')})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Highlighted stage reduction answer */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                      Respuesta Etapa:
                    </span>
                    <span className="font-mono font-black text-2xl text-emerald-400">
                      {currentStepData.reductionResult}
                    </span>
                  </div>
                </div>

                {/* Step History Breadcrumbs */}
                {accumulatedSteps.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] font-mono text-slate-400">
                    <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">
                      Historial:
                    </span>
                    {accumulatedSteps.map((s, idx) => (
                      <React.Fragment key={idx}>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${
                            idx === currentIndex
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          E{idx + 1}: {s.reductionResult}
                        </span>
                        {idx < accumulatedSteps.length - 1 && (
                          <span className="text-slate-600 shrink-0">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'advanced' && (
              <div className="text-xs text-slate-500 font-medium">
                Mantén el cálculo y reducción en tu mente &bull; ¡Sin ayudas!
              </div>
            )}
          </div>
        )}

        {/* Phase 3: Answering Screen */}
        {phase === 'answering' && (
          <div className="w-full max-w-md text-center space-y-5 animate-fade-in">
            {/* Advanced mode 5-second countdown timer */}
            {mode === 'advanced' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Clock className="w-4 h-4 animate-spin-slow" />
                    Tiempo para responder
                  </span>
                  <span className="font-mono font-bold text-base text-amber-300">
                    {answerTimeRemaining.toFixed(1)}s
                  </span>
                </div>

                {/* Smooth Timer Bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-75 ${
                      answerTimeRemaining < 2 ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${Math.max(0, (answerTimeRemaining / 5.0) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Beginner Practice confirmation summary */}
            {mode === 'beginner' && (
              <div className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-slate-300 backdrop-blur-sm space-y-1">
                <div className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Práctica completa ({sequenceLength} etapas finalizadas)
                </div>
                <p className="text-[11px] text-slate-400">
                  Ingresa o confirma la reducción final obtenida en la última etapa.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                ¿Cuál es la reducción final?
              </h2>
              <p className="text-xs text-slate-400">
                Ingresa el único dígito resultante (1 al 9)
              </p>
            </div>

            {/* Answer Display */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-slate-900/80 border-2 border-indigo-500/60 flex items-center justify-center font-mono font-black text-4xl sm:text-5xl text-white shadow-xl shadow-indigo-600/10">
              {userAnswer || <span className="text-slate-600 animate-pulse">?</span>}
            </div>

            {/* On-screen 1-9 Numpad for fast touch & mouse clicks */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleNumpadClick(digit)}
                    className="h-12 sm:h-13 rounded-2xl bg-slate-900/70 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-500 text-slate-100 font-mono font-bold text-xl sm:text-2xl transition-all active:scale-95 shadow-md"
                  >
                    {digit}
                  </button>
                ))}
              </div>

              {/* Auxiliary actions for Beginner Mode */}
              {mode === 'beginner' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setUserAnswer('');
                    }}
                    disabled={!userAnswer}
                    className="h-11 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Delete className="w-4 h-4" />
                    Borrar
                  </button>

                  <button
                    onClick={() => handleSubmit(undefined, false)}
                    disabled={!userAnswer}
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    Confirmar
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              {mode === 'advanced'
                ? 'Pulsa el número en el teclado o pantalla para responder al instante.'
                : 'Pulsa el número o usa las teclas 1-9 de tu teclado.'}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-slate-500 text-[11px] border-t border-slate-800/60 pt-2.5">
        Secuencia de {sequenceLength} números &bull; Dígitos aleatorios del 1 al 9
      </div>
    </div>
  );
};
