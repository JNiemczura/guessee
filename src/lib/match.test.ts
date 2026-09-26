import { describe, expect, it } from "vitest";

import { levenshtein, matchGuess, suggestionThreshold } from "./match";

describe("levenshtein", () => {
  it("counts single edits", () => {
    expect(levenshtein("penicillin", "penicilin")).toBe(1);
    expect(levenshtein("halley", "h alley")).toBe(1);
  });

  it("abandons early once the budget is exceeded", () => {
    expect(levenshtein("short", "a much longer phrase", 1)).toBeGreaterThan(1);
  });
});

describe("suggestionThreshold", () => {
  it("allows one edit for short words and two for longer ones", () => {
    expect(suggestionThreshold(5)).toBe(1);
    expect(suggestionThreshold(6)).toBe(2);
  });
});

describe("matchGuess", () => {
  it("accepts the canonical answer regardless of case or accents", () => {
    expect(matchGuess("  Penicillin ", "penicillin").correct).toBe(true);
    expect(matchGuess("CAFE", "café").correct).toBe(true);
  });

  it("accepts an editor alias", () => {
    expect(matchGuess("Dickens novel", "Great Expectations", ["Dickens novel"]).correct).toBe(true);
  });

  it("accepts a generated plural in both directions", () => {
    expect(matchGuess("cities", "city").correct).toBe(true);
    expect(matchGuess("city", "cities").correct).toBe(true);
  });

  it("rejects a near miss but suggests the intended spelling", () => {
    const result = matchGuess("penicilin", "penicillin");
    expect(result.correct).toBe(false);
    expect(result.suggestion).toBe("penicillin");
  });

  it("does not suggest anything for a guess that is far away", () => {
    const result = matchGuess("zzzzzzz", "penicillin");
    expect(result.correct).toBe(false);
    expect(result.suggestion).toBeNull();
  });

  it("rejects an empty or punctuation-only guess", () => {
    expect(matchGuess("   ", "penicillin")).toEqual({
      correct: false,
      matchedForm: null,
      suggestion: null,
    });
    expect(matchGuess("!!!", "penicillin").correct).toBe(false);
  });

  it("only accepts typos when the policy is explicitly switched on", () => {
    const strict = matchGuess("penicilin", "penicillin");
    expect(strict.correct).toBe(false);

    const lenient = matchGuess("penicilin", "penicillin", [], { acceptTypos: true });
    expect(lenient.correct).toBe(true);
  });
});
