import { describe, expect, it } from "vitest";

import {
  allCluesRevealed,
  applyCorrectGuess,
  applyExpired,
  applyGiveUp,
  applyHint,
  applyIncorrectGuess,
  attemptsLeft,
  createRound,
  hasHintsLeft,
  isDuplicateGuess,
  isFinished,
  scoreOf,
} from "./round";
import type { PuzzleShell } from "./types";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

function shell(overrides: Partial<PuzzleShell> = {}): PuzzleShell {
  return {
    id: "pc-test",
    kind: "daily",
    dateKey: "2026-01-01",
    language: "en",
    category: "Science",
    attemptsAllowed: 5,
    hintsAllowed: 1,
    clueCount: 5,
    resetAtUtc: "2026-01-01T00:00:00.000Z",
    nextResetAtUtc: "2026-01-02T00:00:00.000Z",
    correctionNote: null,
    ...overrides,
  };
}

describe("createRound", () => {
  it("opens with the first clue visible and nothing spent", () => {
    const state = createRound(shell(), NOW);
    expect(state.cluesRevealed).toBe(1);
    expect(state.attemptsUsed).toBe(0);
    expect(state.hintsUsed).toBe(0);
    expect(state.status).toBe("playing");
    expect(state.outcome).toBeNull();
    expect(scoreOf(state)).toBe(100);
  });
});

describe("attempt accounting", () => {
  it("an incorrect guess costs an attempt and reveals the next clue", () => {
    const result = applyIncorrectGuess(createRound(shell(), NOW), "wrong", NOW);
    expect(result.consumedAttempt).toBe(true);
    expect(result.state.attemptsUsed).toBe(1);
    expect(result.state.incorrectGuesses).toBe(1);
    expect(result.state.cluesRevealed).toBe(2);
    expect(attemptsLeft(result.state)).toBe(4);
  });

  it("a correct guess ends the round immediately and reveals every clue", () => {
    const result = applyCorrectGuess(createRound(shell(), NOW), "Penicillin", NOW);
    expect(result.state.status).toBe("finished");
    expect(result.state.outcome).toBe("correct");
    expect(allCluesRevealed(result.state)).toBe(true);
    expect(result.state.attemptsUsed).toBe(1);
  });

  it("a correct guess on the last attempt still wins", () => {
    let state = createRound(shell(), NOW);
    for (let i = 0; i < 4; i += 1) state = applyIncorrectGuess(state, `wrong${i}`, NOW).state;
    expect(isFinished(state)).toBe(false);
    expect(attemptsLeft(state)).toBe(1);

    const win = applyCorrectGuess(state, "Penicillin", NOW);
    expect(win.state.outcome).toBe("correct");
    expect(isFinished(win.state)).toBe(true);
  });

  it("ends the round when the attempts run out", () => {
    let state = createRound(shell(), NOW);
    for (let i = 0; i < 4; i += 1) state = applyIncorrectGuess(state, `wrong${i}`, NOW).state;
    const last = applyIncorrectGuess(state, "wrong4", NOW);
    expect(last.newlyFinished).toBe(true);
    expect(last.state.outcome).toBe("attempts_exhausted");
    expect(attemptsLeft(last.state)).toBe(0);
  });

  it("ignores further input once the round is finished", () => {
    const finished = applyGiveUp(createRound(shell(), NOW), NOW).state;
    const again = applyCorrectGuess(finished, "Penicillin", NOW);
    expect(again.consumedAttempt).toBe(false);
    expect(again.state).toBe(finished);
  });
});

describe("duplicates", () => {
  it("treats a repeated guess as a duplicate regardless of case or spacing", () => {
    const state = applyIncorrectGuess(createRound(shell(), NOW), "Canyon", NOW).state;
    expect(isDuplicateGuess(state, "canyon")).toBe(true);
    expect(isDuplicateGuess(state, "  CANYON ")).toBe(true);
    expect(isDuplicateGuess(state, "Halley")).toBe(false);
  });

  it("never reports an empty guess as a duplicate", () => {
    const state = createRound(shell(), NOW);
    expect(isDuplicateGuess(state, "   ")).toBe(false);
  });
});

describe("hints", () => {
  it("costs score but no attempt, and reveals a clue", () => {
    const hinted = applyHint(createRound(shell(), NOW));
    expect(hinted.consumedAttempt).toBe(false);
    expect(hinted.state.hintsUsed).toBe(1);
    expect(hinted.state.cluesRevealed).toBe(2);
    expect(hinted.state.attemptsUsed).toBe(0);
    expect(scoreOf(hinted.state)).toBe(80);
  });

  it("cannot be used more often than the puzzle allows", () => {
    const once = applyHint(createRound(shell(), NOW)).state;
    const twice = applyHint(once);
    expect(twice.consumedAttempt).toBe(false);
    expect(twice.state.hintsUsed).toBe(1);
    expect(hasHintsLeft(twice.state)).toBe(false);
  });

  it("cannot be used on a finished round", () => {
    const finished = applyGiveUp(createRound(shell(), NOW), NOW).state;
    expect(applyHint(finished).state).toBe(finished);
  });

  it("never reveals more clues than exist", () => {
    const oneClue = createRound(shell({ clueCount: 1 }), NOW);
    const hinted = applyHint(oneClue).state;
    expect(hinted.cluesRevealed).toBe(1);
  });
});

describe("end conditions", () => {
  it("giving up costs no attempt, reveals the answer, and scores zero", () => {
    const result = applyGiveUp(createRound(shell(), NOW), NOW);
    expect(result.consumedAttempt).toBe(false);
    expect(result.newlyFinished).toBe(true);
    expect(result.state.outcome).toBe("gave_up");
    expect(allCluesRevealed(result.state)).toBe(true);
    expect(scoreOf(result.state)).toBe(0);
  });

  it("an interrupted daily round expires without consuming an attempt", () => {
    const result = applyExpired(createRound(shell(), NOW), NOW + 1000);
    expect(result.consumedAttempt).toBe(false);
    expect(result.state.outcome).toBe("expired");
    expect(scoreOf(result.state)).toBe(0);
  });
});

describe("score", () => {
  it("deducts ten per incorrect guess and twenty per hint", () => {
    let state = createRound(shell(), NOW);
    state = applyHint(state).state;
    state = applyIncorrectGuess(state, "one", NOW).state;
    state = applyIncorrectGuess(state, "two", NOW).state;
    expect(scoreOf(state)).toBe(60);
  });

  it("never goes below zero", () => {
    let state = createRound(shell({ attemptsAllowed: 20 }), NOW);
    for (let i = 0; i < 20; i += 1) state = applyIncorrectGuess(state, `wrong${i}`, NOW).state;
    expect(scoreOf(state)).toBe(0);
  });
});
