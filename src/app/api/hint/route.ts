import { getDb } from "@/db/client";
import { recordServerError } from "@/server/errorLog";
import { RoundError, takeHint } from "@/server/roundService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { sessionId?: unknown; puzzleId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    return Response.json(takeHint(getDb(), body));
  } catch (error) {
    if (error instanceof RoundError) {
      const status = error.code === "not_found" ? 404 : 400;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    recordServerError("api.hint", error);
    return Response.json({ error: "Could not use a hint." }, { status: 500 });
  }
}
