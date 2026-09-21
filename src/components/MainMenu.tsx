import React, { useState } from 'react';
import { GameMode, SequenceLength, UserStats } from '../types';
import { soundManager } from '../utils/audio';
import {
  Play,
  Zap,
  BookOpen,
  BarChart2,
  Sliders,
  ShieldCheck,
  Flame,
  Minus,
  Plus,
  Clock,
  Users,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { LengthModal } from './LengthModal';

interface MainMenuProps {
  selectedLength: SequenceLength;
  onSelectLength: (length: SequenceLength) => void;
  beginnerInterval: number;
  onSetBeginnerInterval: (interval: number) => void;
  advancedInterval: number;
  onSetAdvancedInterval: (interval: number) => void;
  onStartGame: (mode: GameMode, interval: number) => void;
  onOpenHostRoom: () => void;
  onOpenTutorial: () => void;
  onOpenStats: () => void;
  stats: UserStats;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  selectedLength,
  onSelectLength,
  beginnerInterval,
  onSetBeginnerInterval,
  advancedInterval,
  onSetAdvancedInterval,
  onStartGame,
  onOpenHostRoom,
  onOpenTutorial,
  onOpenStats,
  stats,
}) => {
  const [isLengthModalOpen, setIsLengthModalOpen] = useState(false);

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const handleQuickStepLength = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    const nextVal = Math.max(2, Math.min(99, selectedLength + delta));
    onSelectLength(nextVal);
  };

  const handleAdjustInterval = (
    current: number,
    delta: number,
    setter: (val: number) => void
  ) => {
    soundManager.playClick();
    const raw = Math.round((current + delta) * 10) / 10;
    const clamped = Math.max(0.5, Math.min(5.0, raw));
    setter(clamped);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 sm:py-4 flex flex-col justify-between min-h-[calc(100vh-8rem)] space-y-3">
      {/* 1. Compact Hero Header */}
      <div className="text-center space-y-1 pt-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[11px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          <span>Gimnasia Cerebral & Raíz Digital</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Reducción
        </h1>
        <p className="text-slate-400 text-xs max-w-md mx-auto line-clamp-2">
          Suma dígitos y reduce en tiempo real. Juega individualmente o en vivo con tu clase.
        </p>
      </div>

      {/* 2. MULTIPLAYER CLASSROOM BANNER (QR Code + PIN Support) */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-blue-950/60 border-2 border-indigo-500/40 rounded-3xl p-3.5 sm:p-4 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Modo Multijugador Educativo en Vivo
                </h3>
                <span className="px-2 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold rounded-full uppercase">
                  Firebase
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Proyecta un código QR con PIN para que los alumnos compitan al instante sin registros.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0">
            {/* Teacher Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenHostRoom();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Panel Profesor (Crear Sala)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Compact Space-Saving Length Button & Stepper for Solo Play */}
      <div className="flex justify-center my-1">
        <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-md">
          <button
            onClick={(e) => handleQuickStepLength(-1, e)}
            disabled={selectedLength <= 2}
            className="w-7 h-7 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 flex items-center justify-center transition-all active:scale-95 text-xs font-bold cursor-pointer"
            title="Reducir 1 número"
            aria-label="Reducir longitud"
          >
            <Minus className="w-3 h-3" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setIsLengthModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white transition-all group cursor-pointer"
            title="Personalizar cantidad de números"
          >
            <Sliders className="w-3 h-3 text-indigo-400 group-hover:rotate-45 transition-transform" />
            <span>Longitud Solo:</span>
            <span className="font-mono font-black text-xs text-white bg-indigo-600 px-2 py-0.5 rounded-lg shadow-sm">
              {selectedLength} núms
            </span>
          </button>

          <button
            onClick={(e) => handleQuickStepLength(1, e)}
            disabled={selectedLength >= 99}
            className="w-7 h-7 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 flex items-center justify-center transition-all active:scale-95 text-xs font-bold cursor-pointer"
            title="Aumentar 1 número"
            aria-label="Aumentar longitud"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4. Single-Player Game Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-auto">
        {/* Beginner Mode Card */}
        <div className="bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-3.5 sm:p-4 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-3 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Modo Principiante
                  </h2>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                    Práctica Guiada
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                {selectedLength} núms
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Recuadro de práctica en vivo con desglose y reducción paso a paso.
            </p>
          </div>

          {/* Interval Control */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Tiempo entre números:</span>
              </span>
              <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {beginnerInterval.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAdjustInterval(beginnerInterval, -0.5, onSetBeginnerInterval)}
                disabled={beginnerInterval <= 0.5}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Restar 0.5 segundos"
              >
                <Minus className="w-3 h-3" />
              </button>

              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={beginnerInterval}
                onChange={(e) => onSetBeginnerInterval(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />

              <button
                onClick={() => handleAdjustInterval(beginnerInterval, 0.5, onSetBeginnerInterval)}
                disabled={beginnerInterval >= 5.0}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Sumar 0.5 segundos"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => {
              soundManager.playStart();
              onStartGame('beginner', beginnerInterval);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Jugar Principiante ({beginnerInterval.toFixed(1)}s)</span>
          </button>
        </div>

        {/* Advanced Mode Card */}
        <div className="bg-slate-900/50 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-3.5 sm:p-4 backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-3 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Modo Avanzado
                  </h2>
                  <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block">
                    Reto Mental Solo
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                {selectedLength} núms
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Cálculo mental puro sin pistas. Responde en los 5s finales.
            </p>
          </div>

          {/* Interval Control */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Tiempo entre números:</span>
              </span>
              <span className="font-mono font-black text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                {advancedInterval.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAdjustInterval(advancedInterval, -0.5, onSetAdvancedInterval)}
                disabled={advancedInterval <= 0.5}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Restar 0.5 segundos"
              >
                <Minus className="w-3 h-3" />
              </button>

              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={advancedInterval}
                onChange={(e) => onSetAdvancedInterval(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />

              <button
                onClick={() => handleAdjustInterval(advancedInterval, 0.5, onSetAdvancedInterval)}
                disabled={advancedInterval >= 5.0}
                className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Sumar 0.5 segundos"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => {
              soundManager.playStart();
              onStartGame('advanced', advancedInterval);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Jugar Avanzado ({advancedInterval.toFixed(1)}s)</span>
          </button>
        </div>
      </div>

      {/* 5. Compact Bottom Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenTutorial();
          }}
          className="flex items-center justify-center gap-2 p-2.5 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>¿Cómo se juega?</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenStats();
          }}
          className="flex items-center justify-center gap-2 p-2.5 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          <BarChart2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            Estadísticas {stats.gamesPlayed > 0 ? `(${winRate}%)` : ''}
          </span>
        </button>

        <div className="hidden sm:flex items-center justify-center gap-2 p-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400">
          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">
            Racha: <strong className="text-white">{stats.currentStreak}</strong> (Récord: {stats.bestStreak})
          </span>
        </div>
      </div>

      {/* Length Modal */}
      <LengthModal
        currentLength={selectedLength}
        isOpen={isLengthModalOpen}
        onClose={() => setIsLengthModalOpen(false)}
        onSave={(len) => onSelectLength(len)}
      />
    </div>
  );
};
