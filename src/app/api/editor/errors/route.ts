import { getDb } from "@/db/client";
import { countErrorsSince, recentErrors } from "@/server/errorLog";
import { isAuthorizedRequest } from "@/server/editorAuth";
import { withErrorCapture } from "@/server/withErrorCapture";

export const dynamic = "force-dynamic";

/**
 * Recent errors for the editor queue, so a failed round is visible to the
 * person who can fix it. Key-gated for the same reason the export is: the
 * messages and stacks describe the running app's internals.
 */
export const GET = withErrorCapture("api.editor.errors", async (request: Request) => {
  if (!isAuthorizedRequest(request)) {
    return Response.json({ error: "Editor key required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 25;

  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return Response.json({
    errors: recentErrors(db, limit),
    last24h: countErrorsSince(db, since),
  });
});
