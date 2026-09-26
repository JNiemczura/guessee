import { notFound } from "next/navigation";

import { RoundBoard } from "@/components/RoundBoard";
import { getDb } from "@/db/client";
import { getDailyByDate, getPlayablePuzzle, toShell } from "@/db/queries";
import { isDateKey, isPastUtcDate, todayUtc } from "@/lib/dates";
import type { RoundMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Play",
  description: "One short daily guessing puzzle.",
};

type SearchParams = { date?: string; puzzle?: string };

export default async function PlayPage(props: PageProps<"/play">) {
  const searchParams = (await props.searchParams) as SearchParams;
  const now = new Date();
  const db = getDb();

  const puzzle = searchParams.puzzle
    ? getPlayablePuzzle(db, searchParams.puzzle, now)
    : getDailyByDate(
        db,
        searchParams.date && isDateKey(searchParams.date) ? searchParams.date : todayUtc(now),
        undefined,
        now,
      );

  if (!puzzle) notFound();

  const shell = toShell(puzzle, now);
  const dateKey = puzzle.scheduledDate;

  // A daily opened after its own day ended is a replay: playable, but never the
  // official result, and labelled so nobody mistakes the two.
  const mode: RoundMode = puzzle.kind === "practice" ? "practice" : isPastUtcDate(dateKey ?? "", now) ? "replay" : "daily";

  return (
    <RoundBoard
      puzzleId={puzzle.id}
      mode={mode}
      dateKey={dateKey}
      category={puzzle.category}
      attemptsAllowed={shell.attemptsAllowed}
      hintsAllowed={shell.hintsAllowed}
      clueCount={shell.clueCount}
      initialClues={puzzle.clues.slice(0, 1)}
      nextResetAtUtc={shell.nextResetAtUtc}
      resetAtUtc={shell.resetAtUtc}
      correctionNote={puzzle.correctionNote}
      shareOrigin={process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://guessee.example"}
    />
  );
}
