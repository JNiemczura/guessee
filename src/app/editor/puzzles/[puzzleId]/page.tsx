import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PuzzleForm } from "@/components/PuzzleForm";
import { getDb } from "@/db/client";
import { getPuzzleById, listAllPuzzles, listRevisions } from "@/db/queries";
import { validatePuzzle } from "@/lib/validatePuzzle";
import { EDITOR_COOKIE, keyMatches } from "@/server/editorAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit puzzle",
  robots: { index: false, follow: false },
};

export default async function EditorPuzzlePage(props: PageProps<"/editor/puzzles/[puzzleId]">) {
  const store = await cookies();
  if (!keyMatches(store.get(EDITOR_COOKIE)?.value)) {
    redirect("/editor/login");
  }

  const { puzzleId } = await props.params;
  const db = getDb();
  const puzzle = getPuzzleById(db, puzzleId);

  if (!puzzle) notFound();

  const validation = validatePuzzle(puzzle, listAllPuzzles(db));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm">
          <Link href="/editor" className="underline">
            Back to the queue
          </Link>
        </p>
        <h1 className="mt-1 font-mono text-2xl font-semibold">{puzzle.id}</h1>
        <p className="mt-1 text-sm text-muted">
          {puzzle.kind} &middot; {puzzle.language} &middot; revision {puzzle.revision} &middot;{" "}
          {puzzle.status.replace("_", " ")}
        </p>
      </header>

      <PuzzleForm
        initial={puzzle}
        revisions={listRevisions(db, puzzleId)}
        initialIssues={validation.issues}
      />
    </div>
  );
}
