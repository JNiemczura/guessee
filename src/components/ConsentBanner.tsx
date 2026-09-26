"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getConsent, setConsent, type Consent } from "@/lib/clientAnalytics";
import { trackEvent } from "@/lib/clientAnalytics";

const CONSENT_EVENT = "guessee:consent";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Consent is unknown while rendering on the server, so the banner is hidden there. */
const getServerSnapshot = (): null => null;

/**
 * Analytics choice gate.
 *
 * Nothing is recorded before a decision is made, and declining is a permanent,
 * equally supported option: the game is fully playable either way.
 */
export function ConsentBanner() {
  const choice = useSyncExternalStore(subscribe, getConsent, getServerSnapshot);

  const decide = useCallback((next: Consent) => {
    setConsent(next);
    if (next === "granted") {
      trackEvent("analytics_consent_changed", { consent: "granted" });
    }
  }, []);

  if (choice !== null) return null;

  return (
    <aside
      aria-label="Analytics choice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface p-4 shadow-lg"
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm">
          <strong className="font-semibold">Optional, anonymous play statistics.</strong> They
          record which puzzles were played and how they ended. Guesses, answers, and clue text are
          never recorded, and declining changes nothing about the game.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decide("granted")}
            className="min-h-11 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:opacity-90"
          >
            Allow statistics
          </button>
          <button
            type="button"
            onClick={() => decide("denied")}
            className="min-h-11 rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
          >
            No thanks
          </button>
        </div>
      </div>
    </aside>
  );
}
