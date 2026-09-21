export type GameMode = 'beginner' | 'advanced';

export type SequenceLength = number;

export type GameState =
  | 'menu'
  | 'tutorial'
  | 'playing'
  | 'answering'
  | 'result'
  | 'stats'
  | 'auth'
  | 'host_room'
  | 'student_join'
  | 'student_room';

export interface ReductionStep {
  index: number;
  number: number;
  prevAccumulator: number;
  sum: number;
  reductionResult: number;
  isIntermediateMultiDigit: boolean;
  intermediateDigits?: number[];
}

export interface GameResult {
  mode: GameMode;
  sequenceLength: SequenceLength;
  stepIntervalSeconds?: number;
  sequence: number[];
  steps: ReductionStep[];
  correctAnswer: number;
  totalSum: number;
  userAnswer: number | null;
  isCorrect: boolean;
  timeToAnswerMs: number;
  timedOut: boolean;
  date: string;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  bestTimePerLength: Partial<Record<SequenceLength, number>>;
  modeStats: {
    beginner: { played: number; won: number };
    advanced: { played: number; won: number };
  };
}
