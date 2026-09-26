import { createHash } from "node:crypto";

import {
  getPlayablePuzzle,
  getPuzzleById,
  listPlayablePuzzles,
  toShell,
} from "@/db/queries";
import type { Db } from "@/db/client";
import { GAME_ID, type GuessResponse, type Puzzle, type PuzzleShell, type RevealPayload } from "@/lib/types";
import { matchGuess } from "@/lib/match";
import { normalizeGuess } from "@/lib/normalize";
import { computeScore } from "@/lib/score";
import {
  MAX_GUESS_LENGTH,
  allCluesRevealed,
  applyCorrectGuess,
  applyExpired,
  applyGiveUp,
  applyHint,
  applyIncorrectGuess,
  attemptsLeft,
  hasHintsLeft,
  isFinished,
  type RoundState,
} from "@/lib/round";
import { addUtcDays } from "@/lib/dates";

export type SessionRound = {
  sessionId: string;
  puzzleId: string;
  status: "playing" | "finished";
  attemptsUsed: number;
  incorrectGuesses: number;
  hintsUsed: number;
  cluesRevealed: number;
  outcome: RoundState["outcome"];
  finishedAt: number | null;
  score: number | null;
  startedAt: number;
  updatedAt: number;
};

type RoundRow = {
  session_id: string;
  puzzle_id: string;
  status: string;
  attempts_used: number;
  incorrect_guesses: number;
  hints_used: number;
  clues_revealed: number;
  outcome: string | null;
  finished_at: number | null;
  score: number | null;
  started_at: number;
  updated_at: number;
};

function rowToSessionRound(row: RoundRow): SessionRound {
  return {
    sessionId: row.session_id,
    puzzleId: row.puzzle_id,
    status: row.status === "finished" ? "finished" : "playing",
    attemptsUsed: row.attempts_used,
    incorrectGuesses: row.incorrect_guesses,
    hintsUsed: row.hints_used,
    cluesRevealed: row.clues_revealed,
    outcome: (row.outcome as RoundState["outcome"]) ?? null,
    finishedAt: row.finished_at,
    score: row.score,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
  };
}

function hashGuess(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

export class RoundError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "not_playable"
      | "bad_session"
      | "bad_request"
      | "no_round"
      | "internal",
  ) {
    super(message);
  }
}

function requireSessionId(sessionId: unknown): string {
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(sessionId)) {
    throw new RoundError("A valid session id is required.", "bad_session");
  }
  return sessionId;
}

function loadPlayable(db: Db, puzzleId: unknown): Puzzle {
  if (typeof puzzleId !== "string" || !puzzleId) {
    throw new RoundError("A puzzle id is required.", "bad_request");
  }
  const puzzle = getPlayablePuzzle(db, puzzleId);
  if (!puzzle) {
    const exists = getPuzzleById(db, puzzleId);
    throw new RoundError(
      exists
        ? "That puzzle is not available to play."
        : "That puzzle does not exist.",
      exists ? "not_playable" : "not_found",
    );
  }
  return puzzle;
}

export function startRound(db: Db, puzzleId: string, sessionId: string): SessionRound {
  requireSessionId(sessionId);
  const puzzle = loadPlayable(db, puzzleId);

  const existing = readRound(db, sessionId, puzzle);
  if (existing) return existing;

  const now = Date.now();
  db.prepare(
    `INSERT INTO rounds (session_id, puzzle_id, status, clues_revealed, started_at, updated_at)
     VALUES (?, ?, 'playing', 1, ?, ?)`,
  ).run(sessionId, puzzle.id, now, now);

  return rowToSessionRound(
    db
      .prepare("SELECT * FROM rounds WHERE session_id = ? AND puzzle_id = ?")
      .get(sessionId, puzzle.id) as RoundRow,
  );
}

/**
 * A daily round stops being playable at the next 00:00 UTC. Practice rounds
 * never expire.
 */
function expiryTimeFor(puzzle: Puzzle): number | null {
  if (puzzle.kind !== "daily" || !puzzle.scheduledDate) return null;
  return new Date(`${addUtcDays(puzzle.scheduledDate, 1)}T00:00:00.000Z`).getTime();
}

/**
 * A daily round opened *during* its own day is the official round and closes at
 * the reset. A daily opened once that day is over is an archive replay: it
 * cannot be the official result any more, so it stays playable instead of
 * revealing the answer before a single guess. Both are derivable from
 * `started_at`, which only the server writes.
 */
