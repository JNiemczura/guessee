import { redirect } from "next/navigation";

import { EditorBoard } from "@/components/EditorBoard";
import { getDb } from "@/db/client";
import { dailyCoverage, listAllPuzzles } from "@/db/queries";
import { addUtcDays, formatUtcDate, todayUtc } from "@/lib/dates";
import { isAuthorized } from "@/server/editorAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

const STATUS_ORDER = [
  "draft",
  "in_review",
  "playtested",
  "scheduled",
  "published",
  "corrected",
  "retired",
] as const;

export default async function EditorPage() {
  if (!(await isAuthorized())) {
    redirect("/editor/login");
  }

  const now = new Date();
  const db = getDb();
  const puzzles = listAllPuzzles(db);
  const coverage = dailyCoverage(db, 14);
  const missing = coverage.filter((day) => !day.covered);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editorial queue</h1>
          <p className="mt-1 text-sm text-muted">
            Draft, review, schedule, and publish without a code deployment.
          </p>
        </div>
        <a
          href="/api/coverage?format=export"
          className="min-h-11 rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
        >
          Export all puzzles (JSON)
        </a>
      </header>

      <section
        aria-labelledby="coverage-heading"
        className="rounded-lg border border-line bg-surface p-5"
      >
        <h2 id="coverage-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Next 14 days
        </h2>
        {missing.length === 0 ? (
          <p className="mt-2 text-sm">
            Every day for the next two weeks has a reviewed puzzle. The launch target is a buffer of
            at least this much.
          </p>
        ) : (
          <div role="alert" className="mt-2 rounded border border-negative/40 bg-negative/10 p-3">
            <p className="text-sm font-semibold">
              {missing.length} day{missing.length === 1 ? "" : "s"} without an official puzzle
            </p>
            <ul className="mt-1 flex flex-wrap gap-2 text-sm">
              {missing.map((day) => (
                <li key={day.dateKey} className="rounded bg-surface px-2 py-1 font-mono">
                  {formatUtcDate(day.dateKey)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {STATUS_ORDER.map((status) => {
        const group = puzzles.filter((puzzle) => puzzle.status === status);
        if (group.length === 0) return null;

        return (
          <section key={status} aria-labelledby={`status-${status}`}>
            <h2
              id={`status-${status}`}
              className="text-sm font-semibold uppercase tracking-wide text-muted"
            >
              {status.replace("_", " ")} ({group.length})
            </h2>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
              {group.map((puzzle) => (
                <li key={puzzle.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <span className="min-w-0">
                    <span className="block font-mono text-sm">{puzzle.id}</span>
                    <span className="block text-sm text-muted">
                      {puzzle.category} &middot;{" "}
                      {puzzle.scheduledDate ? formatUtcDate(puzzle.scheduledDate) : "unscheduled"}{" "}
                      &middot; rev {puzzle.revision}
                      {puzzle.reviewer ? ` · reviewed by ${puzzle.reviewer}` : " · unreviewed"}
                    </span>
                  </span>
                  <a
                    href={`/editor/puzzles/${encodeURIComponent(puzzle.id)}`}
                    className="min-h-11 rounded border border-line px-3 py-2 text-sm font-medium hover:bg-surface-sunken"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <EditorBoard nextDate={missing[0]?.dateKey ?? addUtcDays(todayUtc(now), coverage.length)} />

      <p className="text-xs text-muted">
        Signed in with the editor key stored in an httpOnly cookie.
      </p>
    </div>
  );
}
