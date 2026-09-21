/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, SequenceLength, GameState, GameResult, UserStats } from './types';
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { TutorialModal } from './components/TutorialModal';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';
import { StatsModal } from './components/StatsModal';
import { HostRoomScreen } from './components/HostRoomScreen';
import { StudentRoomScreen } from './components/StudentRoomScreen';
import { AuthScreen } from './components/AuthScreen';
import { auth, onAuthStateChanged, signOut, User } from './utils/firebase';
import { soundManager } from './utils/audio';

const STATS_STORAGE_KEY = 'reduccion_game_stats_v1';

const DEFAULT_STATS: UserStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestTimePerLength: {},
  modeStats: {
    beginner: { played: 0, won: 0 },
    advanced: { played: 0, won: 0 },
  },
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);

  // Mandatory auth/license screen by default upon opening the application
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const roomParam = searchParams.get('room') || searchParams.get('r');
      if (roomParam) {
        return 'student_join';
      }
    }
    // If not already authenticated in Firebase, show auth screen
    // (AuthScreen will intelligently show 'login' for registered computers, or 'redeem_code' for new computers)
    return auth.currentUser ? 'menu' : 'auth';
  });

  const [activeMode, setActiveMode] = useState<GameMode>('beginner');
  const [selectedLength, setSelectedLength] = useState<SequenceLength>(5);
  const [beginnerInterval, setBeginnerInterval] = useState<number>(2.5);
  const [advancedInterval, setAdvancedInterval] = useState<number>(1.5);
  const [activeInterval, setActiveInterval] = useState<number>(2.0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getIsMuted());
  const [studentInitialPin, setStudentInitialPin] = useState<string>('');

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          localStorage.setItem('reduccion_license_validated', 'true');
        } catch {
          // ignore
        }
      }
      // If user is authenticated and currently on mandatory auth screen, allow entry to menu
      if (user && gameState === 'auth') {
        setGameState('menu');
      }
    });
    return () => unsubscribe();
  }, [gameState]);

  // 1. Detect QR code / URL invitation link parameter `?room=PIN` on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const roomParam = searchParams.get('room') || searchParams.get('r');
      if (roomParam) {
        setStudentInitialPin(roomParam.trim().toUpperCase());
        setGameState('student_join');
      }
    }
  }, []);

  // Persistent User Statistics
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_STATS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage errors
    }
  }, [stats]);

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleStartGame = (mode: GameMode, interval?: number) => {
    const speed = interval ?? (mode === 'beginner' ? beginnerInterval : advancedInterval);
    setActiveMode(mode);
    setActiveInterval(speed);
    setGameState('playing');
  };

  const handleFinishGame = (result: GameResult) => {
    setLastResult(result);
    setGameState('result');

    // Update statistics
    setStats((prev) => {
      const nextGamesPlayed = prev.gamesPlayed + 1;
      const nextGamesWon = prev.gamesWon + (result.isCorrect ? 1 : 0);
      const nextStreak = result.isCorrect ? prev.currentStreak + 1 : 0;
      const nextBestStreak = Math.max(prev.bestStreak, nextStreak);

      const modeKey = result.mode;
      const currentModeStat = prev.modeStats[modeKey];
      const updatedModeStat = {
        played: currentModeStat.played + 1,
        won: currentModeStat.won + (result.isCorrect ? 1 : 0),
      };

      const updatedBestTime = { ...prev.bestTimePerLength };
      if (result.isCorrect) {
        const prevBest = updatedBestTime[result.sequenceLength];
        if (prevBest === undefined || result.timeToAnswerMs < prevBest) {
          updatedBestTime[result.sequenceLength] = result.timeToAnswerMs;
        }
      }

      return {
        ...prev,
        gamesPlayed: nextGamesPlayed,
        gamesWon: nextGamesWon,
        currentStreak: nextStreak,
        bestStreak: nextBestStreak,
        bestTimePerLength: updatedBestTime,
        modeStats: {
          ...prev.modeStats,
          [modeKey]: updatedModeStat,
        },
      };
    });
  };

  const handleResetStats = () => {
    setStats(DEFAULT_STATS);
    try {
      localStorage.removeItem(STATS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setGameState('auth');
    } catch (err) {
      console.error('Error signing out:', err);
    }
    // Attempt closing window as requested:
    try {
      window.close();
    } catch (e) {
      console.warn('window.close() error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-500/30 selection:text-white animate-fade-in">
      {/* Universal Single-Row Top Navigation Bar */}
      <Header
        currentView={gameState}
        onNavigate={(view) => setGameState(view)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        streak={stats.currentStreak}
        user={firebaseUser}
        onSignOut={handleSignOut}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full flex flex-col justify-center">
        {gameState === 'menu' && (
          <MainMenu
            selectedLength={selectedLength}
            onSelectLength={(len) => setSelectedLength(len)}
            beginnerInterval={beginnerInterval}
            onSetBeginnerInterval={(val) => setBeginnerInterval(val)}
            advancedInterval={advancedInterval}
            onSetAdvancedInterval={(val) => setAdvancedInterval(val)}
            onStartGame={(mode, interval) => handleStartGame(mode, interval)}
            onOpenHostRoom={() => {
              if (firebaseUser) {
                setGameState('host_room');
              } else {
                setGameState('auth');
              }
            }}
            onOpenTutorial={() => setGameState('tutorial')}
            onOpenStats={() => setGameState('stats')}
            stats={stats}
          />
        )}

        {/* Authentication / License Gate (Mandatory on startup before accessing main menu) */}
        {gameState === 'auth' && (
          <AuthScreen
            isMandatory={!firebaseUser}
            onSuccess={(user) => {
              try {
                localStorage.setItem('reduccion_license_validated', 'true');
              } catch {
                // ignore
              }
              setFirebaseUser(user);
              setGameState('menu');
            }}
            onCancel={firebaseUser ? () => setGameState('menu') : undefined}
          />
        )}

        {/* Teacher / Host Room Panel */}
        {gameState === 'host_room' && (
          <HostRoomScreen onBackToMenu={() => setGameState('menu')} />
        )}

        {/* Student Room / Join by PIN or QR */}
        {(gameState === 'student_join' || gameState === 'student_room') && (
          <StudentRoomScreen
            initialPin={studentInitialPin}
            onBackToMenu={() => {
              setStudentInitialPin('');
              setGameState('menu');
            }}
          />
        )}

        {gameState === 'tutorial' && (
          <TutorialModal
            onClose={() => setGameState('menu')}
            onStartGame={(mode) => handleStartGame(mode)}
          />
        )}

        {gameState === 'stats' && (
          <StatsModal
            stats={stats}
            onResetStats={handleResetStats}
            onClose={() => setGameState('menu')}
          />
        )}

        {gameState === 'playing' && (
          <GameScreen
            key={`${activeMode}-${selectedLength}-${activeInterval}-${Date.now()}`}
            mode={activeMode}
            sequenceLength={selectedLength}
            intervalSeconds={activeInterval}
            onFinishGame={handleFinishGame}
            onAbort={() => setGameState('menu')}
          />
        )}

        {gameState === 'result' && lastResult && (
          <ResultScreen
            result={lastResult}
            onPlayAgain={() => setGameState('playing')}
            onGoToMenu={() => setGameState('menu')}
          />
        )}
      </main>

      {/* Sleek Theme Footer */}
      <footer className="w-full border-t border-slate-800/60 py-4 bg-[#05070A]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500 font-medium">
          <p>Reducción &bull; Cálculo Mental & Raíz Digital Multijugador</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-slate-400">Firebase Firestore Sincronizado</span>
            </div>
            <span className="text-slate-500 hidden sm:inline">&bull; Aulas en Vivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
