import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

interface FloatingDigit {
  id: number;
  digit: number;
  top: string;
  left: string;
  size: string;
  opacity: string;
  color: string;
  animationClass: string;
  delay: string;
}

const FLOATING_DIGITS: FloatingDigit[] = [
  { id: 1, digit: 7, top: '18%', left: '15%', size: 'text-3xl sm:text-5xl', opacity: 'opacity-40', color: 'text-blue-400', animationClass: 'animate-float-up', delay: '0s' },
  { id: 2, digit: 3, top: '22%', left: '80%', size: 'text-2xl sm:text-4xl', opacity: 'opacity-50', color: 'text-sky-300', animationClass: 'animate-float-down', delay: '0.4s' },
  { id: 3, digit: 9, top: '35%', left: '25%', size: 'text-4xl sm:text-6xl', opacity: 'opacity-30', color: 'text-blue-500', animationClass: 'animate-float-down', delay: '0.2s' },
  { id: 4, digit: 5, top: '32%', left: '72%', size: 'text-3xl sm:text-5xl', opacity: 'opacity-45', color: 'text-indigo-400', animationClass: 'animate-float-up', delay: '0.6s' },
  { id: 5, digit: 8, top: '65%', left: '18%', size: 'text-2xl sm:text-4xl', opacity: 'opacity-35', color: 'text-cyan-400', animationClass: 'animate-float-up', delay: '0.8s' },
  { id: 6, digit: 4, top: '70%', left: '78%', size: 'text-4xl sm:text-6xl', opacity: 'opacity-40', color: 'text-blue-400', animationClass: 'animate-float-down', delay: '0.3s' },
  { id: 7, digit: 1, top: '78%', left: '32%', size: 'text-3xl sm:text-5xl', opacity: 'opacity-50', color: 'text-sky-400', animationClass: 'animate-float-up', delay: '0.5s' },
  { id: 8, digit: 6, top: '75%', left: '60%', size: 'text-2xl sm:text-4xl', opacity: 'opacity-30', color: 'text-indigo-300', animationClass: 'animate-float-down', delay: '0.7s' },
  { id: 9, digit: 2, top: '15%', left: '50%', size: 'text-3xl sm:text-4xl', opacity: 'opacity-35', color: 'text-cyan-300', animationClass: 'animate-float-down', delay: '0.9s' },
  { id: 10, digit: 9, top: '55%', left: '88%', size: 'text-xl sm:text-3xl', opacity: 'opacity-25', color: 'text-blue-300', animationClass: 'animate-float-up', delay: '1s' },
  { id: 11, digit: 8, top: '48%', left: '8%', size: 'text-xl sm:text-3xl', opacity: 'opacity-25', color: 'text-sky-400', animationClass: 'animate-float-down', delay: '1.2s' },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade-out at 2.6 seconds so it smoothly completes at 3.2s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2600);

    // Call onComplete after 3.2 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(onComplete, 300);
      }}
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden transition-opacity duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Pantalla de inicio REDUCCION"
    >
      {/* Background Radial Glow */}
      <div className="absolute w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/15 rounded-full blur-[90px] pointer-events-none animate-pulse-glow" />

      {/* Floating Numbers */}
      <div className="absolute inset-0 pointer-events-none">
        {FLOATING_DIGITS.map((item) => (
          <span
            key={item.id}
            className={`absolute font-mono font-black ${item.size} ${item.opacity} ${item.color} ${item.animationClass}`}
            style={{
              top: item.top,
              left: item.left,
              animationDelay: item.delay,
              textShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
            }}
          >
            {item.digit}
          </span>
        ))}
      </div>

      {/* Central Brand: REDUCCION in Glowing Blue Letters */}
      <div className="relative z-10 text-center px-4 space-y-3">
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.22em] sm:tracking-[0.28em] text-blue-500 font-mono drop-shadow-[0_0_35px_rgba(59,130,246,0.85)] animate-pulse-glow"
          style={{
            textShadow:
              '0 0 20px rgba(59, 130, 246, 0.9), 0 0 45px rgba(14, 165, 233, 0.6), 0 0 80px rgba(37, 99, 235, 0.4)',
          }}
        >
          REDUCCION
        </h1>

        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-blue-500/70" />
          <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-[0.3em] text-sky-400/80">
            Cálculo Mental & Raíz Digital
          </span>
          <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-blue-500/70" />
        </div>
      </div>

      {/* Subtle bottom indicator */}
      <div className="absolute bottom-8 text-[10px] font-mono text-slate-600 uppercase tracking-widest animate-pulse">
        Iniciando...
      </div>
    </div>
  );
};
