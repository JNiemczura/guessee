import { getDb } from "@/db/client";
import { recordError } from "@/server/errorLog";

/**
 * Server error capture for route handlers.
 *
 * This app deliberately does not use a global `instrumentation.ts` hook: Next
 * compiles that file into an edge bundle as well as the node one, and
 * better-sqlite3 is a native addon that cannot be resolved there. Wrapping the
 * handlers keeps error reporting on the runtime that can actually write it.
 *
 * The response is always generic. The recorded message and stack go to the
 * error log behind the editor key, never to the caller, so a stack trace or a
 * file path cannot leak to a player.
 */
export function withErrorCapture<Args extends unknown[]>(
  context: string,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      try {
        const message = error instanceof Error ? error.message : String(error);
        const detail = error instanceof Error ? (error.stack ?? null) : null;
        recordError(getDb(), { source: "server", context, message, detail });
      } catch {
        // Never let monitoring replace the real failure.
      }

      return Response.json(
        { error: "Something went wrong on our side. Please try again." },
        { status: 500 },
      );
    }
  };
}
