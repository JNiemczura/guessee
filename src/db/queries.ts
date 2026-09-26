import { addUtcDays, isDateKey, nextResetAtUtc, todayUtc } from "@/lib/dates";
import { GAME_ID, type Puzzle, type PuzzleShell, type PuzzleStatus } from "@/lib/types";
import { validatePuzzle, type ValidationResult } from "@/lib/validatePuzzle";

import type { Db } from "./client";
import { puzzleToParams, rowToPuzzle, snapshotOf, type PuzzleRow } from "./mapping";
import { readPuzzleRow } from "./seed";

const SELECT_ALL = "SELECT * FROM puzzles";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Promotes any scheduled daily whose date has arrived.
 *
 * This is the publication check from the guidance: it runs on read, so a
 * scheduled puzzle goes live at the reset without an operator pressing anything.
 */
export function publishDueDailies(db: Db, now: Date = new Date()): number {
  const today = todayUtc(now);
  const result = db
    .prepare(
      `UPDATE puzzles
          SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ?
        WHERE kind = 'daily' AND status = 'scheduled' AND scheduled_date <= ?`,
    )
    .run(now.toISOString(), now.toISOString(), today);

  return result.changes;
}

export function getPuzzleById(db: Db, id: string): Puzzle | null {
  const row = readPuzzleRow(db, id);
  return row ? rowToPuzzle(row) : null;
}

export function getDailyByDate(
  db: Db,
  dateKey: string,
  gameId: string = GAME_ID,
  now: Date = new Date(),
): Puzzle | null {
  if (!isDateKey(dateKey)) return null;
  publishDueDailies(db, now);

  const row = db
    .prepare(
      `${SELECT_ALL}
        WHERE game_id = ? AND kind = 'daily' AND scheduled_date = ? AND status = 'published'`,
    )
    .get(gameId, dateKey) as PuzzleRow | undefined;

  return row ? rowToPuzzle(row) : null;
}

export function listAllPuzzles(db: Db): Puzzle[] {
  const rows = db
    .prepare(`${SELECT_ALL} ORDER BY COALESCE(scheduled_date, '9999-12-31') DESC, id DESC`)
    .all() as PuzzleRow[];
  return rows.map(rowToPuzzle);
}

export function listPlayablePuzzles(db: Db, now: Date = new Date()): Puzzle[] {
  const today = todayUtc(now);
  publishDueDailies(db, now);

  const rows = db
    .prepare(
      `${SELECT_ALL}
        WHERE status = 'published'
          AND (kind = 'practice' OR (kind = 'daily' AND scheduled_date <= ?))
        ORDER BY kind, scheduled_date DESC, id DESC`,
    )
    .all(today) as PuzzleRow[];

  return rows.map(rowToPuzzle);
}

export function getPlayablePuzzle(db: Db, id: string, now: Date = new Date()): Puzzle | null {
  const today = todayUtc(now);
  publishDueDailies(db, now);

  const row = db
    .prepare(
      `${SELECT_ALL}
        WHERE id = ? AND status = 'published'
          AND (kind = 'practice' OR (kind = 'daily' AND scheduled_date <= ?))`,
    )
    .get(id, today) as PuzzleRow | undefined;

  return row ? rowToPuzzle(row) : null;
}

export function toShell(puzzle: Puzzle, now: Date = new Date()): PuzzleShell {
  return {
    id: puzzle.id,
    kind: puzzle.kind,
    dateKey: puzzle.scheduledDate ?? "",
    language: puzzle.language,
    category: puzzle.category,
    attemptsAllowed: puzzle.attemptsAllowed,
    hintsAllowed: puzzle.hintsAllowed,
    clueCount: puzzle.clues.length,
    resetAtUtc: puzzle.scheduledDate
      ? new Date(`${puzzle.scheduledDate}T00:00:00.000Z`).toISOString()
      : now.toISOString(),
    nextResetAtUtc: nextResetAtUtc(now).toISOString(),
    correctionNote: puzzle.correctionNote,
  };
}

const ALLOWED_TRANSITIONS: Record<PuzzleStatus, PuzzleStatus[]> = {
  draft: ["in_review", "retired"],
  in_review: ["draft", "playtested", "retired"],
  playtested: ["in_review", "scheduled", "retired"],
  scheduled: ["playtested", "published", "retired"],
  published: ["corrected", "retired"],
  corrected: ["published", "retired"],
  retired: ["draft"],
};

