import { getDb, type Db } from "@/db/client";

/**
 * Error monitoring, the "useful error monitoring" nonfunctional requirement.
 *
 * Anything that reaches this module has already failed, so the only job is to
 * record it legibly and safely. Two rules hold everywhere: text is truncated to
 * a fixed length, and a guess, an answer, or a clue is never accepted as input.
 * Callers pass a context label such as `round.guess` rather than a message that
 * would embed game content.
 */
export const MAX_MESSAGE_LENGTH = 300;
export const MAX_DETAIL_LENGTH = 2_000;
export const MAX_CONTEXT_LENGTH = 60;

export type ErrorSource = "client" | "server";

export type ErrorInput = {
  source: ErrorSource;
  context: string;
  message: string;
  detail?: string | null;
  sessionId?: string | null;
};

export type ErrorRow = {
  id: number;
  source: string;
  context: string;
  message: string;
  detail: string | null;
  session_id: string | null;
  created_at: string;
};

function truncate(value: string, max: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;

  const cut = flat.slice(0, max - 1);
  // A stack can contain emoji or other astral characters. Cutting between a
  // surrogate pair leaves a lone half-character in the log, so drop it.
  const safe = /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
  return `${safe}…`;
}

export function normalizeError(input: ErrorInput, now: Date = new Date()) {
  return {
    source: input.source === "server" ? ("server" as const) : ("client" as const),
    context: truncate(input.context || "unknown", MAX_CONTEXT_LENGTH),
    message: truncate(input.message || "Unknown error", MAX_MESSAGE_LENGTH),
    detail: input.detail ? truncate(input.detail, MAX_DETAIL_LENGTH) : null,
    session_id: input.sessionId ? truncate(input.sessionId, 64) : null,
    created_at: now.toISOString(),
  };
}

export function recordError(db: Db, input: ErrorInput, now: Date = new Date()): void {
  const row = normalizeError(input, now);
  db.prepare(
    `INSERT INTO error_log (source, context, message, detail, session_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(row.source, row.context, row.message, row.detail, row.session_id, row.created_at);
}

/**
 * Convenience wrapper for a route handler's catch block. It opens the database
 * itself and swallows its own failures, because the whole point is to be safe
 * to call on the path that is already going wrong.
 */
export function recordServerError(context: string, error: unknown): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const detail = error instanceof Error ? (error.stack ?? null) : null;
    recordError(getDb(), { source: "server", context, message, detail });
  } catch {
    // A monitoring failure must not replace the real error.
  }
}

export function recentErrors(db: Db, limit = 25): ErrorRow[] {
  return db
    .prepare(
      `SELECT id, source, context, message, detail, session_id, created_at
         FROM error_log
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
    )
    .all(Math.max(1, Math.min(limit, 200))) as ErrorRow[];
}

export function countErrorsSince(db: Db, since: Date, now: Date = new Date()): number {
  const row = db
    .prepare("SELECT COUNT(*) AS total FROM error_log WHERE created_at >= ? AND created_at <= ?")
    .get(since.toISOString(), now.toISOString()) as { total: number };
  return row.total;
}

/**
 * Keeps the table from growing without bound on a long-lived instance. Errors
 * are worth reading for a while, so this keeps a generous window and only runs
 * when the table is large.
 */
export function pruneErrors(db: Db, keepDays = 30, now: Date = new Date()): number {
  const cutoff = new Date(now.getTime() - keepDays * 24 * 60 * 60 * 1000).toISOString();
  return db.prepare("DELETE FROM error_log WHERE created_at < ?").run(cutoff).changes;
}
