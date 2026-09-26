"use client";

import { EVENT_NAMES, type EventName } from "@/lib/events";

const CONSENT_KEY = "guessee.analytics";
const SESSION_KEY = "guessee.session";

export type Consent = "granted" | "denied";

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const created = randomId();
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setConsent(consent: Consent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, consent);
  window.dispatchEvent(new CustomEvent("guessee:consent", { detail: consent }));
}

type TrackProps = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: EventName, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  if (!(EVENT_NAMES as readonly string[]).includes(name)) return;

  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) clean[key] = value;
  }

  const body = JSON.stringify({
    name,
    props: clean,
    sessionId: getSessionId(),
    puzzleId: typeof props.puzzle_id === "string" ? props.puzzle_id : undefined,
  });

  // sendBeacon survives a page unload during a share or a result view.
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
