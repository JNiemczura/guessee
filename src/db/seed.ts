import { buildSeedPuzzles } from "@/content/puzzles";
import { GAME_ID } from "@/lib/types";

import type { Db } from "./client";
import { puzzleToParams, rowToPuzzle, type PuzzleRow } from "./mapping";

const INSERT = `
INSERT INTO puzzles (
  id, game_id, kind, scheduled_date, language, category, answer, aliases, clues,
  explanation, difficulty, source_notes, status, attempts_allowed, hints_allowed,
  author, reviewer, ambiguity_checked_at, correction_note, revision,
  created_at, updated_at, published_at
) VALUES (
  @id, @gameId, @kind, @scheduledDate, @language, @category, @answer, @aliasesJson, @cluesJson,
  @explanation, @difficulty, @sourceNotes, @status, @attemptsAllowed, @hintsAllowed,
  @author, @reviewer, @ambiguityCheckedAt, @correctionNote, @revision,
  @createdAt, @updatedAt, @publishedAt
)
`;

export function insertPuzzle(db: Db, puzzle: Parameters<typeof puzzleToParams>[0]): void {
  db.prepare(INSERT).run(puzzleToParams(puzzle));
}

/**
 * Populates an empty database with the launch dataset. Never overwrites existing
 * rows, so it is safe to call on every cold start.
 */
export function seedIfEmpty(db: Db): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM puzzles").get() as { count: number };
  if (row.count > 0) return false;

  const now = new Date();
  const nowIso = now.toISOString();

  const insert = db.transaction(() => {
    for (const seed of buildSeedPuzzles(now)) {
      insertPuzzle(db, {
        id: seed.id,
        gameId: GAME_ID,
        kind: seed.kind,
        scheduledDate: seed.scheduledDate,
        language: "en",
        category: seed.category,
        answer: seed.answer,
        aliases: seed.aliases,
        clues: seed.clues,
        explanation: seed.explanation,
        difficulty: seed.difficulty,
        sourceNotes: seed.sourceNotes,
        status: seed.status,
        attemptsAllowed: seed.attemptsAllowed,
        hintsAllowed: seed.hintsAllowed,
        author: seed.author,
        reviewer: seed.reviewer,
        ambiguityCheckedAt: seed.ambiguityCheckedAt,
        correctionNote: null,
        revision: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: seed.status === "published" ? nowIso : null,
      });

      db.prepare(
        `INSERT INTO puzzle_revisions (puzzle_id, revision, snapshot, changed_by, note, changed_at)
         VALUES (?, 1, ?, ?, ?, ?)`,
      ).run(
        seed.id,
        JSON.stringify(seed),
        seed.author,
        "Seeded launch dataset",
        nowIso,
      );
    }
  });

  insert();
  return true;
}

export function readPuzzleRow(db: Db, id: string): PuzzleRow | undefined {
  return db.prepare("SELECT * FROM puzzles WHERE id = ?").get(id) as PuzzleRow | undefined;
}

export { rowToPuzzle };
