import { getDb } from "@/db/client";
import {
  dailyCoverage,
  getPuzzleById,
  listAllPuzzles,
  listRevisions,
  savePuzzle,
} from "@/db/queries";
import { GAME_ID, type Puzzle } from "@/lib/types";
import { validatePuzzle } from "@/lib/validatePuzzle";
import { isAuthorizedRequest } from "@/server/editorAuth";

export const dynamic = "force-dynamic";

function toJsonSafe(puzzle: Puzzle) {
  return puzzle;
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return Response.json({ error: "Editor key required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const db = getDb();

  if (id) {
    const puzzle = getPuzzleById(db, id);
    if (!puzzle) return Response.json({ error: "No such puzzle." }, { status: 404 });
    return Response.json({
      puzzle: toJsonSafe(puzzle),
      revisions: listRevisions(db, id),
      validation: validatePuzzle(puzzle, listAllPuzzles(db)),
    });
  }

  return Response.json({ puzzles: listAllPuzzles(db), coverage: dailyCoverage(db, 14) });
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return Response.json({ error: "Editor key required." }, { status: 401 });
  }

  let body: { puzzle?: Puzzle; changedBy?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.puzzle || typeof body.puzzle.id !== "string") {
    return Response.json({ error: "A puzzle with an id is required." }, { status: 400 });
  }

  const incoming: Puzzle = { ...body.puzzle, gameId: GAME_ID };

  try {
    const result = savePuzzle(getDb(), incoming, {
      changedBy: typeof body.changedBy === "string" ? body.changedBy : "editor",
      note: typeof body.note === "string" ? body.note : "",
    });

    if (!result.ok) {
      return Response.json(
        { error: result.error, validation: result.validation },
        { status: 422 },
      );
    }

    return Response.json({ puzzle: toJsonSafe(result.puzzle) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the puzzle.";
    return Response.json({ error: message }, { status: 409 });
  }
}
