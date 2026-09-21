import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';
import { fireSuccessConfetti } from '../utils/confetti';
import { soundManager } from '../utils/audio';
import { RotateCcw, Home, Sparkles, ChevronDown, ChevronUp, AlertCircle, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';

interface ResultScreenProps {
  result: GameResult;
  onPlayAgain: () => void;
  onGoToMenu: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  onPlayAgain,
  onGoToMenu,
}) => {
  const [showDetailedSteps, setShowDetailedSteps] = useState<boolean>(true);

  useEffect(() => {
    if (result.isCorrect) {
      fireSuccessConfetti();
      soundManager.playSuccessFanfare();
    } else {
      soundManager.playErrorSound();
    }
  }, [result.isCorrect]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Result Card */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-sm transition-all ${
          result.isCorrect
            ? 'bg-slate-900/60 border-emerald-500/40 shadow-emerald-950/30'
            : 'bg-slate-900/60 border-rose-500/30 shadow-rose-950/20'
        }`}
      >
        {/* Glow accent */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            result.isCorrect ? 'bg-emerald-500/15' : 'bg-rose-500/10'
          }`}
        />

        {/* Emoji / Icon */}
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center justify-center">
            {result.isCorrect ? (
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/20 animate-bounce-short">
                🎉
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-4xl shadow-xl shadow-rose-500/10">
                (・_・;)
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.isCorrect
                ? '¡Respuesta Perfecta!'
                : result.timedOut
                ? '¡Se agotó el tiempo!'
                : 'Respuesta Incorrecta'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {result.isCorrect
                ? `Has completado exitosamente la secuencia de ${result.sequenceLength} números en Modo ${
                    result.mode === 'beginner' ? 'Principiante' : 'Avanzado'
                  }.`
                : `No te preocupes, el cálculo mental se perfecciona con la práctica continua.`}
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-5 py-2.5 text-center min-w-[110px]">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                Tu Respuesta
              </span>
              <span
                className={`font-mono font-black text-2xl ${
                  result.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.userAnswer !== null ? result.userAnswer : 'Ninguna'}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-5 py-2.5 text-center min-w-[110px]">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                Correcta
              </span>
              <span className="font-mono font-black text-2xl text-emerald-400">
                {result.correctAnswer}
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-5 py-2.5 text-center min-w-[110px]">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Tiempo
              </span>
              <span className="font-mono font-bold text-xl text-slate-200">
                {(result.timeToAnswerMs / 1000).toFixed(1)}s
              </span>
            </div>

            {result.stepIntervalSeconds && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-5 py-2.5 text-center min-w-[110px]">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" /> Ritmo
                </span>
                <span className="font-mono font-bold text-xl text-indigo-400">
                  {result.stepIntervalSeconds.toFixed(1)}s/núm
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sequence & Step-by-Step Breakdown */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Desglose Matemático
            </h2>
          </div>

          <button
            onClick={() => setShowDetailedSteps(!showDetailedSteps)}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            <span>{showDetailedSteps ? 'Ocultar pasos' : 'Ver paso a paso'}</span>
            {showDetailedSteps ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Full sequence representation */}
        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-[11px] text-slate-500 font-medium">Secuencia mostrada:</div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
            {result.sequence.map((n, idx) => (
              <React.Fragment key={idx}>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold">
                  {n}
                </span>
                {idx < result.sequence.length - 1 && (
                  <span className="text-slate-600">+</span>
                )}
              </React.Fragment>
            ))}
            <span className="text-slate-500 font-bold">=</span>
            <span className="text-indigo-400 font-bold">{result.totalSum}</span>
            <span className="text-slate-500">➔</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              {result.correctAnswer}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Suma total directa: {result.totalSum} ➔{' '}
            {String(result.totalSum).split('').join(' + ')} ={' '}
            {result.correctAnswer}
          </div>
        </div>

        {/* Detailed progressive steps */}
        {showDetailedSteps && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-400 block">
              Reducción progresiva paso por paso:
            </span>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {result.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-5">#{idx + 1}</span>
                    {idx === 0 ? (
                      <span className="text-slate-300">
                        Inicio con el primer número: <strong className="text-white">{step.number}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-300">
                        {step.prevAccumulator} + {step.number} ={' '}
                        <strong className="text-white">{step.sum}</strong>
                        {step.isIntermediateMultiDigit && (
                          <span className="text-slate-400 ml-1">
                            ({String(step.sum).split('').join(' + ')} ➔)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 font-bold">
                    {step.reductionResult}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={() => {
            soundManager.playClick();
            try {
              window.close();
            } catch (e) {
              console.warn('window.close() error:', e);
            }
            onGoToMenu();
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Menú Principal</span>
        </button>

        <button
          onClick={() => {
            soundManager.playStart();
            onPlayAgain();
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/25 transition-all hover:translate-y-[-1px]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Jugar Otra Ronda ({result.sequenceLength} números)</span>
        </button>
      </div>
    </div>
  );
};
