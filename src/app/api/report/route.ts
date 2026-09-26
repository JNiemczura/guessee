import { getDb } from "@/db/client";
import type { ReportKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: ReportKind[] = [
  "wrong_answer",
  "clue_wrong",
  "clue_ambiguous",
  "clue_too_hard",
  "offensive",
  "other",
];

export async function POST(request: Request) {
  let body: { puzzleId?: unknown; kind?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId : "";
  if (!puzzleId) {
    return Response.json({ error: "A puzzle id is required." }, { status: 400 });
  }

  const kind = KINDS.includes(body.kind as ReportKind) ? (body.kind as ReportKind) : "other";
  const message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";

  getDb()
    .prepare(
      "INSERT INTO reports (puzzle_id, kind, message, state, created_at) VALUES (?, ?, ?, 'new', ?)",
    )
    .run(puzzleId, kind, message, new Date().toISOString());

  return Response.json({ ok: true });
}
