import React, { useState } from 'react';
import { BookOpen, Sparkles, ArrowRight, CheckCircle2, RotateCcw, Play, HelpCircle } from 'lucide-react';
import { reduceToSingleDigit } from '../utils/math';
import { soundManager } from '../utils/audio';

interface TutorialModalProps {
  onClose: () => void;
  onStartGame: (mode: 'beginner' | 'advanced') => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, onStartGame }) => {
  const [activeTab, setActiveTab] = useState<'concept' | 'sandbox' | 'practice'>('concept');

  // Sandbox state
  const [sandboxInput, setSandboxInput] = useState<string>('7, 8, 4');
  const [sandboxSequence, setSandboxSequence] = useState<number[]>([7, 8, 4]);

  // Practice state
  const practiceSequence = [6, 9, 7]; // 6+9=15->6, 6+7=13->4
  const [practiceAnswer, setPracticeAnswer] = useState<string>('');
  const [practiceEvaluated, setPracticeEvaluated] = useState<boolean>(false);
  const [practiceIsCorrect, setPracticeIsCorrect] = useState<boolean>(false);

  const handleUpdateSandbox = (val: string) => {
    setSandboxInput(val);
    const parsed = val
      .split(/[,+\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= 999);
    setSandboxSequence(parsed);
  };

  const handleAddDigitSandbox = (d: number) => {
    soundManager.playClick();
    const newSeq = [...sandboxSequence, d];
    setSandboxSequence(newSeq);
    setSandboxInput(newSeq.join(', '));
  };

  const handleClearSandbox = () => {
    soundManager.playClick();
    setSandboxSequence([]);
    setSandboxInput('');
  };

  const checkPractice = () => {
    soundManager.playClick();
    const parsed = parseInt(practiceAnswer.trim(), 10);
    const totalSum = practiceSequence.reduce((a, b) => a + b, 0);
    const { result } = reduceToSingleDigit(totalSum);
    const correct = parsed === result;
    setPracticeIsCorrect(correct);
    setPracticeEvaluated(true);
    if (correct) {
      soundManager.playSuccessFanfare();
    } else {
      soundManager.playErrorSound();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-800/60 pb-6 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Tutorial de Reducción
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Aprende la técnica matemática de cálculo mental y raíz digital
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl self-start lg:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('concept');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'concept'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Concepto y Reglas
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('sandbox');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'sandbox'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Probador en Vivo
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('practice');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'practice'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Mini Test
            </button>
          </div>
        </div>

        {/* Tab 1: Concept */}
        {activeTab === 'concept' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                  ¿Qué es la reducción de números?
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                  Consiste en <strong className="text-white">sumar los dígitos</strong> de un número de forma iterativa hasta obtener <strong className="text-white">un único dígito del 1 al 9</strong>.
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 space-y-1">
                  <div className="text-slate-500">// Ejemplo simple:</div>
                  <div>48 ➔ 4 + 8 = <span className="text-amber-400">12</span></div>
                  <div>12 ➔ 1 + 2 = <span className="text-emerald-400 font-bold">3</span></div>
                  <div className="text-emerald-400/80 text-[11px] pt-1">Resultado de reducción = 3</div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                  Reducción en tiempo real (Secuencia)
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                  En el juego, los números aparecen uno por uno. Puedes ir sumando y reduciendo sobre la marcha:
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 space-y-1">
                  <div>Aparece 1º número: <span className="text-indigo-400 font-bold">7</span></div>
                  <div>Aparece 2º número: <span className="text-indigo-400 font-bold">8</span> ➔ 7 + 8 = 15 ➔ <span className="text-amber-400 font-bold">6</span></div>
                  <div>Aparece 3º número: <span className="text-indigo-400 font-bold">4</span> ➔ 6 + 4 = 10 ➔ <span className="text-emerald-400 font-bold">1</span></div>
                  <div className="text-emerald-400/80 text-[11px] pt-1">¡Nunca manejas números mayores a 18!</div>
                </div>
              </div>
            </div>

            {/* Secret of 9 */}
            <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base mb-2">
                <span>💡</span> El Truco Maestro: El número 9
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                En la raíz digital (módulo 9), <strong className="text-white">sumar 9 no cambia la reducción</strong> de ningún número.
                <br />
                <span className="text-xs text-slate-400 block mt-1.5">
                  Ejemplo: <strong>5 + 9 = 14</strong> ➔ 1 + 4 = <strong>5</strong>. ¡Puedes ignorar mentalmente cualquier 9 que aparezca o cualquier par que sume 9 (como 4+5, 2+7, 3+6, 1+8)!
                </span>
              </p>
            </div>

            {/* Modes distinction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-5">
                <div className="font-bold text-emerald-400 text-sm mb-1">🟢 Modo Principiante</div>
                <p className="text-xs text-slate-300">
                  Ideal para aprender. Muestra en la esquina superior derecha la reducción acumulada en vivo a medida que salen los números.
                </p>
              </div>
              <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-5">
                <div className="font-bold text-indigo-400 text-sm mb-1">⚡ Modo Avanzado</div>
                <p className="text-xs text-slate-300">
                  Ritmo rápido (1.5 segundos entre números) y puro cálculo mental sin ayudas. Al terminar la secuencia tienes solo 5 segundos con contador regresivo para ingresar tu respuesta.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Sandbox */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Laboratorio de Reducción Interactivo
              </h3>
              <p className="text-xs text-slate-400">
                Agrega números haciendo clic en los botones o escribiendo una secuencia para ver cómo se calcula paso a paso.
              </p>
            </div>

            {/* Quick buttons */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Agregar dígito:</span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleAddDigitSandbox(d)}
                    className="w-11 h-11 rounded-xl bg-slate-900/80 hover:bg-indigo-600 hover:text-white text-slate-200 font-mono font-bold text-sm transition-all border border-slate-800 active:scale-95 shadow-sm"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handleClearSandbox}
                  className="px-3.5 h-11 rounded-xl bg-slate-900/60 hover:bg-rose-600/30 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors border border-slate-800 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              </div>
            </div>

            {/* Input sequence */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Secuencia de números (separados por coma):
              </label>
              <input
                type="text"
                value={sandboxInput}
                onChange={(e) => handleUpdateSandbox(e.target.value)}
                placeholder="Ejemplo: 7, 8, 4, 9, 3"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Live Calculation Display */}
            {sandboxSequence.length > 0 ? (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs text-slate-400">Suma total directa: </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {sandboxSequence.join(' + ')} = {sandboxSequence.reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Reducción Final:</span>
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-bold flex items-center justify-center text-base">
                      {reduceToSingleDigit(sandboxSequence.reduce((a, b) => a + b, 0)).result}
                    </span>
                  </div>
                </div>

                {/* Step by step */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Paso a paso progresivo:
                  </span>
                  <div className="space-y-2">
                    {sandboxSequence.map((num, idx) => {
                      if (idx === 0) {
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-xs font-mono"
                          >
                            <span className="text-slate-400">Paso 1: Primer número</span>
                            <span className="text-indigo-400 font-bold text-sm">{num}</span>
                          </div>
                        );
                      }

                      // Sub-sequence up to previous
                      const prevSum = sandboxSequence.slice(0, idx).reduce((a, b) => a + b, 0);
                      const prevRed = reduceToSingleDigit(prevSum).result;
                      const currentSum = prevRed + num;
                      const currentRed = reduceToSingleDigit(currentSum).result;

                      return (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl text-xs font-mono"
                        >
                          <span className="text-slate-400">
                            Paso {idx + 1}: Previo ({prevRed}) + Nuevo ({num}) = {currentSum}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {currentSum >= 10 && (
                              <span className="text-slate-500">
                                ({String(currentSum).split('').join(' + ')} ➔)
                              </span>
                            )}
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              {currentRed}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                Ingresa o haz clic en dígitos arriba para ver la reducción en vivo.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Mini Practice Test */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Ponte a prueba con este mini-ejercicio
              </h3>
              <p className="text-xs text-slate-400">
                Calcula la reducción de la siguiente secuencia de 3 dígitos antes de empezar a jugar:
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-4 my-4">
                {practiceSequence.map((num, i) => (
                  <React.Fragment key={i}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center font-mono font-bold text-2xl sm:text-3xl text-white shadow-inner">
                      {num}
                    </div>
                    {i < practiceSequence.length - 1 && (
                      <span className="text-slate-600 font-mono text-xl">+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="max-w-xs mx-auto mt-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="9"
                    value={practiceAnswer}
                    onChange={(e) => {
                      setPracticeAnswer(e.target.value);
                      setPracticeEvaluated(false);
                    }}
                    placeholder="Tu respuesta (1-9)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono font-bold text-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={checkPractice}
                    disabled={!practiceAnswer}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-colors whitespace-nowrap shadow-md shadow-indigo-600/20"
                  >
                    Verificar
                  </button>
                </div>

                {practiceEvaluated && (
                  <div
                    className={`p-4 rounded-2xl border text-xs text-left animate-fade-in ${
                      practiceIsCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {practiceIsCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ¡Excelente! Respuesta correcta: 4
                        </>
                      ) : (
                        <>
                          <HelpCircle className="w-4 h-4 text-rose-400" />
                          Casi. La respuesta correcta es 4
                        </>
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Paso a paso: 6 + 9 = 15 (1+5=6) ➔ Luego 6 + 7 = 13 ➔ 1 + 3 = <strong>4</strong>.
                      <br />
                      (O suma total: 6 + 9 + 7 = 22 ➔ 2 + 2 = 4).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/60 pt-6 mt-6">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-semibold transition-colors"
          >
            Volver al Menú
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                soundManager.playClick();
                onStartGame('beginner');
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-semibold transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Probar Principiante
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                onStartGame('advanced');
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-xl shadow-indigo-600/20 transition-all hover:translate-y-[-1px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Jugar Avanzado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