function isReplay(round: SessionRound, expiry: number | null): boolean {
  return expiry !== null && round.startedAt >= expiry;
}

/**
 * A replay cannot expire, so a replay row that claims `expired` was written
 * before that rule existed: it was created for a finished day and closed on the
 * spot, before the player ever guessed. Those rows are dropped on sight so an
 * archive entry is playable again instead of opening on the answer.
 */
function isPoisonedReplay(round: SessionRound, expiry: number | null): boolean {
  return expiry !== null && isReplay(round, expiry) && round.outcome === "expired";
}

function deleteRound(db: Db, sessionId: string, puzzleId: string): void {
  db.prepare("DELETE FROM round_guesses WHERE session_id = ? AND puzzle_id = ?").run(
    sessionId,
    puzzleId,
  );
  db.prepare("DELETE FROM rounds WHERE session_id = ? AND puzzle_id = ?").run(sessionId, puzzleId);
}

function readRound(db: Db, sessionId: string, puzzle: Puzzle): SessionRound | null {
  const row = db
    .prepare("SELECT * FROM rounds WHERE session_id = ? AND puzzle_id = ?")
    .get(sessionId, puzzle.id) as RoundRow | undefined;

  if (!row) return null;

  const round = rowToSessionRound(row);
  const expiry = expiryTimeFor(puzzle);

  if (isPoisonedReplay(round, expiry)) {
    deleteRound(db, sessionId, puzzle.id);
    return null;
  }

  if (
    expiry === null ||
    round.status === "finished" ||
    isReplay(round, expiry) ||
    Date.now() < expiry
  ) {
    return round;
  }

  const expired = applyExpired(toRoundState(puzzle, round), expiry);
  const updated = fromRoundState(round, expired.state);
  writeRound(db, updated);
  return updated;
}

function writeRound(db: Db, round: SessionRound): void {
  db.prepare(
    `UPDATE rounds SET
       status = @status, attempts_used = @attemptsUsed, incorrect_guesses = @incorrectGuesses,
       hints_used = @hintsUsed, clues_revealed = @cluesRevealed, outcome = @outcome,
       finished_at = @finishedAt, score = @score, updated_at = @updatedAt
     WHERE session_id = @sessionId AND puzzle_id = @puzzleId`,
  ).run({
    ...round,
    outcome: round.outcome ?? null,
    finishedAt: round.finishedAt ?? null,
    score: round.score ?? null,
    updatedAt: Date.now(),
  });
}

/**
 * Bridges the server ledger and the shared pure state machine, so the scoring
 * and end-condition rules have exactly one implementation.
 */
function toRoundState(puzzle: Puzzle, round: SessionRound): RoundState {
  return {
    puzzleId: puzzle.id,
    kind: puzzle.kind,
    dateKey: puzzle.scheduledDate,
    category: puzzle.category,
    attemptsAllowed: puzzle.attemptsAllowed,
    hintsAllowed: puzzle.hintsAllowed,
    clueCount: puzzle.clues.length,
    cluesRevealed: round.cluesRevealed,
    attemptsUsed: round.attemptsUsed,
    incorrectGuesses: round.incorrectGuesses,
    hintsUsed: round.hintsUsed,
    status: round.status,
    outcome: round.outcome,
    guesses: [],
    startedAt: round.startedAt,
    finishedAt: round.finishedAt,
  };
}

function fromRoundState(round: SessionRound, next: RoundState): SessionRound {
  const outcome = next.outcome;
  return {
    ...round,
    status: next.status,
    attemptsUsed: next.attemptsUsed,
    incorrectGuesses: next.incorrectGuesses,
    hintsUsed: next.hintsUsed,
    cluesRevealed: next.cluesRevealed,
    outcome,
    finishedAt: next.finishedAt,
    score: outcome
      ? computeScore({
          incorrectGuesses: next.incorrectGuesses,
          hintsUsed: next.hintsUsed,
          outcome,
        })
      : null,
  };
}

function cluesUpTo(puzzle: Puzzle, revealed: number): string[] {
  return puzzle.clues.slice(0, Math.max(1, Math.min(puzzle.clues.length, revealed)));
}

