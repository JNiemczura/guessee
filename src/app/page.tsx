import Link from "next/link";

import { NextResetCountdown } from "@/components/NextResetCountdown";
import { getDb } from "@/db/client";
import { getDailyByDate } from "@/db/queries";
import { nextResetAtUtc, todayUtc } from "@/lib/dates";
import { GAME_LABEL, HUB_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const today = todayUtc(now);
  const db = getDb();
  const daily = getDailyByDate(db, today, undefined, now);
  const nextReset = nextResetAtUtc(now).toISOString();

  return (
    <div className="space-y-6">
      <section aria-labelledby="intro-heading">
        <h1 id="intro-heading" className="text-3xl font-semibold tracking-tight">
          {HUB_LABEL}
        </h1>
        <p className="mt-2 max-w-prose text-muted">
          One short daily guessing puzzle, the same puzzle for everyone, finished in a few minutes.
          Practice rounds are always there when you want another.
        </p>
      </section>

      <section
        aria-labelledby="today-heading"
        className="rounded-lg border border-line bg-surface p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted">Today</p>
            <h2 id="today-heading" className="mt-1 text-2xl font-semibold">
              {daily ? daily.category : "No puzzle published yet"}
            </h2>
            {daily ? (
              <p className="mt-1 text-sm text-muted">
                Puzzle {daily.id} &middot; {daily.attemptsAllowed} guesses &middot;{" "}
                {daily.hintsAllowed} hint &middot; {daily.clues.length} clues
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                The operator has not published a puzzle for {today} yet. The archive and practice
                rounds are still open.
              </p>
            )}
          </div>

          <div className="min-w-48">
            <NextResetCountdown targetIso={nextReset} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={daily ? "/play" : "/practice"}
            className="inline-flex min-h-11 items-center rounded bg-accent px-5 py-2 font-medium text-accent-contrast hover:opacity-90"
          >
            {daily ? "Play today’s puzzle" : "Go to practice"}
          </Link>
          <Link
            href="/rules"
            className="inline-flex min-h-11 items-center rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
          >
            How it works
          </Link>
        </div>

        {daily ? (
          <p className="mt-3 text-xs text-muted">
            Category and puzzle id are visible before your first guess. You can start without an
            account.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Games
        </h2>
        <ul className="mt-3 space-y-3">
          <li className="rounded-lg border border-line bg-surface p-4">
            <h3 className="text-lg font-semibold">{GAME_LABEL}</h3>
            <p className="mt-1 text-sm text-muted">
              Guess a word, name, place, or item inside a category. Clues unlock as you guess, and
              a hint costs points but no attempt. Every round ends with the answer, why it fits, and
              the full clue path.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/play" className="underline">
                Play today&rsquo;s round
              </Link>
              {" · "}
              <Link href="/practice" className="underline">
                Browse practice and archive
              </Link>
            </p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="reset-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="reset-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Daily reset
        </h2>
        <p className="mt-2 text-sm">
          One puzzle per day for everyone, published at 00:00 UTC. The countdown above is shown in
          your own time zone.
        </p>
      </section>
    </div>
  );
}
