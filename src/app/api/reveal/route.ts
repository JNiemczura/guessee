import { getDb } from "@/db/client";
import { RoundError, getReveal } from "@/server/roundService";

export const dynamic = "force-dynamic";

/**
 * Serves the answer, the explanation, and the full clue path.
 *
 * Refuses unless the server-side round ledger shows this session actually
 * finished the round. A client cannot read the answer by asking directly.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  const puzzleId = url.searchParams.get("puzzle");

  try {
    const reveal = getReveal(getDb(), { sessionId, puzzleId });
    if (!reveal) {
      return Response.json(
        { error: "This round is still in progress.", code: "no_round" },
        { status: 409 },
      );
    }
    return Response.json({ reveal });
  } catch (error) {
    if (error instanceof RoundError) {
      const status = error.code === "not_found" ? 404 : 400;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    return Response.json({ error: "Could not load the result." }, { status: 500 });
  }
}
