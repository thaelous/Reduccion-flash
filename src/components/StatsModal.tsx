import React from 'react';
import { UserStats, SequenceLength } from '../types';
import { BarChart3, Trophy, Flame, ShieldCheck, Zap, RotateCcw, X } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface StatsModalProps {
  stats: UserStats;
  onResetStats: () => void;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  onResetStats,
  onClose,
}) => {
  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const beginnerWinRate =
    stats.modeStats.beginner.played > 0
      ? Math.round(
          (stats.modeStats.beginner.won / stats.modeStats.beginner.played) * 100
        )
      : 0;

  const advancedWinRate =
    stats.modeStats.advanced.played > 0
      ? Math.round(
          (stats.modeStats.advanced.won / stats.modeStats.advanced.played) * 100
        )
      : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-sm">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Tus Estadísticas
              </h1>
              <p className="text-xs text-slate-400">
                Progreso y rendimiento de cálculo mental
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Partidas
            </span>
            <span className="font-mono font-black text-2xl text-white">
              {stats.gamesPlayed}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Precisión
            </span>
            <span className="font-mono font-black text-2xl text-emerald-400">
              {winRate}%
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> Racha
            </span>
            <span className="font-mono font-black text-2xl text-amber-400">
              {stats.currentStreak}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-indigo-400" /> Récord
            </span>
            <span className="font-mono font-black text-2xl text-indigo-400">
              {stats.bestStreak}
            </span>
          </div>
        </div>

        {/* Mode breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                Modo Principiante
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300">
                {beginnerWinRate}% éxito
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Jugadas: {stats.modeStats.beginner.played}</span>
              <span>Ganadas: {stats.modeStats.beginner.won}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-indigo-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                Modo Avanzado
              </div>
              <span className="text-xs font-mono font-bold text-indigo-300">
                {advancedWinRate}% éxito
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Jugadas: {stats.modeStats.advanced.played}</span>
              <span>Ganadas: {stats.modeStats.advanced.won}</span>
            </div>
          </div>
        </div>

        {/* Best reaction times per length */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Mejor Tiempo de Respuesta por Longitud
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {([3, 5, 10, 20, 50] as SequenceLength[]).map((len) => {
              const best = stats.bestTimePerLength[len];
              return (
                <div
                  key={len}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center"
                >
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {len} Núms
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {best !== undefined ? `${(best / 1000).toFixed(2)}s` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
          <button
            onClick={() => {
              if (window.confirm('¿Deseas reiniciar todas tus estadísticas a cero?')) {
                onResetStats();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar estadísticas</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
