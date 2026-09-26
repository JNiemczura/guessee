import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { insertPuzzle } from "@/db/seed";
import { SCHEMA_SQL } from "@/db/schema";
import { GAME_ID, type Puzzle } from "@/lib/types";
import {
  giveUp,
  getReveal,
  RoundError,
  startRound,
  submitGuess,
  takeHint,
} from "./roundService";

const TODAY = "2026-01-01";
const NOW = new Date(`${TODAY}T12:00:00.000Z`);

let db: Database.Database;

function daily(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: "pc-2026-01-01",
    gameId: GAME_ID,
    kind: "daily",
    scheduledDate: TODAY,
    language: "en",
    category: "Science",
    answer: "Penicillin",
    aliases: ["Penicillium"],
    clues: [
      "It changed which bacterial infections doctors could treat.",
      "It came from a mould, not from a plant.",
      "A British doctor discovered it in 1928.",
      "It began as a lucky accident in a London lab.",
      "It was first used in mass in the 1940s.",
    ],
    explanation: "Penicillin is an antibiotic discovered by Alexander Fleming in 1928.",
    difficulty: 3,
    sourceNotes: "Common knowledge.",
    status: "published",
    attemptsAllowed: 5,
    hintsAllowed: 1,
    author: "Ada",
    reviewer: "Bo",
    ambiguityCheckedAt: NOW.toISOString(),
    correctionNote: null,
    revision: 1,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    publishedAt: NOW.toISOString(),
    ...overrides,
  };
}

function practice(overrides: Partial<Puzzle> = {}): Puzzle {
  return daily({
    id: "pc-practice-01",
    kind: "practice",
    scheduledDate: null,
    status: "published",
    publishedAt: NOW.toISOString(),
    ...overrides,
  });
}

beforeEach(() => {
  // The fixture daily is scheduled for 2026-01-01, so every round is opened
  // partway through that day and only the expiry tests move the clock.
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  insertPuzzle(db, daily());
  insertPuzzle(db, practice());
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

const SESSION = "session-abcdef123456";

describe("startRound", () => {
  it("creates a round with the first clue visible", () => {
    const round = startRound(db, "pc-2026-01-01", SESSION);
    expect(round.status).toBe("playing");
    expect(round.cluesRevealed).toBe(1);
    expect(round.attemptsUsed).toBe(0);
  });

  it("is idempotent, so a refresh does not restart the round", () => {
    const first = startRound(db, "pc-2026-01-01", SESSION);
    submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "Halley" });
    const second = startRound(db, "pc-2026-01-01", SESSION);
    expect(second.attemptsUsed).toBe(first.attemptsUsed + 1);
  });

  it("refuses a malformed session id", () => {
    expect(() => startRound(db, "pc-2026-01-01", "nope")).toThrow(RoundError);
  });

  it("refuses a puzzle that is not playable", () => {
    insertPuzzle(db, daily({ id: "pc-draft", status: "draft", scheduledDate: null }));
    expect(() => startRound(db, "pc-draft", SESSION)).toThrow(/not available to play/i);
    expect(() => startRound(db, "pc-missing", SESSION)).toThrow(/does not exist/i);
  });
});

