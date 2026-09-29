import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { RoundBoard } from "@/components/RoundBoard";
import { getDb } from "@/db/client";
import { getPuzzleById, toShell } from "@/db/queries";
import { EDITOR_COOKIE, keyMatches } from "@/server/editorAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preview puzzle",
  robots: { index: false, follow: false },
};

/**
 * Plays a puzzle that is not published yet.
 *
 * The ordinary play routes only ever load a `published` puzzle, which left the
 * `playtested` stage unreachable: an editor could move a puzzle into it and then
 * had no way to actually play the thing, while the review form asks them to
 * confirm they played it. This is that missing preview, and BR-09 lists preview
 * as a must.
 *
 * Three things keep it safe. The editor cookie is checked before anything is
 * read, so an unreviewed answer can never reach a player. The round is forced to
 * practice mode, so the header, the note and the share text can never be mistaken
 * for a real daily result. And the puzzle is loaded by id with no status filter,
 * so it works from `draft` onwards rather than only from `playtested`.
 *
 * The round itself is written to the same `rounds` table as any other attempt.
 * That is deliberate: the alternative is a per-session flag, which would need a
 * schema migration, and there is no migration framework here. A preview row
 * belongs to the editor's own browser session and refers to content that no
 * player can reach, so it cannot affect anyone's result.
 */
export default async function EditorPreviewPage(
  props: PageProps<"/editor/puzzles/[puzzleId]/play">,
) {
  const store = await cookies();
  if (!keyMatches(store.get(EDITOR_COOKIE)?.value)) {
    redirect("/editor/login");
  }

  const { puzzleId } = await props.params;
  const db = getDb();
  const now = new Date();
  const puzzle = getPuzzleById(db, puzzleId);

  if (!puzzle) notFound();

  const shell = toShell(puzzle, now);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm">
          <Link href={`/editor/puzzles/${encodeURIComponent(puzzle.id)}`} className="underline">
            Back to the editor
          </Link>
        </p>
      </header>

      <div
        role="status"
        className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
      >
        <p className="font-semibold">Preview &mdash; not a real result</p>
        <p className="mt-1 text-muted">
          {puzzle.id} is currently{" "}
          <span className="font-mono">{puzzle.status.replace("_", " ")}</span>
          {puzzle.scheduledDate ? (
            <>
              {" "}
              for {puzzle.scheduledDate}
            </>
          ) : null}
          . Play it as a player would to check the clues, the aliases and the
          fairness, then tick the ambiguity box on the editor page. This attempt
          is recorded against your browser session only and can never be a
          player&rsquo;s official daily result.
        </p>
      </div>

      <RoundBoard
        puzzleId={puzzle.id}
        mode="practice"
        dateKey={puzzle.scheduledDate}
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
    </div>
  );
}
