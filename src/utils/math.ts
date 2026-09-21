import { ReductionStep, SequenceLength } from '../types';

/**
 * Reduces a positive integer down to a single digit by iteratively summing its digits.
 * Example: 48 -> 4 + 8 = 12 -> 1 + 2 = 3
 */
export function reduceToSingleDigit(num: number): { result: number; steps: number[] } {
  if (num <= 0) return { result: 0, steps: [0] };
  
  const history: number[] = [num];
  let current = num;

  while (current >= 10) {
    const digits = String(current).split('').map(Number);
    current = digits.reduce((sum, d) => sum + d, 0);
    history.push(current);
  }

  return { result: current, steps: history };
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates the delay between consecutive numbers based on game mode:
 * - Advanced: 1500ms (1.5 seconds)
 * - Beginner: random between 2000ms and 3000ms (2 to 3 seconds)
 */
export function getDelayMsForMode(mode: 'beginner' | 'advanced'): number {
  if (mode === 'advanced') {
    return 1500;
  }
  return getRandomInt(2000, 3000);
}

/**
 * Generates a random delay between 2000ms and 3000ms (2 to 3 seconds)
 */
export function getRandomDelayMs(): number {
  return getRandomInt(2000, 3000);
}

/**
 * Generates a sequence of single-digit random numbers between 1 and 9.
 */
export function generateSequence(length: SequenceLength): number[] {
  const sequence: number[] = [];
  for (let i = 0; i < length; i++) {
    sequence.push(getRandomInt(1, 9));
  }
  return sequence;
}

/**
 * Calculates step-by-step reduction history for a sequence of numbers.
 */
export function calculateReductionSteps(sequence: number[]): {
  steps: ReductionStep[];
  totalSum: number;
  finalReduced: number;
} {
  const steps: ReductionStep[] = [];
  let totalSum = 0;
  let currentAcc = 0;

  for (let i = 0; i < sequence.length; i++) {
    const num = sequence[i];
    totalSum += num;

    if (i === 0) {
      currentAcc = num;
      steps.push({
        index: 0,
        number: num,
        prevAccumulator: 0,
        sum: num,
        reductionResult: num,
        isIntermediateMultiDigit: false,
      });
    } else {
      const prev = currentAcc;
      const sum = prev + num;
      const { result, steps: redSteps } = reduceToSingleDigit(sum);
      const isMulti = sum >= 10;
      
      currentAcc = result;

      const step: ReductionStep = {
        index: i,
        number: num,
        prevAccumulator: prev,
        sum: sum,
        reductionResult: result,
        isIntermediateMultiDigit: isMulti,
      };

      if (isMulti) {
        step.intermediateDigits = String(sum).split('').map(Number);
      }

      steps.push(step);
    }
  }

  const { result: finalReduced } = reduceToSingleDigit(totalSum);

  return {
    steps,
    totalSum,
    finalReduced,
  };
}
