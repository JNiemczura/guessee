import { getDb } from "@/db/client";
import { isEventName, sanitizeProps } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Analytics sink.
 *
 * Names and properties are both filtered against a whitelist, so a guess, an
 * answer, or a clue cannot be recorded even if a caller sends one.
 */
export async function POST(request: Request) {
  let body: { name?: unknown; puzzleId?: unknown; sessionId?: unknown; props?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isEventName(body.name)) {
    return Response.json({ error: "Unknown event name." }, { status: 400 });
  }

  const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId : null;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

  getDb()
    .prepare("INSERT INTO events (name, puzzle_id, session_id, props, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(
      body.name,
      puzzleId,
      sessionId,
      JSON.stringify(sanitizeProps(body.props)),
      new Date().toISOString(),
    );

  return Response.json({ ok: true });
}
