"use client";

import { useEffect } from "react";

import { getSessionId } from "@/lib/clientAnalytics";

/**
 * Captures uncaught browser errors and unhandled promise rejections.
 *
 * Consent does not apply here. Analytics are opt-in because they describe a
 * player's behaviour, but an error means the game failed for them, and fixing
 * that matters whether or not they agreed to tracking. Only a context label, a
 * message, and a truncated stack are sent: no guess, answer, clue, or props.
 */
export function reportError(context: string, error: unknown, detail?: string): void {
  if (typeof window === "undefined") return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = detail ?? (error instanceof Error ? error.stack : null);
  if (!message) return;

  const body = JSON.stringify({
    source: "client",
    context,
    message,
    detail: stack ?? null,
    sessionId: getSessionId(),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never throw back into the broken page.
  }
}

function describe(event: ErrorEvent): { message: string; detail: string | null } {
  const error = event.error;
  if (error instanceof Error) {
    return { message: error.message, detail: error.stack ?? null };
  }
  return { message: event.message || "Uncaught error", detail: null };
}

export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const { message, detail } = describe(event);
      reportError("window.onerror", message, detail ?? undefined);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");
      const detail = reason instanceof Error ? (reason.stack ?? null) : null;
      reportError("unhandledrejection", message || "Unhandled rejection", detail ?? undefined);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
