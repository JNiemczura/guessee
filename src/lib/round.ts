import { normalizeGuess } from "./normalize";
import { computeScore } from "./score";
import type { PuzzleKind, PuzzleShell, RoundOutcome, RoundStatus } from "./types";

export type GuessRecord = {
  text: string;
  normalized: string;
  correct: boolean;
  at: number;
};

export type RoundState = {
  puzzleId: string;
  kind: PuzzleKind;
  dateKey: string | null;
  category: string;
  attemptsAllowed: number;
  hintsAllowed: number;
  clueCount: number;
  cluesRevealed: number;
  attemptsUsed: number;
  incorrectGuesses: number;
  hintsUsed: number;
  status: RoundStatus;
  outcome: RoundOutcome | null;
  guesses: GuessRecord[];
  startedAt: number;
  finishedAt: number | null;
};

export const MAX_GUESS_LENGTH = 80;

export function createRound(shell: PuzzleShell, now: number = Date.now()): RoundState {
  return {
    puzzleId: shell.id,
    kind: shell.kind,
    dateKey: shell.dateKey,
    category: shell.category,
    attemptsAllowed: shell.attemptsAllowed,
    hintsAllowed: shell.hintsAllowed,
    clueCount: shell.clueCount,
    cluesRevealed: 1,
    attemptsUsed: 0,
    incorrectGuesses: 0,
    hintsUsed: 0,
    status: "playing",
    outcome: null,
    guesses: [],
    startedAt: now,
    finishedAt: null,
  };
}

export function attemptsLeft(state: RoundState): number {
  return Math.max(0, state.attemptsAllowed - state.attemptsUsed);
}

export function scoreOf(state: RoundState): number {
  return computeScore({
    incorrectGuesses: state.incorrectGuesses,
    hintsUsed: state.hintsUsed,
    outcome: state.outcome ?? "correct",
  });
}

export function isFinished(state: RoundState): boolean {
  return state.status === "finished";
}

export function isDuplicateGuess(state: RoundState, guess: string): boolean {
  const normalized = normalizeGuess(guess);
  if (!normalized) return false;
  return state.guesses.some((record) => record.normalized === normalized);
}

export function hasHintsLeft(state: RoundState): boolean {
  return state.hintsUsed < state.hintsAllowed;
}

export type GuessApplication = {
  state: RoundState;
  consumedAttempt: boolean;
  newlyFinished: boolean;
};

/**
 * Applies an incorrect-but-valid guess: it costs one attempt and reveals the
 * next clue, or ends the round when the attempt list runs out.
 */
export function applyIncorrectGuess(
  state: RoundState,
  guess: string,
  now: number = Date.now(),
): GuessApplication {
  if (isFinished(state)) {
    return { state, consumedAttempt: false, newlyFinished: false };
  }

  const attemptsUsed = state.attemptsUsed + 1;
  const exhausted = attemptsUsed >= state.attemptsAllowed;
  const cluesRevealed = Math.min(state.clueCount, state.cluesRevealed + 1);

  const next: RoundState = {
    ...state,
    attemptsUsed,
    incorrectGuesses: state.incorrectGuesses + 1,
    cluesRevealed,
    guesses: [
      ...state.guesses,
      { text: guess.trim(), normalized: normalizeGuess(guess), correct: false, at: now },
    ],
    status: exhausted ? "finished" : "playing",
    outcome: exhausted ? "attempts_exhausted" : null,
    finishedAt: exhausted ? now : null,
  };

  return { state: next, consumedAttempt: true, newlyFinished: exhausted };
}

export function applyCorrectGuess(
  state: RoundState,
  guess: string,
  now: number = Date.now(),
): GuessApplication {
  if (isFinished(state)) {
    return { state, consumedAttempt: false, newlyFinished: false };
  }

  const attemptsUsed = state.attemptsUsed + 1;
  const next: RoundState = {
    ...state,
    attemptsUsed,
    cluesRevealed: state.clueCount,
    guesses: [
      ...state.guesses,
      { text: guess.trim(), normalized: normalizeGuess(guess), correct: true, at: now },
    ],
    status: "finished",
    outcome: "correct",
    finishedAt: now,
  };

  return { state: next, consumedAttempt: true, newlyFinished: true };
}

/**
 * Spends score to reveal the next clue. Costs no attempt.
 */
export function applyHint(state: RoundState): GuessApplication {
  if (isFinished(state) || !hasHintsLeft(state)) {
    return { state, consumedAttempt: false, newlyFinished: false };
  }

  const next: RoundState = {
    ...state,
    hintsUsed: state.hintsUsed + 1,
    cluesRevealed: Math.min(state.clueCount, state.cluesRevealed + 1),
  };

  return { state: next, consumedAttempt: false, newlyFinished: false };
}

export function applyGiveUp(state: RoundState, now: number = Date.now()): GuessApplication {
  if (isFinished(state)) {
    return { state, consumedAttempt: false, newlyFinished: false };
  }

  return {
    state: {
      ...state,
      cluesRevealed: state.clueCount,
      status: "finished",
      outcome: "gave_up",
      finishedAt: now,
    },
    consumedAttempt: false,
    newlyFinished: true,
  };
}

/**
 * Marks a daily round as expired when the reset has already passed, so an
 * interrupted round still gets a satisfying reveal.
 */
export function applyExpired(state: RoundState, now: number = Date.now()): GuessApplication {
  if (isFinished(state)) {
    return { state, consumedAttempt: false, newlyFinished: false };
  }

  return {
    state: {
      ...state,
      cluesRevealed: state.clueCount,
      status: "finished",
      outcome: "expired",
      finishedAt: now,
    },
    consumedAttempt: false,
    newlyFinished: true,
  };
}

export function allCluesRevealed(state: RoundState): boolean {
  return state.cluesRevealed >= state.clueCount;
}
