import type { Db } from "@/db/client";
import { dailyCoverage, type MissingDay } from "@/db/queries";
import { formatUtcDate, todayUtc } from "@/lib/dates";

/**
 * Missing-puzzle alert (launch gate in the product guidance).
 *
 * A daily game that silently skips a day is the failure mode that loses an
 * audience, so coverage is checked on a schedule by something outside this app.
 * The payload names days and counts only: it never carries an answer, a clue,
 * or any other unreleased content.
 */
export const COVERAGE_DAYS = 14;

export type CoverageAlert = {
  status: "ok" | "missing_puzzles";
  checkedDays: number;
  missing: { dateKey: string; label: string }[];
  /** Below this many reviewed days ahead, the buffer is not safe. */
  minimumBufferDays: number;
  coveredAhead: number;
  /** Dailies already authored and dated ahead, still waiting on a reviewer. */
  awaitingReview: number;
  message: string;
};

export const MINIMUM_BUFFER_DAYS = 7;

/**
 * Counts dated dailies that are authored but not yet schedulable. They do not
 * count as covered, but knowing how many are queued tells an operator how much
 * reviewing is left rather than how much writing.
 */
export function countAwaitingReview(db: Db, now: Date = new Date()): number {
  const today = todayUtc(now);
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total FROM puzzles
        WHERE kind = 'daily'
          AND status IN ('draft', 'in_review', 'playtested')
          AND scheduled_date IS NOT NULL
          AND scheduled_date >= ?`,
    )
    .get(today) as { total: number };
  return row.total;
}

export function checkCoverage(
  db: Db,
  options: { days?: number; minimumBuffer?: number; now?: Date } = {},
): CoverageAlert {
  const days = options.days ?? COVERAGE_DAYS;
  const minimumBuffer = options.minimumBuffer ?? MINIMUM_BUFFER_DAYS;
  const coverage = dailyCoverage(db, days, options.now);

  const missing = coverage
    .filter((day) => !day.covered)
    .map((day) => ({ dateKey: day.dateKey, label: formatUtcDate(day.dateKey) }));

  const coveredAhead = coverage.filter((day) => day.covered).length;
  const thin = coveredAhead < minimumBuffer;
  const awaitingReview = countAwaitingReview(db, options.now ?? new Date());

  const problems: string[] = [];
  if (missing.length > 0) {
    problems.push(
      `${missing.length} day${missing.length === 1 ? "" : "s"} without a reviewed puzzle: ${missing
        .map((day) => day.dateKey)
        .join(", ")}`,
    );
  }
  if (thin) {
    problems.push(
      `only ${coveredAhead} reviewed day${coveredAhead === 1 ? "" : "s"} ahead, below the ${minimumBuffer}-day buffer`,
    );
  }

  const reviewNote =
    awaitingReview > 0
      ? ` ${awaitingReview} daily puzzle${awaitingReview === 1 ? " is" : "s are"} authored and dated ahead, waiting on a second reviewer.`
      : "";

  return {
    status: problems.length > 0 ? "missing_puzzles" : "ok",
    checkedDays: days,
    missing,
    minimumBufferDays: minimumBuffer,
    coveredAhead,
    awaitingReview,
    message:
      (problems.length > 0
        ? `Guessee content alert: ${problems.join("; ")}.`
        : `Guessee content is clear: ${coveredAhead} reviewed days ahead.`) + reviewNote,
  };
}

/**
 * Posts the alert to a webhook when one is configured. Returns false when
 * nothing is configured, so a missing webhook is never treated as a failure.
 */
export async function sendCoverageAlert(webhook: string | undefined, alert: CoverageAlert) {
  if (!webhook || alert.status === "ok") return { sent: false as const };

  const text = alert.message;
  // Slack and Discord accept {"text": "..."} on an incoming webhook.
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return { sent: response.ok as boolean, status: response.status };
}

export function alertHeaders(alert: CoverageAlert): Record<string, string> {
  return { "x-guessee-coverage": alert.status };
}

export type { MissingDay };
