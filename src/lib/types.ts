export const GAME_ID = "progressive-clues";
export const GAME_LABEL = "Progressive Clues";
export const HUB_LABEL = "Guessee";

export const RESET_HOUR_UTC = 0;

export type PuzzleKind = "daily" | "practice";

/**
 * How a round was reached. A `replay` is a daily puzzle opened after its own day
 * had already ended: it is playable, but it is never the official daily result.
 */
export type RoundMode = "daily" | "replay" | "practice";

export type PuzzleStatus =
  | "draft"
  | "in_review"
  | "playtested"
  | "scheduled"
  | "published"
  | "retired"
  | "corrected";

export type Puzzle = {
  id: string;
  gameId: string;
  kind: PuzzleKind;
  scheduledDate: string | null;
  language: string;
  category: string;
  answer: string;
  aliases: string[];
  clues: string[];
  explanation: string;
  difficulty: number;
  sourceNotes: string;
  status: PuzzleStatus;
  attemptsAllowed: number;
  hintsAllowed: number;
  author: string;
  reviewer: string | null;
  ambiguityCheckedAt: string | null;
  correctionNote: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type RoundOutcome = "correct" | "attempts_exhausted" | "gave_up" | "expired";

export type RejectionReason =
  | "empty"
  | "too_long"
  | "not_a_string"
  | "duplicate"
  | "round_over"
  | "wrong_puzzle"
  | "no_round";

export type GuessVerdict = "correct" | "incorrect" | "rejected";

export type RoundStatus = "playing" | "finished";

export type GuessResponse = {
  verdict: GuessVerdict;
  reason?: RejectionReason;
  message: string;
  attemptsUsed: number;
  attemptsLeft: number;
  cluesRevealed: number;
  nextClue: string | null;
  status: RoundStatus;
  outcome: RoundOutcome | null;
  score: number | null;
  hintUsed: boolean;
};

export type PuzzleShell = {
  id: string;
  kind: PuzzleKind;
  dateKey: string;
  language: string;
  category: string;
  attemptsAllowed: number;
  hintsAllowed: number;
  clueCount: number;
  resetAtUtc: string;
  nextResetAtUtc: string;
  correctionNote: string | null;
};

export type DailyPayload = {
  shell: PuzzleShell | null;
  clues: string[];
  missing: boolean;
};

export type PracticeEntry = {
  id: string;
  kind: PuzzleKind;
  label: string;
  category: string;
  difficulty: number;
  dateKey: string | null;
};

export type RevealPayload = {
  id: string;
  answer: string;
  aliases: string[];
  explanation: string;
  clues: string[];
  category: string;
  outcome: RoundOutcome;
  attemptsUsed: number;
  attemptsAllowed: number;
  hintsUsed: number;
  score: number;
  correctionNote: string | null;
  nextResetAtUtc: string;
};

export type ReportKind =
  | "wrong_answer"
  | "clue_wrong"
  | "clue_ambiguous"
  | "clue_too_hard"
  | "offensive"
  | "other";
