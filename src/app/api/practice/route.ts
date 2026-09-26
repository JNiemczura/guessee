import { getDb } from "@/db/client";
import { practiceEntries } from "@/server/roundService";

export const dynamic = "force-dynamic";

/**
 * Practice and archive listing.
 *
 * The underlying query only returns published puzzles whose date is today or
 * earlier, so an unpublished future daily can never appear here (BR-05).
 */
export async function GET() {
  return Response.json({ entries: practiceEntries(getDb()) });
}
