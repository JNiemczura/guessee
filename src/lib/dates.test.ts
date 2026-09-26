import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  isDateKey,
  isPastUtcDate,
  nextResetAtUtc,
  recentUtcDateKeys,
  resetAtUtcFor,
  todayUtc,
} from "./dates";

describe("isDateKey", () => {
  it("accepts a real UTC calendar day", () => {
    expect(isDateKey("2026-01-01")).toBe(true);
  });

  it("rejects malformed or impossible keys", () => {
    expect(isDateKey("2026-1-1")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
    expect(isDateKey(20260101)).toBe(false);
  });
});

describe("todayUtc", () => {
  it("uses the UTC day even when the local day differs", () => {
    // 23:30 UTC on the 1st is still the 1st, whatever the operator's timezone.
    expect(todayUtc(new Date("2026-01-01T23:30:00.000Z"))).toBe("2026-01-01");
    expect(todayUtc(new Date("2026-01-02T00:00:00.000Z"))).toBe("2026-01-02");
  });
});

describe("isPastUtcDate", () => {
  const now = new Date("2026-01-03T06:00:00.000Z");

  it("is true once a puzzle's own day has ended", () => {
    expect(isPastUtcDate("2026-01-01", now)).toBe(true);
    expect(isPastUtcDate("2026-01-02", now)).toBe(true);
  });

  it("is false for today and for anything ahead", () => {
    expect(isPastUtcDate("2026-01-03", now)).toBe(false);
    expect(isPastUtcDate("2026-01-04", now)).toBe(false);
  });
});

describe("addUtcDays", () => {
  it("rolls over month and year boundaries", () => {
    expect(addUtcDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addUtcDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addUtcDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("recentUtcDateKeys", () => {
  it("returns today first, then earlier days", () => {
    expect(recentUtcDateKeys(3, new Date("2026-01-03T06:00:00.000Z"))).toEqual([
      "2026-01-03",
      "2026-01-02",
      "2026-01-01",
    ]);
  });
});

describe("reset boundaries", () => {
  it("the next reset is the following midnight UTC", () => {
    const next = nextResetAtUtc(new Date("2026-01-01T23:59:59.000Z"));
    expect(next.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("is exactly midnight UTC on the puzzle's own day", () => {
    expect(resetAtUtcFor("2026-01-01").toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});
