import { describe, expect, it } from "vitest";

import { addUtcDays } from "./dates";
import type { Puzzle } from "./types";
import {
  draftIdForDate,
  firstUncoveredDate,
  occupyingDateKeys,
  planForwardPlacement,
} from "./forwardBuffer";

const TODAY = "2026-01-10";

const day = (offset: number) => addUtcDays(TODAY, offset);

function plan(overrides: Partial<Parameters<typeof planForwardPlacement>[0]> = {}) {
  return planForwardPlacement({
    today: TODAY,
    liveDates: [],
    queued: [],
    newSeeds: [],
    ...overrides,
  });
}

describe("planForwardPlacement", () => {
  it("gives an unreviewed puzzle today when nothing else covers it", () => {
    // Starting the fill on tomorrow would leave today with no puzzle at all.
    const result = plan({ newSeeds: [{ key: "a", answer: "A" }] });
    expect(result.get("a")).toBe(TODAY);
  });

  it("starts on tomorrow when something live already covers today", () => {
    const result = plan({
      liveDates: [TODAY],
      newSeeds: [{ key: "a", answer: "A" }],
    });
    expect(result.get("a")).toBe(day(1));
  });

  it("fills consecutive days and leaves no hole", () => {
    const result = plan({
      newSeeds: ["a", "b", "c"].map((key) => ({ key, answer: key.toUpperCase() })),
    });

    expect([...result.values()]).toEqual([TODAY, day(1), day(2)]);
    expect(firstUncoveredDate({ today: TODAY, liveDates: [], plan: result })).toBe(day(3));
  });

  it("steps over a day a live puzzle holds", () => {
    const result = plan({
      liveDates: [TODAY, day(2)],
      newSeeds: ["a", "b", "c"].map((key) => ({ key, answer: key.toUpperCase() })),
    });

    expect([...result.values()]).toEqual([day(1), day(3), day(4)]);
  });

  it("never lands two puzzles on the same day", () => {
    const result = plan({
      liveDates: [TODAY, day(1), day(2), day(3)],
      newSeeds: ["a", "b", "c"].map((key) => ({ key, answer: key.toUpperCase() })),
    });

    const dates = [...result.values()];
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates).toEqual([day(4), day(5), day(6)]);
  });

  it("is idempotent: re-running against the same live dates changes nothing", () => {
    // This is the real re-run case. The queue's own dates do not reserve days,
    // so the second pass must reproduce the first exactly.
    const first = plan({ newSeeds: ["a", "b", "c"].map((key) => ({ key, answer: key.toUpperCase() })) });
    const second = plan({
      queued: [...first.entries()].map(([key, scheduledDate]) => ({ key, answer: key, scheduledDate })),
      newSeeds: [],
    });

    expect(Object.fromEntries(second)).toEqual(Object.fromEntries(first));
  });

  it("is stable once a live puzzle has taken today", () => {
    const first = plan({
      liveDates: [TODAY],
      newSeeds: ["a", "b"].map((key) => ({ key, answer: key.toUpperCase() })),
    });
    const second = plan({
      liveDates: [TODAY],
      queued: [...first.entries()].map(([key, scheduledDate]) => ({ key, answer: key, scheduledDate })),
      newSeeds: [],
    });

    expect(Object.fromEntries(second)).toEqual(Object.fromEntries(first));
    expect([...first.values()]).toEqual([day(1), day(2)]);
  });

  it("reflows a queue whose dates have drifted, into the holes", () => {
    // A queue authored against an older "today" has drifted forward and left a
    // gap behind it. Placing must reuse the gap, not stack up after itself.
    const result = plan({
      liveDates: [day(-2), day(-1)],
      queued: [
        { key: "a", answer: "A", scheduledDate: day(3) },
        { key: "b", answer: "B", scheduledDate: day(4) },
      ],
      newSeeds: [],
    });

    expect([...result.values()]).toEqual([TODAY, day(1)]);
    expect(firstUncoveredDate({ today: TODAY, liveDates: [day(-2), day(-1)], plan: result })).toBe(day(2));
  });

  it("keeps going past a live run of days without stopping", () => {
    const result = plan({
      liveDates: Array.from({ length: 20 }, (_, index) => addUtcDays(TODAY, index - 10)),
      newSeeds: [{ key: "a", answer: "A" }],
    });

    expect(result.get("a")).toBe(day(10));
  });
});

describe("draftIdForDate", () => {
  it("uses the conventional id when it is free", () => {
    expect(draftIdForDate("2026-10-12")).toBe("pc-2026-10-12");
    expect(draftIdForDate("2026-10-12", ["pc-2026-09-30"])).toBe("pc-2026-10-12");
  });

  it("steps aside when a re-placed row already holds the id", () => {
    // Simpson's paradox keeps the id it was minted with, but now sits on an
    // earlier date, so 2026-10-12 is both uncovered and an occupied id.
    expect(draftIdForDate("2026-10-12", ["pc-2026-10-12"])).toBe("pc-2026-10-12-2");
  });

  it("keeps stepping past a run of suffixed ids", () => {
    const taken = ["pc-2026-10-12", "pc-2026-10-12-2", "pc-2026-10-12-3"];
    expect(draftIdForDate("2026-10-12", taken)).toBe("pc-2026-10-12-4");
  });
});

describe("occupyingDateKeys", () => {
  const row = (over: Partial<Puzzle> = {}) => ({
    kind: "daily" as const,
    status: "scheduled" as const,
    scheduledDate: "2026-10-04",
    ...over,
  });

  it("treats scheduled, published and corrected as holding their date", () => {
    const dates = occupyingDateKeys([
      row({ status: "scheduled" }),
      row({ status: "published", scheduledDate: "2026-10-05" }),
      row({ status: "corrected", scheduledDate: "2026-10-06" }),
    ]);
    expect(dates).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
  });

  it("releases the date of a retired daily, so the hole can be refilled", () => {
    // Retiring is how a reviewed puzzle is pulled. If the date stayed occupied,
    // the planner would step over the vacated day and the hole would never be
    // filled, leaving coverage permanently short.
    expect(occupyingDateKeys([row({ status: "retired" })])).toEqual([]);
  });

  it("releases the date of an unreviewed daily, which the planner may move", () => {
    expect(occupyingDateKeys([row({ status: "draft" })])).toEqual([]);
    expect(occupyingDateKeys([row({ status: "in_review" })])).toEqual([]);
    expect(occupyingDateKeys([row({ status: "playtested" })])).toEqual([]);
  });

  it("ignores practice rows, which share no date with a daily", () => {
    expect(occupyingDateKeys([row({ kind: "practice" })])).toEqual([]);
  });

  it("ignores rows with no date", () => {
    expect(occupyingDateKeys([row({ scheduledDate: null })])).toEqual([]);
    expect(occupyingDateKeys([row({ scheduledDate: undefined })])).toEqual([]);
  });

  it("lets a planner refill a retired day", () => {
    const plan = planForwardPlacement({
      today: "2026-10-04",
      liveDates: occupyingDateKeys([row({ status: "retired" })]),
      queued: [],
      newSeeds: [{ key: "new", answer: "new" }],
    });
    expect(plan.get("new")).toBe("2026-10-04");
  });
});