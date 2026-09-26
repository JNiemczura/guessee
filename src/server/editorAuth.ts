import { timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const EDITOR_COOKIE = "guessee_editor";

function configuredKey(): string {
  return process.env.GUESSEE_EDITOR_KEY ?? "change-me";
}

function safeEqual(a: string, b: string): boolean {
  const given = Buffer.from(a);
  const wanted = Buffer.from(b);
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

/**
 * Minimal shared-secret gate for the editorial queue.
 *
 * This is an operator convenience for a single-editor launch, not a user
 * identity system. Accounts and per-editor permissions are out of MVP scope.
 */
export async function isAuthorized(request?: Request): Promise<boolean> {
  const expected = configuredKey();

  const header = request?.headers.get("x-editor-key");
  if (header && safeEqual(header, expected)) return true;

  const store = await cookies();
  const cookie = store.get(EDITOR_COOKIE)?.value;
  return Boolean(cookie && safeEqual(cookie, expected));
}

export function keyMatches(candidate: unknown): boolean {
  return typeof candidate === "string" && safeEqual(candidate, configuredKey());
}

export { configuredKey };
