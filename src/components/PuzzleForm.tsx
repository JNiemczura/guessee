"use client";

import { useMemo, useState } from "react";

import type { Puzzle, PuzzleStatus } from "@/lib/types";
import { parseAliases, toLines } from "@/lib/listField";
import { REVIEW_ISSUE_CODES, reviewIssuesFor, type ValidationIssue } from "@/lib/validatePuzzle";

const STATUSES: PuzzleStatus[] = [
  "draft",
  "in_review",
  "playtested",
  "scheduled",
  "published",
  "corrected",
  "retired",
];

type Revision = { revision: number; changedBy: string; note: string; changedAt: string };

const inputClass =
  "min-h-11 w-full rounded border border-line bg-background px-3 py-2 text-base";



export function PuzzleForm({
  initial,
  revisions,
  initialIssues,
}: {
  initial: Puzzle;
  revisions: Revision[];
  initialIssues: ValidationIssue[];
}) {
  const [puzzle, setPuzzle] = useState<Puzzle>(initial);
  // Held as raw text so a half-finished line survives typing. Parsed on save.
  const [aliasText, setAliasText] = useState(() => toLines(initial.aliases));
  const [issues, setIssues] = useState<ValidationIssue[]>(initialIssues);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (fields: Partial<Puzzle>) => setPuzzle((current) => ({ ...current, ...fields }));

  const save = async (statusOverride?: PuzzleStatus) => {
    setBusy(true);
    setMessage(null);
    setError(null);

    const parsed = { ...puzzle, aliases: parseAliases(aliasText) };
    const next = statusOverride ? { ...parsed, status: statusOverride } : parsed;

    try {
      const response = await fetch("/api/editor/puzzles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          puzzle: next,
          changedBy: next.author || "editor",
          note: statusOverride ? `Status set to ${statusOverride}` : "Content edited",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        if (data.validation?.issues) setIssues(data.validation.issues);
        return;
      }

      setPuzzle(data.puzzle);
      setIssues([]);
      setMessage(statusOverride ? `Saved and moved to ${statusOverride}.` : "Saved.");
      window.location.reload();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  // The reviewer and ambiguity tick live in this form, so their issues are
  // re-derived from what is on screen now. Everything else stays as the server
  // reported it, since a stale copy of those two would leave "Save and schedule"
  // disabled on a form the editor has just filled in correctly.
  const merged = useMemo<ValidationIssue[]>(() => {
    const stale = new Set<string>(REVIEW_ISSUE_CODES);
    return [...issues.filter((issue) => !stale.has(issue.code)), ...reviewIssuesFor(puzzle)];
  }, [issues, puzzle]);

  const errors = merged.filter((issue) => issue.severity === "error");
  const warnings = merged.filter((issue) => issue.severity === "warning");

  return (
    <div className="space-y-5">
      <section aria-labelledby="issues-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="issues-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Validation
        </h2>
        {merged.length === 0 ? (
          <p className="mt-2 text-sm">
            No issues found. Scheduling requires a reviewer, a ticked ambiguity check, and no errors.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {errors.length > 0 ? (
              <div role="alert" className="rounded border border-negative/40 bg-negative/10 p-3">
                <p className="text-sm font-semibold">{errors.length} blocking</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                  {errors.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                      <span className="font-mono text-xs">{issue.field}</span>: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {warnings.length > 0 ? (
              <div className="rounded border border-warning/40 bg-warning/10 p-3">
                <p className="text-sm font-semibold">{warnings.length} to consider</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                  {warnings.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                      <span className="font-mono text-xs">{issue.field}</span>: {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Category
            </label>
            <input
              id="category"
              className={`mt-1 ${inputClass}`}
              value={puzzle.category}
              onChange={(event) => patch({ category: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium">
              Difficulty (1-5)
            </label>
            <input
              id="difficulty"
              type="number"
              min={1}
              max={5}
              className={`mt-1 ${inputClass}`}
              value={puzzle.difficulty}
              onChange={(event) => patch({ difficulty: Number(event.target.value) })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="answer" className="block text-sm font-medium">
            Canonical answer
          </label>
          <input
            id="answer"
            className={`mt-1 ${inputClass}`}
            value={puzzle.answer}
            onChange={(event) => patch({ answer: event.target.value })}
          />
        </div>

        <div>
          <label htmlFor="aliases" className="block text-sm font-medium">
            Accepted aliases (one per line)
          </label>
          <textarea
            id="aliases"
            rows={4}
            className={`mt-1 ${inputClass} font-mono text-sm`}
            value={aliasText}
            onChange={(event) => setAliasText(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            Plurals are generated automatically for simple cases. Add anything irregular here.
          </p>
        </div>

        <div>
          <label htmlFor="clues" className="block text-sm font-medium">
            Clues, in unlock order (one per line)
          </label>
          <textarea
            id="clues"
            rows={8}
            className={`mt-1 ${inputClass} font-mono text-sm`}
            value={toLines(puzzle.clues)}
            onChange={(event) =>
              patch({ clues: event.target.value.split("\n").map((line) => line.trim()) })
            }
          />
        </div>

        <div>
          <label htmlFor="explanation" className="block text-sm font-medium">
            Explanation shown on the result screen
          </label>
          <textarea
            id="explanation"
            rows={4}
            className={`mt-1 ${inputClass}`}
            value={puzzle.explanation}
            onChange={(event) => patch({ explanation: event.target.value })}
          />
        </div>

        <div>
          <label htmlFor="sourceNotes" className="block text-sm font-medium">
            Source and rights notes
          </label>
          <textarea
            id="sourceNotes"
            rows={2}
            className={`mt-1 ${inputClass}`}
            value={puzzle.sourceNotes}
            onChange={(event) => patch({ sourceNotes: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="attemptsAllowed" className="block text-sm font-medium">
              Attempts
            </label>
            <input
              id="attemptsAllowed"
              type="number"
              min={1}
              className={`mt-1 ${inputClass}`}
              value={puzzle.attemptsAllowed}
              onChange={(event) => patch({ attemptsAllowed: Number(event.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="hintsAllowed" className="block text-sm font-medium">
              Hints
            </label>
            <input
              id="hintsAllowed"
              type="number"
              min={0}
              className={`mt-1 ${inputClass}`}
              value={puzzle.hintsAllowed}
              onChange={(event) => patch({ hintsAllowed: Number(event.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="scheduledDate" className="block text-sm font-medium">
              Scheduled date
            </label>
            <input
              id="scheduledDate"
              type="date"
              className={`mt-1 ${inputClass}`}
              value={puzzle.scheduledDate ?? ""}
              onChange={(event) => patch({ scheduledDate: event.target.value || null })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="author" className="block text-sm font-medium">
              Author
            </label>
            <input
              id="author"
              className={`mt-1 ${inputClass}`}
              value={puzzle.author}
              onChange={(event) => patch({ author: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="reviewer" className="block text-sm font-medium">
              Reviewer (must be a second person)
            </label>
            <input
              id="reviewer"
              className={`mt-1 ${inputClass}`}
              value={puzzle.reviewer ?? ""}
              onChange={(event) => patch({ reviewer: event.target.value || null })}
            />
          </div>
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={Boolean(puzzle.ambiguityCheckedAt)}
            onChange={(event) =>
              patch({ ambiguityCheckedAt: event.target.checked ? new Date().toISOString() : null })
            }
          />
          I played this round and confirmed the accepted answers are the only fair ones
        </label>

        <div>
          <label htmlFor="correctionNote" className="block text-sm font-medium">
            Correction note (shown to affected players)
          </label>
          <input
            id="correctionNote"
            className={`mt-1 ${inputClass}`}
            value={puzzle.correctionNote ?? ""}
            onChange={(event) => patch({ correctionNote: event.target.value || null })}
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            className={`mt-1 ${inputClass}`}
            value={puzzle.status}
            onChange={(event) => patch({ status: event.target.value as PuzzleStatus })}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p role="alert" className="rounded border border-negative/40 bg-negative/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="rounded border border-positive/40 bg-positive/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={busy}
            className="min-h-11 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => save("scheduled")}
            disabled={busy || errors.length > 0}
            title={
              errors.length > 0
                ? "Resolve the blocking issues above first."
                : "Save this puzzle and put it on the schedule."
            }
            className="min-h-11 rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken disabled:opacity-50"
          >
            Save and schedule
          </button>
        </div>
      </section>

      <section aria-labelledby="preview-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="preview-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Player preview
        </h2>
        <p className="mt-2 text-sm">
          <strong className="font-semibold">{puzzle.category}</strong> — answer is hidden here, as it
          is in play.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {puzzle.clues.map((clue, index) => (
            <li key={index}>{clue || <span className="text-muted">(empty clue)</span>}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          Accepted forms: {puzzle.answer ? "answer plus " : ""}
          {parseAliases(aliasText).length} editor alias
          {parseAliases(aliasText).length === 1 ? "" : "es"}.
        </p>
      </section>

      <section aria-labelledby="revisions-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="revisions-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Revision history
        </h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {revisions.map((revision) => (
            <li key={revision.revision} className="py-2">
              <span className="font-mono">rev {revision.revision}</span> &middot;{" "}
              {revision.changedBy} &middot; {new Date(revision.changedAt).toISOString().slice(0, 16)}
              {revision.note ? ` — ${revision.note}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