function nextClueFor(puzzle: Puzzle, revealed: number): string | null {
  return revealed < puzzle.clues.length ? puzzle.clues[revealed] : null;
}

function guessRecorded(db: Db, sessionId: string, puzzleId: string, normalized: string): boolean {
  const row = db
    .prepare(
      "SELECT 1 AS found FROM round_guesses WHERE session_id = ? AND puzzle_id = ? AND guess_hash = ?",
    )
    .get(sessionId, puzzleId, hashGuess(normalized)) as { found: number } | undefined;
  return Boolean(row);
}

function recordGuess(
  db: Db,
  sessionId: string,
  puzzleId: string,
  normalized: string,
  correct: boolean,
): void {
  db.prepare(
    `INSERT INTO round_guesses (session_id, puzzle_id, guess_hash, correct, at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(sessionId, puzzleId, hashGuess(normalized), correct ? 1 : 0, Date.now());
}

export function submitGuess(
  db: Db,
  input: { sessionId?: unknown; puzzleId?: unknown; guess?: unknown },
): GuessResponse & { clues: string[] } {
  const sessionId = requireSessionId(input.sessionId);
  const puzzle = loadPlayable(db, input.puzzleId);

  if (typeof input.guess !== "string") {
    return buildRejection(db, sessionId, puzzle, "not_a_string", "Enter a word to search for.");
  }

  const raw = input.guess;
  if (raw.length > MAX_GUESS_LENGTH) {
    return buildRejection(
      db,
      sessionId,
      puzzle,
      "too_long",
      `Keep guesses under ${MAX_GUESS_LENGTH} characters. That attempt was not counted.`,
    );
  }

  const normalized = normalizeGuess(raw);
  if (!normalized) {
    return buildRejection(db, sessionId, puzzle, "empty", "Enter a word to search for.");
  }

  const round = readRound(db, sessionId, puzzle);
  if (!round) throw new RoundError("Start the round before guessing.", "no_round");

  if (isFinished(toRoundState(puzzle, round))) {
    return buildRejection(
      db,
      sessionId,
      puzzle,
      "round_over",
      "This round is already finished. The answer is on the result screen.",
    );
  }

  if (guessRecorded(db, sessionId, puzzle.id, normalized)) {
    return buildRejection(
      db,
      sessionId,
      puzzle,
      "duplicate",
      "You already tried that one, and it did not cost an attempt.",
    );
  }

  const match = matchGuess(raw, puzzle.answer, puzzle.aliases);
  const now = Date.now();
  const before = toRoundState(puzzle, round);

  const applied = match.correct
    ? applyCorrectGuess(before, raw, now)
    : applyIncorrectGuess(before, raw, now);

  recordGuess(db, sessionId, puzzle.id, normalized, match.correct);
  const after = fromRoundState(round, applied.state);
  writeRound(db, after);

  const nextClue = nextClueFor(puzzle, after.cluesRevealed);
  const revealed = cluesUpTo(puzzle, after.cluesRevealed);

  if (match.correct) {
    return {
      verdict: "correct",
      message: "Correct.",
      attemptsUsed: after.attemptsUsed,
      attemptsLeft: attemptsLeft(toRoundState(puzzle, after)),
      cluesRevealed: after.cluesRevealed,
      nextClue: null,
      status: "finished",
      outcome: "correct",
      score: after.score,
      hintUsed: after.hintsUsed > 0,
      clues: revealed,
    };
  }

  const hintNote = match.suggestion ? ` Did you mean "${match.suggestion}"?` : "";
  const message = after.outcome
    ? `No. That was attempt ${after.attemptsUsed} of ${puzzle.attemptsAllowed}.${hintNote}`
    : `No.${hintNote} Clue ${after.cluesRevealed} unlocked.`;

  return {
    verdict: "incorrect",
    message,
    attemptsUsed: after.attemptsUsed,
    attemptsLeft: attemptsLeft(toRoundState(puzzle, after)),
    cluesRevealed: after.cluesRevealed,
    nextClue,
    status: after.status,
    outcome: after.outcome,
    score: after.score,
    hintUsed: after.hintsUsed > 0,
    clues: revealed,
  };
}

function buildRejection(
  db: Db,
  sessionId: string,
  puzzle: Puzzle,
  reason: GuessResponse["reason"],
  message: string,
): GuessResponse & { clues: string[] } {
  const round = readRound(db, sessionId, puzzle);
  const state = toRoundState(puzzle, round ?? startRound(db, puzzle.id, sessionId));

  return {
    verdict: "rejected",
    reason,
    message,
    attemptsUsed: state.attemptsUsed,
    attemptsLeft: attemptsLeft(state),
    cluesRevealed: state.cluesRevealed,
    nextClue: nextClueFor(puzzle, state.cluesRevealed),
    status: state.status,
    outcome: state.outcome,
    score: round?.score ?? null,
    hintUsed: state.hintsUsed > 0,
    clues: cluesUpTo(puzzle, state.cluesRevealed),
  };
}

export function takeHint(db: Db, input: { sessionId?: unknown; puzzleId?: unknown }) {
  const sessionId = requireSessionId(input.sessionId);
  const puzzle = loadPlayable(db, input.puzzleId);

  const round = readRound(db, sessionId, puzzle);
  if (!round) throw new RoundError("Start the round before using a hint.", "no_round");

  const before = toRoundState(puzzle, round);
  if (isFinished(before)) {
    return { ok: false as const, message: "This round is already finished." };
  }
  if (!hasHintsLeft(before)) {
    return { ok: false as const, message: "You have used every hint for this puzzle." };
  }
  if (allCluesRevealed(before)) {
    return { ok: false as const, message: "Every clue is already unlocked." };
  }

  const applied = applyHint(before);
  const after = fromRoundState(round, applied.state);
  writeRound(db, after);

  return {
    ok: true as const,
    message: "Hint used. It cost 20 points but no attempt.",
    hintsUsed: after.hintsUsed,
    hintsLeft: puzzle.hintsAllowed - after.hintsUsed,
    nextClue: nextClueFor(puzzle, after.cluesRevealed),
    cluesRevealed: after.cluesRevealed,
    clues: cluesUpTo(puzzle, after.cluesRevealed),
    scorePreview: computeScore({
      incorrectGuesses: after.incorrectGuesses,
      hintsUsed: after.hintsUsed,
      outcome: "correct",
    }),
  };
}

export function giveUp(db: Db, input: { sessionId?: unknown; puzzleId?: unknown }) {
  const sessionId = requireSessionId(input.sessionId);
  const puzzle = loadPlayable(db, input.puzzleId);

  const round = readRound(db, sessionId, puzzle);
  if (!round) throw new RoundError("Start the round before giving up.", "no_round");

  const before = toRoundState(puzzle, round);
  if (isFinished(before)) {
    return { ok: false as const, message: "This round is already finished." };
  }

  const applied = applyGiveUp(before);
  const after = fromRoundState(round, applied.state);
  writeRound(db, after);

  return {
    ok: true as const,
    message: "Round closed. Here is the answer and how the clues led there.",
    score: after.score,
  };
}

export function getReveal(
  db: Db,
  input: { sessionId?: unknown; puzzleId?: unknown },
): RevealPayload | null {
  const sessionId = requireSessionId(input.sessionId);
  const puzzle = loadPlayable(db, input.puzzleId);

  const round = readRound(db, sessionId, puzzle);
  if (!round || !isFinished(toRoundState(puzzle, round))) return null;

  return {
    id: puzzle.id,
    answer: puzzle.answer,
    aliases: puzzle.aliases,
    explanation: puzzle.explanation,
    clues: puzzle.clues,
    category: puzzle.category,
    outcome: round.outcome ?? "expired",
    attemptsUsed: round.attemptsUsed,
    attemptsAllowed: puzzle.attemptsAllowed,
    hintsUsed: round.hintsUsed,
    score: round.score ?? 0,
    correctionNote: puzzle.correctionNote,
    nextResetAtUtc: toShell(puzzle).nextResetAtUtc,
  };
}

export function practiceEntries(db: Db) {
  return listPlayablePuzzles(db).map((puzzle) => ({
    id: puzzle.id,
    kind: puzzle.kind,
    label: puzzle.kind === "practice" ? "Practice" : "Archive",
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    dateKey: puzzle.scheduledDate,
  }));
}

export function shellFor(db: Db, puzzleId: string, now = new Date()): PuzzleShell | null {
  const puzzle = getPlayablePuzzle(db, puzzleId, now);
  return puzzle ? toShell(puzzle, now) : null;
}

export { GAME_ID };
