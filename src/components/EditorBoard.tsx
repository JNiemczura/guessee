"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { draftIdForDate } from "@/lib/forwardBuffer";
import { GAME_ID, type Puzzle } from "@/lib/types";

/**
 * Minimal create form. The full editor is per-puzzle; this only needs enough to
 * create a draft and hand it to the review workflow.
 *
 * `takenIds` is the set of ids the server already knows about, so a draft can
 * never be minted onto an id that exists. It is passed in rather than fetched
 * because this form is rendered on a page that has already loaded them.
 */
export function EditorBoard({
  nextDate,
  takenIds,
}: {
  nextDate: string;
  takenIds?: readonly string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const puzzleId = draftIdForDate(nextDate, takenIds ?? []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const now = new Date().toISOString();
    const draft: Puzzle = {
      id: puzzleId,
      gameId: GAME_ID,
      kind: "daily",
      scheduledDate: nextDate,
      language: "en",
      category: "",
      answer: "",
      aliases: [],
      clues: ["", "", ""],
      explanation: "",
      difficulty: 3,
      sourceNotes: "",
      status: "draft",
      attemptsAllowed: 5,
      hintsAllowed: 1,
      author: "",
      reviewer: null,
      ambiguityCheckedAt: null,
      correctionNote: null,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };

    try {
      const response = await fetch("/api/editor/puzzles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ puzzle: draft, changedBy: "editor", note: "Draft created" }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not create the draft.");
        return;
      }

      router.push(`/editor/puzzles/${encodeURIComponent(puzzleId)}`);
    } catch {
      setError("Could not create the draft.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">New puzzle</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 min-h-11 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:opacity-90"
        >
          Start a draft for {nextDate}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">New puzzle</h2>
      <p className="mt-1 text-sm text-muted">
        Creates an empty draft for {nextDate}. Everything else is filled in on the puzzle screen.
      </p>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <label htmlFor="new-id" className="block text-sm font-medium">
            Puzzle id
          </label>
          <input
            id="new-id"
            value={puzzleId}
            readOnly
            className="mt-1 min-h-11 w-full rounded border border-line bg-surface-sunken px-3 py-2 font-mono text-sm"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded border border-negative/40 bg-negative/10 p-3 text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create draft"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
