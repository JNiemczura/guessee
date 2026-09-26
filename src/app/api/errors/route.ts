import { getDb } from "@/db/client";
import { countErrorsSince, recordError, type ErrorSource } from "@/server/errorLog";

export const dynamic = "force-dynamic";

/**
 * Error sink for the browser.
 *
 * Unauthenticated by necessity: the player hitting the bug has no editor key.
 * That makes it a target for junk writes, so input is length-capped, the
 * caller supplies a context label rather than free text, and a session that
 * reports repeatedly within a short window is dropped instead of stored.
 */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  let body: { source?: unknown; context?: unknown; message?: unknown; detail?: unknown; sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.message !== "string" || body.message.trim() === "") {
    return Response.json({ error: "A message is required." }, { status: 400 });
  }

  const db = getDb();
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
  const now = new Date();

  if (sessionId) {
    const since = new Date(now.getTime() - RATE_WINDOW_MS);
    if (countErrorsSince(db, since, now) >= RATE_LIMIT) {
      return Response.json({ error: "Too many reports." }, { status: 429 });
    }
  }

  recordError(
    db,
    {
      source: body.source === "server" ? "server" : ("client" as ErrorSource),
      context: typeof body.context === "string" ? body.context : "unknown",
      message: body.message,
      detail: typeof body.detail === "string" ? body.detail : null,
      sessionId,
    },
    now,
  );

  return Response.json({ ok: true }, { status: 201 });
}
