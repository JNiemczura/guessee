import { getDb } from "@/db/client";
import { dailyCoverage, exportPuzzles } from "@/db/queries";
import { isAuthorizedRequest } from "@/server/editorAuth";

export const dynamic = "force-dynamic";

/**
 * Operator dashboard data: the missing-puzzle alert and a content export
 * (the backup/export requirement in the nonfunctional list).
 */
export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return Response.json({ error: "Editor key required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (format === "export") {
    return new Response(exportPuzzles(getDb()), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="guessee-puzzles.json"',
      },
    });
  }

  const coverage = dailyCoverage(getDb(), 14);
  const missing = coverage.filter((day) => !day.covered);

  return Response.json({ coverage, missingCount: missing.length });
}
