import { describe, expect, it } from "vitest";

import { buildShareText } from "./share";
import { GAME_LABEL, HUB_LABEL } from "./types";

const base = {
  dateKey: "2026-01-01",
  mode: "daily" as const,
  label: GAME_LABEL,
  category: "Science",
  outcome: "correct" as const,
  attemptsUsed: 2,
  attemptsAllowed: 5,
  hintsUsed: 0,
  score: 80,
  url: "https://guessee.example/play?date=2026-01-01",
};

describe("buildShareText", () => {
  it("identifies the game and the puzzle day", () => {
    const text = buildShareText(base);
    expect(text).toContain(HUB_LABEL);
    expect(text).toContain("2026-01-01");
  });

  it("reports the outcome, attempt count, and score", () => {
    const text = buildShareText(base);
    expect(text).toContain("Solved");
    expect(text).toContain("2nd of 5 guesses");
    expect(text).toContain("80 pts");
  });

  it("mentions hints in plain ordinal form", () => {
    const text = buildShareText({ ...base, hintsUsed: 1 });
    expect(text).toContain("1st hint");
  });

  it("labels a practice round instead of inventing a date", () => {
    const text = buildShareText({ ...base, dateKey: null, mode: "practice", outcome: "gave_up" });
    expect(text).toContain("(practice)");
    expect(text).toContain("Gave up");
  });

  it("marks an archive replay so it cannot read as an official daily result", () => {
    const text = buildShareText({ ...base, mode: "replay" });
    expect(text).toContain("2026-01-01 (replay)");
  });

  it("never includes the answer, a guess, or clue text", () => {
    const text = buildShareText({ ...base, category: "Science" });
    expect(text.toLowerCase()).not.toContain("penicillin");
    expect(text).not.toContain("mould");
  });

  it("ends with a playable link", () => {
    expect(buildShareText(base).split("\n")).toHaveLength(3);
    expect(buildShareText(base)).toContain(base.url);
  });
});
