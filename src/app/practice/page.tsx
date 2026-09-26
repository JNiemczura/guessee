import Link from "next/link";

import { getDb } from "@/db/client";
import { listPlayablePuzzles } from "@/db/queries";
import { formatUtcDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Practice and archive",
  description: "Finished daily puzzles and separately authored practice rounds.",
};

export default async function PracticePage() {
  const puzzles = listPlayablePuzzles(getDb());
  const practice = puzzles.filter((puzzle) => puzzle.kind === "practice");
  const archive = puzzles.filter((puzzle) => puzzle.kind === "daily");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Practice and archive</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          These rounds never change the official daily result, and nothing here is drawn from an
          unpublished future puzzle.
        </p>
      </header>

      <section aria-labelledby="practice-heading">
        <h2 id="practice-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Practice bank
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {practice.map((puzzle) => (
            <li key={puzzle.id} className="rounded-lg border border-line bg-surface p-4">
              <h3 className="font-semibold">{puzzle.category}</h3>
              <p className="mt-1 text-sm text-muted">
                Difficulty {puzzle.difficulty}/5 &middot; {puzzle.attemptsAllowed} guesses &middot;{" "}
                {puzzle.clues.length} clues
              </p>
              <p className="mt-2 text-sm">
                <Link href={`/play?puzzle=${puzzle.id}`} className="underline">
                  Play this round
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="archive-heading">
        <h2 id="archive-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Daily archive
        </h2>
        <p className="mt-2 text-sm text-muted">
          A past day can be replayed with the same rules and a fresh set of clues. A replay is
          separate from that day&rsquo;s official result, so it can never change it. If you already
          finished a day, its result stays saved in this browser and is shown again.
        </p>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
          {archive.map((puzzle) => (
            <li key={puzzle.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <span>
                <span className="font-medium">{formatUtcDate(puzzle.scheduledDate ?? "")}</span>
                <span className="ml-2 text-sm text-muted">{puzzle.category}</span>
              </span>
              <Link href={`/play?date=${puzzle.scheduledDate}`} className="text-sm underline">
                Replay
              </Link>
            </li>
          ))}
          {archive.length === 0 ? (
            <li className="p-4 text-sm text-muted">No finished daily puzzles yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