describe("guessing", () => {
  beforeEach(() => {
    startRound(db, "pc-2026-01-01", SESSION);
  });

  it("wins on a correctly spelled answer and reveals everything", () => {
    const result = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "Penicillin",
    });
    expect(result.verdict).toBe("correct");
    expect(result.status).toBe("finished");
    expect(result.clues).toHaveLength(5);
    expect(result.score).toBe(100);
  });

  it("accepts an alias and a generated plural", () => {
    expect(
      submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "penicillium" })
        .verdict,
    ).toBe("correct");
  });

  it("costs an attempt and unlocks the next clue on a wrong guess", () => {
    const result = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "Halley",
    });
    expect(result.verdict).toBe("incorrect");
    expect(result.attemptsUsed).toBe(1);
    expect(result.clues).toHaveLength(2);
    expect(result.message).toMatch(/clue 2 unlocked/i);
  });

  it("suggests the intended spelling without accepting a typo", () => {
    const result = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "penicilin",
    });
    expect(result.verdict).toBe("incorrect");
    expect(result.message).toContain("penicillin");
  });

  it("rejects a repeated guess without costing an attempt", () => {
    submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "Halley" });
    const repeat = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "  halley ",
    });
    expect(repeat.verdict).toBe("rejected");
    expect(repeat.reason).toBe("duplicate");
    expect(repeat.attemptsUsed).toBe(1);
  });

  it("rejects empty, non-string, and overlong input without costing an attempt", () => {
    expect(
      submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "  " }).reason,
    ).toBe("empty");
    expect(
      submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: 42 }).reason,
    ).toBe("not_a_string");
    expect(
      submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "x".repeat(200) })
        .reason,
    ).toBe("too_long");

    const state = startRound(db, "pc-2026-01-01", SESSION);
    expect(state.attemptsUsed).toBe(0);
  });

  it("ends the round when the last attempt is used", () => {
    for (const guess of ["Halley", "Morse", "Babbage", "Turing"]) {
      submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess });
    }
    const last = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "Hopper",
    });
    expect(last.verdict).toBe("incorrect");
    expect(last.status).toBe("finished");
    expect(last.outcome).toBe("attempts_exhausted");
    expect(last.score).toBe(50);
  });

  it("refuses further guesses once the round is over", () => {
    giveUp(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    const after = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "Penicillin",
    });
    expect(after.verdict).toBe("rejected");
    expect(after.reason).toBe("round_over");
  });

  it("refuses to guess in a round that was never started", () => {
    expect(() =>
      submitGuess(db, {
        sessionId: "other-session-123456",
        puzzleId: "pc-2026-01-01",
        guess: "Halley",
      }),
    ).toThrow(/start the round/i);
  });
});

describe("hints", () => {
  it("reveals a clue, costs score, and costs no attempt", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    const hint = takeHint(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(hint.ok).toBe(true);
    expect(hint.cluesRevealed).toBe(2);
    expect(hint.scorePreview).toBe(80);
  });

  it("cannot be used twice when the puzzle allows one", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    takeHint(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(takeHint(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" })).toMatchObject({
      ok: false,
    });
  });

  it("does not consume an attempt", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    const hint = takeHint(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(hint.cluesRevealed).toBe(2);
    expect(getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" })).toBeNull();
  });
});

describe("reveal gating", () => {
  it("withholds the answer until the round is finished", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    expect(getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" })).toBeNull();

    submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "Penicillin" });

    const reveal = getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(reveal?.answer).toBe("Penicillin");
    expect(reveal?.outcome).toBe("correct");
    expect(reveal?.clues).toHaveLength(5);
  });

  it("is per session, so another player cannot read the answer", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "Penicillin" });
    expect(
      getReveal(db, { sessionId: "another-session-9876", puzzleId: "pc-2026-01-01" }),
    ).toBeNull();
  });

  it("is available after giving up, with a zero score", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    giveUp(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    const reveal = getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(reveal?.outcome).toBe("gave_up");
    expect(reveal?.score).toBe(0);
    expect(reveal?.explanation).toContain("Fleming");
  });
});

describe("daily expiry", () => {
  it("closes an interrupted daily round once the next reset has passed", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    vi.setSystemTime(new Date("2026-01-02T00:00:01.000Z"));

    const resumed = startRound(db, "pc-2026-01-01", SESSION);
    expect(resumed.status).toBe("finished");
    expect(resumed.outcome).toBe("expired");

    const reveal = getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(reveal?.outcome).toBe("expired");
    expect(reveal?.score).toBe(0);
    expect(reveal?.answer).toBe("Penicillin");
  });

  it("keeps the round open right up to the reset", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    vi.setSystemTime(new Date("2026-01-01T23:59:59.000Z"));

    expect(startRound(db, "pc-2026-01-01", SESSION).status).toBe("playing");
  });

  it("never expires a practice round", () => {
    startRound(db, "pc-practice-01", SESSION);
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));

    const resumed = startRound(db, "pc-practice-01", SESSION);
    expect(resumed.status).toBe("playing");
    expect(resumed.outcome).toBeNull();
  });

  it("refuses guesses on an expired round", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    vi.setSystemTime(new Date("2026-01-02T00:00:01.000Z"));

    const result = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "Penicillin",
    });
    expect(result.verdict).toBe("rejected");
    expect(result.reason).toBe("round_over");
  });
});

