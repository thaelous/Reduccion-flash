import React, { useState } from 'react';
import { X, Sliders, Check, Plus, Minus } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface LengthModalProps {
  currentLength: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (length: number) => void;
}

const PRESETS = [3, 5, 8, 10, 15, 20, 30, 50];

export const LengthModal: React.FC<LengthModalProps> = ({
  currentLength,
  isOpen,
  onClose,
  onSave,
}) => {
  const [val, setVal] = useState<number>(currentLength);

  if (!isOpen) return null;

  const handleAdjust = (delta: number) => {
    soundManager.playClick();
    setVal((prev) => Math.max(2, Math.min(99, prev + delta)));
  };

  const handleSetPreset = (p: number) => {
    soundManager.playClick();
    setVal(p);
  };

  const handleConfirm = () => {
    soundManager.playClick();
    const cleanVal = Math.max(2, Math.min(99, val || 5));
    onSave(cleanVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Longitud de la Secuencia
              </h3>
              <p className="text-xs text-slate-400">
                Define cuántos números se proyectarán
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

        {/* Big Stepper Controller */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            Cantidad de Números
          </span>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleAdjust(-1)}
              disabled={val <= 2}
              className="w-12 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-slate-200 flex items-center justify-center text-lg font-bold transition-all active:scale-95"
              aria-label="Restar 1 número"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <input
                type="number"
                min={2}
                max={99}
                value={val}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num)) setVal(Math.max(1, Math.min(99, num)));
                }}
                className="w-24 bg-transparent text-center font-mono font-black text-4xl sm:text-5xl text-indigo-400 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 font-medium">
                (2 a 99 dígitos)
              </span>
            </div>

            <button
              onClick={() => handleAdjust(1)}
              disabled={val >= 99}
              className="w-12 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-slate-200 flex items-center justify-center text-lg font-bold transition-all active:scale-95"
              aria-label="Sumar 1 número"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="text-xs text-slate-400 pt-1">
            ⏱ Duración estimada de la ronda:{' '}
            <strong className="text-slate-200">
              ~{Math.round(val * 2.5)} segundos
            </strong>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Accesos Rápidos
          </span>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => {
              const isSelected = val === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleSetPreset(preset)}
                  className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {preset} núms
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Guardar Longitud ({val} números)</span>
        </button>
      </div>
    </div>
  );
};
