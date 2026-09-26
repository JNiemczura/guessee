import { getDb } from "@/db/client";
import { getPuzzleById, toShell } from "@/db/queries";
import { RoundError, startRound } from "@/server/roundService";

export const dynamic = "force-dynamic";

type Body = { sessionId?: unknown; puzzleId?: unknown };

function cluesEarned(clues: readonly string[], revealed: number): string[] {
  return clues.slice(0, Math.max(1, Math.min(clues.length, revealed)));
}

/**
 * Opens or resumes a round.
 *
 * The response carries the authoritative attempt accounting plus exactly the
 * clues this session has earned, which is what makes a refresh resume the round
 * rather than restart it.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = getDb();

  try {
    const round = startRound(db, String(body.puzzleId ?? ""), String(body.sessionId ?? ""));
    const puzzle = getPuzzleById(db, round.puzzleId);

    if (!puzzle) {
      return Response.json({ error: "That puzzle no longer exists." }, { status: 404 });
    }

    return Response.json({
      round,
      shell: toShell(puzzle, new Date()),
      clues: cluesEarned(puzzle.clues, round.cluesRevealed),
    });
  } catch (error) {
    if (error instanceof RoundError) {
      const status = error.code === "not_found" ? 404 : 400;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    return Response.json({ error: "Could not start the round." }, { status: 500 });
  }
}
