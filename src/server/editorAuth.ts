import { timingSafeEqual } from "node:crypto";

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
 *
 * Every helper here is deliberately synchronous. An earlier version read the
 * cookie through `cookies()` and was therefore async, and `if (!isAuthorized())`
 * on a promise is always false: the guard silently passed and the export route
 * served every answer, including tomorrow's, to anyone who asked. A sync
 * signature makes that mistake impossible to express. A route handler reads the
 * cookie from the request headers; a server component awaits `cookies()` once
 * and passes the value in.
 */
export function keyMatches(candidate: unknown): boolean {
  return typeof candidate === "string" && safeEqual(candidate, configuredKey());
}

export function hasEditorCookie(rawCookie: string | null | undefined): boolean {
  if (!rawCookie) return false;

  for (const part of rawCookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    if (name !== EDITOR_COOKIE) continue;

    const value = decodeURIComponent(part.slice(separator + 1).trim());
    if (keyMatches(value)) return true;
  }

  return false;
}

/** True when the request carries a valid editor header or editor session cookie. */
export function isAuthorizedRequest(request: Request): boolean {
  return (
    keyMatches(request.headers.get("x-editor-key")) ||
    hasEditorCookie(request.headers.get("cookie"))
  );
}

/**
 * Gate for scheduled jobs such as the missing-puzzle alert. A cron job or an
 * uptime pinger has no cookie, so it presents a key in the `x-guessee-key`
 * header or a `key` query parameter. Either the editor key or a separate alert
 * token is accepted.
 */
export function isAlertAuthorized(request: Request): boolean {
  const url = new URL(request.url);
  const given = request.headers.get("x-guessee-key") ?? url.searchParams.get("key");

  if (typeof given !== "string" || !given) return false;
  if (keyMatches(given)) return true;

  const alertToken = process.env.GUESSEE_ALERT_TOKEN;
  if (!alertToken) return false;
  return safeEqual(given, alertToken);
}

export { configuredKey };
