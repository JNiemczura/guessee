import { getDb } from "@/db/client";
import { getDailyByDate, toShell } from "@/db/queries";
import { isDateKey, nextResetAtUtc, todayUtc } from "@/lib/dates";
import { GAME_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

function cluePayload(clues: readonly string[], revealed: number): string[] {
  const count = Math.max(1, Math.min(clues.length, revealed));
  return clues.slice(0, count);
}

/**
 * The daily board payload.
 *
 * Only the category, the attempt budget, and the clues the player has already
 * earned are returned. The answer, the alias list, the explanation, and the
 * unrevealed clues never leave the server from this route.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const revealedParam = Number(url.searchParams.get("revealed") ?? "1");
  const revealed = Number.isFinite(revealedParam) ? Math.trunc(revealedParam) : 1;

  const now = new Date();
  const dateKey = dateParam && isDateKey(dateParam) ? dateParam : todayUtc(now);

  const db = getDb();
  const puzzle = getDailyByDate(db, dateKey, GAME_ID, now);

  if (!puzzle) {
    return Response.json({
      shell: null,
      clues: [],
      missing: true,
      dateKey,
      nextResetAtUtc: nextResetAtUtc(now).toISOString(),
    });
  }

  return Response.json({
    shell: toShell(puzzle, now),
    clues: cluePayload(puzzle.clues, revealed),
    missing: false,
    dateKey,
    nextResetAtUtc: nextResetAtUtc(now).toISOString(),
  });
}
