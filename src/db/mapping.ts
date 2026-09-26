import type { Puzzle, PuzzleKind, PuzzleStatus } from "@/lib/types";

export type PuzzleRow = {
  id: string;
  game_id: string;
  kind: string;
  scheduled_date: string | null;
  language: string;
  category: string;
  answer: string;
  aliases: string;
  clues: string;
  explanation: string;
  difficulty: number;
  source_notes: string;
  status: string;
  attempts_allowed: number;
  hints_allowed: number;
  author: string;
  reviewer: string | null;
  ambiguity_checked_at: string | null;
  correction_note: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function rowToPuzzle(row: PuzzleRow): Puzzle {
  return {
    id: row.id,
    gameId: row.game_id,
    kind: row.kind as PuzzleKind,
    scheduledDate: row.scheduled_date,
    language: row.language,
    category: row.category,
    answer: row.answer,
    aliases: parseJsonArray(row.aliases),
    clues: parseJsonArray(row.clues),
    explanation: row.explanation,
    difficulty: row.difficulty,
    sourceNotes: row.source_notes,
    status: row.status as PuzzleStatus,
    attemptsAllowed: row.attempts_allowed,
    hintsAllowed: row.hints_allowed,
    author: row.author,
    reviewer: row.reviewer,
    ambiguityCheckedAt: row.ambiguity_checked_at,
    correctionNote: row.correction_note,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export type PuzzleParams = Omit<Puzzle, "aliases" | "clues"> & {
  aliasesJson: string;
  cluesJson: string;
};

export function puzzleToParams(puzzle: Puzzle): PuzzleParams {
  const { aliases, clues, ...rest } = puzzle;
  return {
    ...rest,
    aliasesJson: JSON.stringify(aliases),
    cluesJson: JSON.stringify(clues),
  };
}

export function snapshotOf(puzzle: Puzzle): string {
  return JSON.stringify(puzzle, null, 2);
}