export function canTransition(from: PuzzleStatus, to: PuzzleStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export type SaveResult =
  | { ok: true; puzzle: Puzzle }
  | { ok: false; error: string; validation: ValidationResult };

export function savePuzzle(
  db: Db,
  incoming: Puzzle,
  options: { changedBy: string; note?: string },
): SaveResult {
  const existing = getPuzzleById(db, incoming.id);
  const now = nowIso();

  const puzzle: Puzzle = {
    ...incoming,
    revision: existing ? existing.revision + 1 : 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existing?.publishedAt ?? (incoming.status === "published" ? now : null),
  };

  const all = listAllPuzzles(db);
  const validation = validatePuzzle(puzzle, all);

  if (existing && incoming.status !== existing.status && !canTransition(existing.status, incoming.status)) {
    return {
      ok: false,
      error: `A puzzle cannot move from ${existing.status} to ${incoming.status}.`,
      validation,
    };
  }

  if (incoming.status === "scheduled" && existing?.status !== "scheduled") {
    if (!validation.ok) {
      return { ok: false, error: "Fix the errors below before scheduling.", validation };
    }
    assertDateSlotFree(db, puzzle);
  }

  if (existing) {
    db.prepare(
      `UPDATE puzzles SET
         game_id = @gameId, kind = @kind, scheduled_date = @scheduledDate, language = @language,
         category = @category, answer = @answer, aliases = @aliasesJson, clues = @cluesJson,
         explanation = @explanation, difficulty = @difficulty, source_notes = @sourceNotes,
         status = @status, attempts_allowed = @attemptsAllowed, hints_allowed = @hintsAllowed,
         author = @author, reviewer = @reviewer, ambiguity_checked_at = @ambiguityCheckedAt,
         correction_note = @correctionNote, revision = @revision, created_at = @createdAt,
         updated_at = @updatedAt, published_at = @publishedAt
       WHERE id = @id`,
    ).run(puzzleToParams(puzzle));
  } else {
    db.prepare(
      `INSERT INTO puzzles (
         game_id, kind, scheduled_date, language, category, answer, aliases, clues,
         explanation, difficulty, source_notes, status, attempts_allowed, hints_allowed,
         author, reviewer, ambiguity_checked_at, correction_note, revision,
         created_at, updated_at, published_at, id
       ) VALUES (
         @gameId, @kind, @scheduledDate, @language, @category, @answer, @aliasesJson, @cluesJson,
         @explanation, @difficulty, @sourceNotes, @status, @attemptsAllowed, @hintsAllowed,
         @author, @reviewer, @ambiguityCheckedAt, @correctionNote, @revision,
         @createdAt, @updatedAt, @publishedAt, @id
       )`,
    ).run(puzzleToParams(puzzle));
  }

  db.prepare(
    `INSERT INTO puzzle_revisions (puzzle_id, revision, snapshot, changed_by, note, changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(puzzle.id, puzzle.revision, snapshotOf(puzzle), options.changedBy, options.note ?? "", now);

  return { ok: true, puzzle };
}

function assertDateSlotFree(db: Db, puzzle: Puzzle): void {
  if (puzzle.kind !== "daily" || !puzzle.scheduledDate) return;

  const row = db
    .prepare(
      `SELECT id FROM puzzles
        WHERE game_id = ? AND kind = 'daily' AND scheduled_date = ?
          AND status IN ('scheduled', 'published') AND id <> ?`,
    )
    .get(puzzle.gameId, puzzle.scheduledDate, puzzle.id) as { id: string } | undefined;

  if (row) {
    throw new Error(`${puzzle.scheduledDate} already has an official puzzle: ${row.id}`);
  }
}

export type RevisionEntry = {
  revision: number;
  changedBy: string;
  note: string;
  changedAt: string;
};

export function listRevisions(db: Db, puzzleId: string): RevisionEntry[] {
  const rows = db
    .prepare(
      `SELECT revision, changed_by, note, changed_at FROM puzzle_revisions
        WHERE puzzle_id = ? ORDER BY revision DESC`,
    )
    .all(puzzleId) as { revision: number; changed_by: string; note: string; changed_at: string }[];

  return rows.map((row) => ({
    revision: row.revision,
    changedBy: row.changed_by,
    note: row.note,
    changedAt: row.changed_at,
  }));
}

export type MissingDay = { dateKey: string; covered: boolean };

/**
 * Coverage report for the next `days` days, used by the operator's missing-puzzle
 * alert. Anything beyond the two-week reviewed buffer shows as uncovered.
 */
export function dailyCoverage(db: Db, days = 14, now: Date = new Date()): MissingDay[] {
  publishDueDailies(db, now);
  const today = todayUtc(now);

  const rows = db
    .prepare(
      `SELECT scheduled_date FROM puzzles
        WHERE kind = 'daily' AND status IN ('scheduled', 'published') AND scheduled_date IS NOT NULL`,
    )
    .all() as { scheduled_date: string }[];

  const covered = new Set(rows.map((row) => row.scheduled_date));

  return Array.from({ length: days }, (_, index) => {
    const dateKey = addUtcDays(today, index);
    return { dateKey, covered: covered.has(dateKey) };
  });
}

export function exportPuzzles(db: Db): string {
  return JSON.stringify(listAllPuzzles(db), null, 2);
}
