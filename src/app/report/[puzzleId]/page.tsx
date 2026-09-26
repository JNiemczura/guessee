import Link from "next/link";

import { ReportForm } from "@/components/ReportForm";
import { getDb } from "@/db/client";
import { getPuzzleById } from "@/db/queries";
import { GAME_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report a puzzle",
  description: "Tell the operator that a puzzle is wrong, ambiguous, or unfair.",
};

export default async function ReportPage(props: PageProps<"/report/[puzzleId]">) {
  const { puzzleId } = await props.params;
  const puzzle = getPuzzleById(getDb(), puzzleId);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Report a problem</h1>
        <p className="mt-2 text-sm text-muted">
          Puzzle <span className="font-mono">{puzzleId}</span>
          {puzzle ? ` · ${GAME_LABEL} · ${puzzle.category}` : ""}
        </p>
      </header>

      <ReportForm puzzleId={puzzleId} />

      <p className="text-sm text-muted">
        Reports do not change a result you have already finished. A correction is logged and shown to
        players who are affected.
      </p>

      <p className="text-sm">
        <Link href="/play" className="underline">
          Back to the puzzle
        </Link>
      </p>
    </div>
  );
}
