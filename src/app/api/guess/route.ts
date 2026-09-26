import { getDb } from "@/db/client";
import { recordServerError } from "@/server/errorLog";
import { RoundError, submitGuess } from "@/server/roundService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { sessionId?: unknown; puzzleId?: unknown; guess?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = submitGuess(getDb(), body);
    return Response.json(result);
  } catch (error) {
    if (error instanceof RoundError) {
      const status =
        error.code === "not_found" ? 404 : error.code === "internal" ? 500 : 400;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    recordServerError("api.guess", error);
    return Response.json({ error: "Could not record that guess." }, { status: 500 });
  }
}
