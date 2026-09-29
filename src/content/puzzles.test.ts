import { describe, expect, it } from "vitest";

import { addUtcDays, todayUtc } from "@/lib/dates";
import { normalizeGuess } from "@/lib/normalize";
import { validatePuzzle, errorsOf, warningsOf } from "@/lib/validatePuzzle";
import { COVERAGE_DAYS, MINIMUM_BUFFER_DAYS } from "@/server/alerting";
import { buildSeedPuzzles, type SeedPuzzle } from "./puzzles";

const NOW = new Date("2026-01-10T09:00:00.000Z");
const TODAY = todayUtc(NOW);
const seeds = buildSeedPuzzles(NOW);

/** The validator wants a full `Puzzle`; a seed plus its known defaults is one. */
function asPuzzle(seed: SeedPuzzle) {
  return {
    ...seed,
    gameId: "guessee",
    language: "en",
    correctionNote: null,
    revision: 1,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    publishedAt: null,
  };
}

describe("shipped content", () => {
  it("never asserts a review that no human performed", () => {
    // A reviewer name and a ticked ambiguity check are the record of a second
    // person signing a puzzle off. Shipping a seed that carries them invents
    // that person and that sign-off, and because a published puzzle is the one
    // a player can actually see, the claim outlives the code. Only a real
    // review may fill these in, so nothing in the seed may.
    for (const seed of seeds) {
      expect({ id: seed.id, reviewer: seed.reviewer }).toEqual({ id: seed.id, reviewer: null });
      expect(seed.ambiguityCheckedAt).toBeNull();
    }
  });

  it("is free of validation errors, treating the review gate as expected", () => {
    const failures = seeds.flatMap((seed) =>
      errorsOf(validatePuzzle(asPuzzle(seed), seeds.map(asPuzzle)))
        // A puzzle in review is *supposed* to fail these two. They are the
        // human sign-off, and asserting them here would only assert that we
        // did not fake it.
        .filter((issue) => issue.code !== "reviewer_missing" && issue.code !== "ambiguity_unchecked")
        .map((issue) => `${seed.id} ${issue.field} ${issue.code}: ${issue.message}`),
    );

    expect(failures).toEqual([]);
  });

  it("has no warnings that would embarrass us in front of a player", () => {
    const warnings = seeds.flatMap((seed) =>
      warningsOf(validatePuzzle(asPuzzle(seed), seeds.map(asPuzzle)))
        // A daily that is in review shares its answer and clues with nothing
        // else, so this is only ever a self-comparison artefact; the reuse
        // warnings are covered properly by the test below.
        .filter((issue) => issue.code !== "answer_reused" && issue.code !== "clue_reused")
        .map((issue) => `${seed.id} ${issue.field} ${issue.code}: ${issue.message}`),
    );

    expect(warnings).toEqual([]);
  });

  it("never reuses an answer across the catalogue", () => {
    const byAnswer = new Map<string, string[]>();
    for (const seed of seeds) {
      const key = normalizeGuess(seed.answer);
      byAnswer.set(key, [...(byAnswer.get(key) ?? []), seed.id]);
    }

    const duplicates = [...byAnswer.entries()].filter(([, ids]) => ids.length > 1);
    expect(duplicates).toEqual([]);
  });

  it("never reuses a first clue", () => {
    const byClue = new Map<string, string[]>();
    for (const seed of seeds) {
      const key = normalizeGuess(seed.clues[0] ?? "");
      byClue.set(key, [...(byClue.get(key) ?? []), seed.id]);
    }

    const duplicates = [...byClue.entries()].filter(([, ids]) => ids.length > 1);
    expect(duplicates).toEqual([]);
  });

  it("gives every puzzle a unique id", () => {
    expect(new Set(seeds.map((seed) => seed.id)).size).toBe(seeds.length);
  });

  it("dates exactly one published daily per day for the last week and today", () => {
    const published = seeds.filter((seed) => seed.status === "published" && seed.kind === "daily");

    expect(published).toHaveLength(8);
    for (let offset = -7; offset <= 0; offset += 1) {
      const dateKey = addUtcDays(TODAY, offset);
      expect(published.filter((seed) => seed.scheduledDate === dateKey)).toHaveLength(1);
    }
  });
});

describe("forward buffer", () => {
  const datedAhead = seeds
    .filter((seed) => seed.kind === "daily" && seed.scheduledDate && seed.scheduledDate > TODAY)
    .sort((a, b) => (a.scheduledDate! < b.scheduledDate! ? -1 : 1));
  const awaitingReview = datedAhead.filter((seed) => seed.status !== "published" && seed.status !== "scheduled");

  it("dates every forward daily", () => {
    // A forward entry missing `kind` is not a daily, so it drops out of this
    // whole block and out of the backfill, which filters on kind as well. The
    // count is the guard: an authored puzzle that never reaches the schedule
    // otherwise shows up only as a puzzling gap days later.
    const forwardDated = seeds.filter(
      (seed) => seed.scheduledDate && seed.scheduledDate > TODAY,
    );
    expect(forwardDated).toHaveLength(datedAhead.length);
    for (const seed of forwardDated) {
      expect(seed.kind).toBe("daily");
    }
  });

  it("fills every day from tomorrow through the end of the coverage window", () => {
    // The guidance asks for a two-week reviewed buffer, and the coverage alert
    // looks at a 14-day window, so the authored buffer has to span all of it.
    const window = datedAhead.slice(0, COVERAGE_DAYS - 1);
    expect(window.map((seed) => seed.scheduledDate)).toEqual(
      Array.from({ length: COVERAGE_DAYS - 1 }, (_, index) => addUtcDays(TODAY, index + 1)),
    );
  });

  it("keeps a spare day past the window, because the window slides every day", () => {
    // Tomorrow the window has rolled forward by one day, and the new far edge
    // has to be covered already or the alert goes red again immediately.
    expect(datedAhead.length).toBeGreaterThan(COVERAGE_DAYS - 1);
  });

  it("reaches both the alert's minimum and the two-week launch target", () => {
    // The alert counts today, so a seven-day buffer needs six future days. Only
    // tomorrow is reviewed, so the rest have to be signed off.
    expect(datedAhead.length + 1).toBeGreaterThanOrEqual(MINIMUM_BUFFER_DAYS);
    expect(datedAhead.length + 1).toBeGreaterThanOrEqual(COVERAGE_DAYS);
    expect(awaitingReview.length).toBeGreaterThanOrEqual(5);
  });

  it("leaves every one of them waiting on a real second reviewer", () => {
    for (const seed of awaitingReview) {
      expect(seed.reviewer).toBeNull();
      expect(seed.ambiguityCheckedAt).toBeNull();
      expect(seed.author).not.toBe("");
    }
  });

  it("keeps them out of the published schedule so players cannot see them early", () => {
    for (const seed of awaitingReview) {
      expect(seed.status).not.toBe("published");
      expect(seed.status).not.toBe("scheduled");
    }
  });

  it("dates every daily, because an undated one can never be scheduled", () => {
    const undated = seeds.filter((seed) => seed.kind === "daily" && !seed.scheduledDate);
    expect(undated.map((seed) => seed.id)).toEqual([]);
  });
});