describe("archive replay", () => {
  it("stays playable when the day is already over, so no answer is revealed", () => {
    vi.setSystemTime(new Date("2026-01-09T09:00:00.000Z"));

    const round = startRound(db, "pc-2026-01-01", SESSION);
    expect(round.status).toBe("playing");
    expect(round.outcome).toBeNull();
    expect(getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" })).toBeNull();

    const first = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "Halley",
    });
    expect(first.verdict).toBe("incorrect");
    expect(first.clues).toHaveLength(2);
  });

  it("plays to a normal finish and can then be revealed", () => {
    vi.setSystemTime(new Date("2026-01-09T09:00:00.000Z"));
    startRound(db, "pc-2026-01-01", SESSION);

    submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "Penicillin" });
    const reveal = getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" });
    expect(reveal?.outcome).toBe("correct");
    expect(reveal?.score).toBe(100);
  });

  it("never expires, however much later it is resumed", () => {
    vi.setSystemTime(new Date("2026-01-09T09:00:00.000Z"));
    startRound(db, "pc-2026-01-01", SESSION);

    vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"));
    expect(startRound(db, "pc-2026-01-01", SESSION).status).toBe("playing");
  });

  it("leaves the official round of a day alone", () => {
    // Opened during its own day, so the reset still closes it.
    startRound(db, "pc-2026-01-01", SESSION);
    vi.setSystemTime(new Date("2026-01-02T00:00:01.000Z"));

    expect(startRound(db, "pc-2026-01-01", SESSION).outcome).toBe("expired");
  });

  it("discards a replay row that an earlier build expired on creation", () => {
    vi.setSystemTime(new Date("2026-01-09T09:00:00.000Z"));
    const stale = startRound(db, "pc-2026-01-01", SESSION);

    // Exactly what the old rule wrote: a replay marked expired, no guesses.
    db.prepare(
      `UPDATE rounds SET status = 'finished', outcome = 'expired', finished_at = ?, score = 0
       WHERE session_id = ? AND puzzle_id = ?`,
    ).run(new Date("2026-01-02T00:00:00.000Z").getTime(), SESSION, "pc-2026-01-01");
    expect(stale.status).toBe("playing");

    const recovered = startRound(db, "pc-2026-01-01", SESSION);
    expect(recovered.status).toBe("playing");
    expect(recovered.outcome).toBeNull();
    expect(recovered.attemptsUsed).toBe(0);
    expect(getReveal(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01" })).toBeNull();
  });

  it("clears the stale guess hashes with the discarded row", () => {
    vi.setSystemTime(new Date("2026-01-09T09:00:00.000Z"));
    startRound(db, "pc-2026-01-01", SESSION);
    submitGuess(db, { sessionId: SESSION, puzzleId: "pc-2026-01-01", guess: "Halley" });

    db.prepare(
      `UPDATE rounds SET status = 'finished', outcome = 'expired' WHERE session_id = ? AND puzzle_id = ?`,
    ).run(SESSION, "pc-2026-01-01");

    startRound(db, "pc-2026-01-01", SESSION);
    const guesses = db
      .prepare("SELECT COUNT(*) AS n FROM round_guesses WHERE session_id = ? AND puzzle_id = ?")
      .get(SESSION, "pc-2026-01-01") as { n: number };
    expect(guesses.n).toBe(0);
  });
});

describe("withheld content", () => {
  it("never returns more clues than the player has unlocked", () => {
    startRound(db, "pc-2026-01-01", SESSION);
    const first = submitGuess(db, {
      sessionId: SESSION,
      puzzleId: "pc-2026-01-01",
      guess: "not the answer",
    });
    expect(first.clues).toHaveLength(2);
  });
});
