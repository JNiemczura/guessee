import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { insertPuzzle } from "@/db/seed";
import { SCHEMA_SQL } from "@/db/schema";
import { GAME_ID, type Puzzle } from "@/lib/types";
import { checkCoverage, MINIMUM_BUFFER_DAYS, sendCoverageAlert, type CoverageAlert } from "./alerting";

const NOW = new Date("2026-01-10T09:00:00.000Z");

let db: Database.Database;

function daily(dateKey: string, overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: `pc-${dateKey}`,
    gameId: GAME_ID,
    kind: "daily",
    scheduledDate: dateKey,
    language: "en",
    category: "Science",
    answer: "Penicillin",
    aliases: [],
    clues: ["One clue.", "Another clue.", "A third clue."],
    explanation: "Because.",
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

/** 2026-01-10 is `now`, so day N is `2026-01-(10 + N)`. */
function dateFor(offset: number): string {
  const day = new Date(NOW);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  db = new Database(":memory:");
  db.exec(SCHEMA_SQL);
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

describe("checkCoverage", () => {
  it("is clear when every day in the window has a reviewed puzzle", () => {
    for (let offset = 0; offset < 14; offset += 1) insertPuzzle(db, daily(dateFor(offset)));

    const alert = checkCoverage(db, { now: NOW });
    expect(alert.status).toBe("ok");
    expect(alert.missing).toEqual([]);
    expect(alert.coveredAhead).toBe(14);
  });

  it("names the exact days that have no puzzle", () => {
    for (let offset = 0; offset < 14; offset += 1) {
      if (offset !== 2 && offset !== 5) insertPuzzle(db, daily(dateFor(offset)));
    }

    const alert = checkCoverage(db, { now: NOW });
    expect(alert.status).toBe("missing_puzzles");
    expect(alert.missing.map((day) => day.dateKey)).toEqual([dateFor(2), dateFor(5)]);
    expect(alert.message).toContain(dateFor(2));
  });

  it("counts a scheduled puzzle as covered, since it publishes itself", () => {
    for (let offset = 0; offset < 14; offset += 1) {
      const scheduled = offset > 0;
      insertPuzzle(
        db,
        daily(dateFor(offset), {
          status: scheduled ? "scheduled" : "published",
          publishedAt: scheduled ? null : NOW.toISOString(),
        }),
      );
    }

    expect(checkCoverage(db, { now: NOW }).status).toBe("ok");
  });

  it("ignores a draft, a review, and a retired puzzle", () => {
    for (let offset = 0; offset < 14; offset += 1) {
      const status = offset === 3 ? "in_review" : offset === 7 ? "retired" : "published";
      insertPuzzle(
        db,
        daily(dateFor(offset), { status, publishedAt: status === "published" ? NOW.toISOString() : null }),
      );
    }

    const alert = checkCoverage(db, { now: NOW });
    expect(alert.missing.map((day) => day.dateKey)).toEqual([dateFor(3), dateFor(7)]);
  });

  it("warns when the buffer is thinner than the minimum even with no day missing", () => {
    for (let offset = 0; offset < 4; offset += 1) insertPuzzle(db, daily(dateFor(offset)));

    // A 4-day window with no gaps, but the schedule runs out before the
    // 7-day minimum buffer: the launch is not safe yet.
    const alert = checkCoverage(db, {
      now: NOW,
      days: 4,
      minimumBuffer: MINIMUM_BUFFER_DAYS,
    });
    expect(alert.missing).toEqual([]);
    expect(alert.coveredAhead).toBe(4);
    expect(alert.status).toBe("missing_puzzles");
    expect(alert.message).toContain("below the 7-day buffer");
  });

  it("accepts a thin buffer when the operator sets a smaller minimum", () => {
    for (let offset = 0; offset < 4; offset += 1) insertPuzzle(db, daily(dateFor(offset)));

    const alert = checkCoverage(db, { now: NOW, days: 4, minimumBuffer: 3 });
    expect(alert.status).toBe("ok");
  });

  it("never includes an answer, a clue, or a category in the payload", () => {
    insertPuzzle(db, daily(dateFor(0)));
    const serialised = JSON.stringify(checkCoverage(db, { now: NOW }));
    expect(serialised).not.toContain("Penicillin");
    expect(serialised).not.toContain("One clue.");
  });

  it("counts dated dailies that are authored but still unreviewed", () => {
    for (let offset = 0; offset < 3; offset += 1) insertPuzzle(db, daily(dateFor(offset)));
    for (const offset of [3, 4, 5]) {
      insertPuzzle(db, daily(dateFor(offset), { status: "in_review", publishedAt: null }));
    }

    const alert = checkCoverage(db, { now: NOW });
    expect(alert.awaitingReview).toBe(3);
    expect(alert.coveredAhead).toBe(3);
    expect(alert.message).toContain("3 daily puzzles are authored and dated ahead");
  });

  it("does not count a review-queue puzzle in the past, or one with no date", () => {
    insertPuzzle(db, daily(dateFor(-1), { status: "in_review", publishedAt: null }));
    insertPuzzle(
      db,
      daily("pc-unscheduled", { scheduledDate: null, status: "in_review", publishedAt: null }),
    );

    expect(checkCoverage(db, { now: NOW }).awaitingReview).toBe(0);
  });
});

describe("sendCoverageAlert", () => {
  const missing: CoverageAlert = {
    status: "missing_puzzles",
    checkedDays: 14,
    missing: [{ dateKey: "2026-01-12", label: "12 Jan 2026" }],
    minimumBufferDays: 7,
    coveredAhead: 2,
    awaitingReview: 5,
    message: "Guessee content alert: 12 days without a reviewed puzzle.",
  };

  const clear: CoverageAlert = { ...missing, status: "ok", missing: [], coveredAhead: 14, message: "clear", awaitingReview: 0 };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts Slack and Discord compatible text to the configured webhook", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendCoverageAlert("https://hooks.example.com/abc", missing);

    expect(result).toEqual({ sent: true, status: 200 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.example.com/abc");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ text: missing.message });
  });

  it("reports a failed delivery instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(sendCoverageAlert("https://hooks.example.com/abc", missing)).resolves.toEqual({
      sent: false,
      status: 500,
    });
  });

  it("stays quiet when coverage is fine", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendCoverageAlert("https://hooks.example.com/abc", clear)).resolves.toEqual({
      sent: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when no webhook is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendCoverageAlert(undefined, missing)).resolves.toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
