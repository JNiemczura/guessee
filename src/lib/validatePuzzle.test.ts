import { describe, expect, it } from "vitest";

import { GAME_ID, type Puzzle } from "./types";
import { errorsOf, validatePuzzle, warningsOf } from "./validatePuzzle";

const NOW = "2026-01-01T00:00:00.000Z";

function puzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: "pc-2026-01-02",
    gameId: GAME_ID,
    kind: "daily",
    scheduledDate: "2026-01-02",
    language: "en",
    category: "Science",
    answer: "Penicillin",
    aliases: [],
    clues: [
      "It changed which bacterial infections doctors could treat.",
      "It came from a mould, not from a plant.",
      "A British doctor discovered it in 1928.",
    ],
    explanation: "Penicillin is an antibiotic discovered by Alexander Fleming in 1928.",
    difficulty: 3,
    sourceNotes: "Common knowledge.",
    status: "in_review",
    attemptsAllowed: 5,
    hintsAllowed: 1,
    author: "Ada",
    reviewer: "Bo",
    ambiguityCheckedAt: NOW,
    correctionNote: null,
    revision: 1,
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: null,
    ...overrides,
  };
}

const codes = (result: ReturnType<typeof validatePuzzle>) => result.issues.map((i) => i.code);

describe("validatePuzzle", () => {
  it("passes a complete, reviewed puzzle", () => {
    const result = validatePuzzle(puzzle());
    expect(errorsOf(result)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("blocks a puzzle whose clue gives away the answer", () => {
    const result = validatePuzzle(
      puzzle({ clues: ["Penicillin changed medicine.", "It is a mould.", "Discovered in 1928."] }),
    );
    expect(codes(result)).toContain("clue_contains_answer");
    expect(result.ok).toBe(false);
  });

  it("blocks a puzzle where the first clue is the answer itself", () => {
    const result = validatePuzzle(
      puzzle({ clues: ["Penicillin", "It is a mould.", "Discovered in 1928."] }),
    );
    expect(codes(result)).toContain("first_clue_is_answer");
  });

  it("requires at least three clues", () => {
    const result = validatePuzzle(puzzle({ clues: ["One clue only."] }));
    expect(codes(result)).toContain("clues_too_few");
  });

  it("requires a second reviewer and the human ambiguity check before scheduling", () => {
    expect(codes(validatePuzzle(puzzle({ reviewer: null })))).toContain("reviewer_missing");
    expect(codes(validatePuzzle(puzzle({ ambiguityCheckedAt: null })))).toContain(
      "ambiguity_unchecked",
    );
  });

  it("warns, but does not block, on fewer attempts than clues", () => {
    const result = validatePuzzle(puzzle({ attemptsAllowed: 2 }));
    expect(codes(result)).toContain("attempts_below_clues");
    expect(warningsOf(result).map((issue) => issue.code)).toContain("attempts_below_clues");
    expect(result.ok).toBe(true);
  });

  it("warns when the same answer is reused by another live puzzle", () => {
    const result = validatePuzzle(puzzle(), [puzzle({ id: "pc-other" })]);
    expect(codes(result)).toContain("answer_reused");
  });

  it("does not warn about an answer reused from a retired puzzle", () => {
    const result = validatePuzzle(puzzle(), [puzzle({ id: "pc-old", status: "retired" })]);
    expect(codes(result)).not.toContain("answer_reused");
  });

  it("requires an explanation so a finished round is satisfying", () => {
    expect(codes(validatePuzzle(puzzle({ explanation: "  " })))).toContain(
      "explanation_missing",
    );
  });

  it("rejects an answer that normalizes to fewer than three characters", () => {
    expect(codes(validatePuzzle(puzzle({ answer: "pi" })))).toContain("answer_too_short");
  });

  it("requires a scheduled date for a daily puzzle but not for practice", () => {
    expect(codes(validatePuzzle(puzzle({ scheduledDate: null })))).toContain("date_invalid");
    expect(
      codes(validatePuzzle(puzzle({ kind: "practice", scheduledDate: null }))),
    ).not.toContain("date_invalid");
  });
});
