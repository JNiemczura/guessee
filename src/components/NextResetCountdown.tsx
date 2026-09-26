"use client";

import { useSyncExternalStore } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function spoken(ms: number): string {
  const { hours, minutes, seconds } = parts(ms);
  const chunks: string[] = [];
  if (hours) chunks.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes) chunks.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (!hours && seconds) chunks.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  return chunks.length ? chunks.join(", ") : "less than a minute";
}

/**
 * A ticking clock cannot be rendered on the server, so hydration uses a
 * placeholder snapshot and the real value is read only once the client is
 * mounted. That keeps the markup stable instead of guessing which second the
 * server happened to render.
 */
const subscribe = (onTick: () => void) => {
  const timer = window.setInterval(onTick, 1000);
  return () => window.clearInterval(timer);
};

const serverSnapshot = () => 0;

/** False on the server and during hydration, true once the client has mounted. */
const noopSubscribe = () => () => {};

const clientSnapshot = () => true;

const clientServerSnapshot = () => false;

/**
 * Countdown to the next 00:00 UTC reset, rendered in the player's own time
 * zone. The ticking digits are aria-hidden; a polite live region announces the
 * remaining time rather than every second.
 */
export function NextResetCountdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const now = useSyncExternalStore(
    subscribe,
    () => Date.now(),
    serverSnapshot,
  );

  const remaining = target - now;
  const { hours, minutes, seconds } = parts(remaining);
  const isClient = useSyncExternalStore(noopSubscribe, clientSnapshot, clientServerSnapshot);

  const localTime = isClient
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(targetIso))
    : "00:00 UTC";

  return (
    <div>
      <p aria-hidden="true" className="font-mono text-2xl tabular-nums">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </p>
      <p className="mt-1 text-sm text-muted">
        Next puzzle at <strong className="font-medium text-foreground">{localTime}</strong>{" "}
        {isClient ? "(00:00 UTC daily)" : "daily, in UTC"}
      </p>
      <p aria-live="polite" className="sr-only">
        {remaining > 0 ? `Next puzzle in ${spoken(remaining)}.` : "A new puzzle is available now."}
      </p>
    </div>
  );
}
