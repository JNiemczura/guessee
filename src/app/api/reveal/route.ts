import { getDb } from "@/db/client";
import { isAuthorizedRequest } from "@/server/editorAuth";
import { recordServerError } from "@/server/errorLog";
import { RoundError, getReveal } from "@/server/roundService";

export const dynamic = "force-dynamic";

/**
 * Serves the answer, the explanation, and the full clue path.
 *
 * Refuses unless the server-side round ledger shows this session actually
 * finished the round. A client cannot read the answer by asking directly.
 *
 * The editor preview widens only the puzzle lookup, never the ledger rule: an
 * unreviewed answer is still refused until that editor session has really
 * finished the round. An editor who can see the answer in the editor anyway
 * gains no new authority here, and a player gains none at all.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  const puzzleId = url.searchParams.get("puzzle");

  try {
    const reveal = getReveal(getDb(), { sessionId, puzzleId }, isAuthorizedRequest(request));
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
    recordServerError("api.reveal", error);
    return Response.json({ error: "Could not load the result." }, { status: 500 });
  }
}
