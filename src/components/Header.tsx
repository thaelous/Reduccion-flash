import React from 'react';
import { Volume2, VolumeX, BookOpen, BarChart3, Home, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { User } from '../utils/firebase';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: 'menu' | 'tutorial' | 'stats' | 'host_room' | 'student_join' | 'auth') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  streak: number;
  user?: User | null;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  isMuted,
  onToggleMute,
  streak,
  user,
  onSignOut,
}) => {
  const isLocked = currentView === 'auth' && !user;

  return (
    <header className="w-full border-b border-slate-800/80 bg-[#05070A]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <button
          onClick={() => {
            if (isLocked) return;
            soundManager.playClick();
            onNavigate('menu');
          }}
          disabled={isLocked}
          className={`flex items-center gap-3 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl p-1 transition-all ${
            isLocked ? 'cursor-default opacity-80' : 'cursor-pointer'
          }`}
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-mono font-bold text-white shadow-lg shadow-indigo-600/25 group-hover:bg-indigo-500 transition-all">
            ∑
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:to-indigo-300 transition-all whitespace-nowrap">
            REDUCCIÓN
          </span>
        </button>

        {/* Action Zone */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLocked && streak > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm">
              <span>🔥</span>
              <span>Racha: {streak}</span>
            </div>
          )}

          {!isLocked && (
            <>
              <button
                onClick={() => {
                  soundManager.playClick();
                  onNavigate('tutorial');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  currentView === 'tutorial'
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-700'
                }`}
                title="Tutorial y reglas"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden xs:inline">Tutorial</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onNavigate('stats');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  currentView === 'stats'
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-700'
                }`}
                title="Estadísticas"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden xs:inline">Estadísticas</span>
              </button>
            </>
          )}

          {/* Sound Mute/Unmute */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            aria-label="Silenciar sonido"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* User Account & Sign Out (when authenticated) */}
          {user && (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-800">
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-slate-300 font-medium"
                title={user.email || 'Usuario con licencia'}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="max-w-[110px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
              </div>

              {onSignOut && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    try {
                      window.close();
                    } catch (e) {
                      console.warn('window.close() error:', e);
                    }
                    onSignOut();
                  }}
                  className="p-2 rounded-xl bg-slate-900/60 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Cerrar sesión y salir"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!isLocked && (
            <button
              onClick={() => {
                soundManager.playClick();
                try {
                  window.close();
                } catch (e) {
                  console.warn('window.close() error:', e);
                }
                onNavigate('menu');
              }}
              className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer"
              title="Volver al menú / Salir de la aplicación"
              aria-label="Volver al menú o salir"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
