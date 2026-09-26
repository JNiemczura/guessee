import type { RoundOutcome } from "./types";

export const SCORE = {
  base: 100,
  perIncorrectGuess: 10,
  perHint: 20,
  floor: 0,
} as const;

export type ScoreInput = {
  incorrectGuesses: number;
  hintsUsed: number;
  outcome: RoundOutcome;
};

export function computeScore({ incorrectGuesses, hintsUsed, outcome }: ScoreInput): number {
  if (outcome === "gave_up" || outcome === "expired") return SCORE.floor;

  const raw =
    SCORE.base - incorrectGuesses * SCORE.perIncorrectGuess - hintsUsed * SCORE.perHint;

  return Math.max(SCORE.floor, raw);
}

export function scoreCeiling(): number {
  return SCORE.base;
}
