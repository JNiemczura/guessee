import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SCHEMA_SQL } from "@/db/schema";
import {
  countErrorsSince,
  MAX_DETAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  normalizeError,
  pruneErrors,
  recentErrors,
  recordError,
} from "./errorLog";

const NOW = new Date("2026-01-10T09:00:00.000Z");

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(SCHEMA_SQL);
});

afterEach(() => {
  db.close();
});

describe("recordError", () => {
  it("stores a client error with its context label", () => {
    recordError(
      db,
      { source: "client", context: "round.guess", message: "Failed to fetch" },
      new Date("2026-01-10T09:00:00.000Z"),
    );

    const [row] = recentErrors(db);
    expect(row.source).toBe("client");
    expect(row.context).toBe("round.guess");
    expect(row.message).toBe("Failed to fetch");
    expect(row.detail).toBeNull();
  });

  it("returns errors newest first", () => {
    recordError(db, { source: "server", context: "a", message: "first" }, new Date("2026-01-10T09:00:00Z"));
    recordError(db, { source: "server", context: "b", message: "second" }, new Date("2026-01-10T10:00:00Z"));

    expect(recentErrors(db).map((row) => row.message)).toEqual(["second", "first"]);
  });

  it("clamps an absurdly long message and stack", () => {
    recordError(db, {
      source: "client",
      context: "c",
      message: "x".repeat(5_000),
      detail: "y".repeat(9_000),
    });

    const [row] = recentErrors(db);
    expect(row.message).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(row.detail).toHaveLength(MAX_DETAIL_LENGTH);
  });

  it("flattens whitespace so a multi-line stack stays one log line", () => {
    recordError(db, {
      source: "client",
      context: "c",
      message: "boom",
      detail: "line one\n   line two\tline three",
    });

    expect(recentErrors(db)[0].detail).toBe("line one line two line three");
  });

  it("defaults an unknown source to client and a missing context to unknown", () => {
    recordError(db, { source: "bogus" as never, context: "", message: "m" });

    const [row] = recentErrors(db);
    expect(row.source).toBe("client");
    expect(row.context).toBe("unknown");
  });

  it("honours the limit and never returns more than the cap", () => {
    for (let index = 0; index < 12; index += 1) {
      recordError(db, { source: "client", context: "c", message: `m${index}` }, new Date(2026, 0, 10, 9, index));
    }

    expect(recentErrors(db, 5)).toHaveLength(5);
    expect(recentErrors(db, 5_000)).toHaveLength(12);
  });
});

describe("countErrorsSince", () => {
  it("counts only what falls inside the window", () => {
    recordError(db, { source: "client", context: "c", message: "old" }, new Date("2026-01-01T00:00:00Z"));
    recordError(db, { source: "client", context: "c", message: "new" }, new Date("2026-01-10T08:00:00Z"));

    const since = new Date("2026-01-10T00:00:00.000Z");
    expect(countErrorsSince(db, since, NOW)).toBe(1);
  });

  it("returns zero for a quiet period", () => {
    expect(countErrorsSince(db, NOW, NOW)).toBe(0);
  });
});

describe("pruneErrors", () => {
  it("drops rows older than the retention window and keeps the rest", () => {
    recordError(db, { source: "client", context: "c", message: "ancient" }, new Date("2025-01-01T00:00:00Z"));
    recordError(db, { source: "client", context: "c", message: "recent" }, new Date("2026-01-09T00:00:00Z"));

    const removed = pruneErrors(db, 30, NOW);
    expect(removed).toBe(1);
    expect(recentErrors(db).map((row) => row.message)).toEqual(["recent"]);
  });
});

describe("normalizeError", () => {
  it("keeps a short message intact and timestamps the row", () => {
    const row = normalizeError({ source: "server", context: "request /play", message: "boom" }, NOW);
    expect(row.message).toBe("boom");
    expect(row.created_at).toBe("2026-01-10T09:00:00.000Z");
    expect(row.session_id).toBeNull();
  });

  it("truncates to the cap with an ellipsis", () => {
    const row = normalizeError(
      { source: "client", context: "c", message: "a".repeat(MAX_MESSAGE_LENGTH + 50) },
      NOW,
    );
    expect(row.message).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(row.message.endsWith("…")).toBe(true);
  });

  it("leaves a message at exactly the cap untouched", () => {
    const exact = "b".repeat(MAX_MESSAGE_LENGTH);
    expect(normalizeError({ source: "client", context: "c", message: exact }, NOW).message).toBe(exact);
  });

  it("never leaves half of an emoji behind when cutting", () => {
    const emoji = "\u{1F600}";
    // Position the emoji so the cap lands between its two surrogate halves.
    const message = "a".repeat(MAX_MESSAGE_LENGTH - 1) + emoji + "tail";
    const row = normalizeError({ source: "client", context: "c", message }, NOW);

    expect(row.message).not.toMatch(/[\uD800-\uDBFF]$/);
    expect(row.message.endsWith("…")).toBe(true);
    expect(row.message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
  });
});
