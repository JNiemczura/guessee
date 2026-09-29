import { addUtcDays } from "./dates";

/**
 * Decides which date each unreviewed daily should sit on.
 *
 * The seed dates its content relative to the day it runs, so a database seeded
 * a week ago has a schedule that has drifted with it. Placing new content on a
 * fixed offset from the seed therefore drops it past a hole instead of into it,
 * and starting the fill on the day *after* today silently drops today itself:
 * a puzzle can be authored for today and still end up nowhere near it.
 *
 * The rule is simple and total: walk forward from today and give every queued
 * daily the next day that nothing live already holds. Today is included when
 * nothing covers it, because an uncovered today is a hole like any other.
 *
 * Only ever applied to dailies still in `draft`, `in_review` or `playtested`.
 * Those cannot be played, so moving them cannot strand a round or expose an
 * unreviewed answer; anything reviewed or live is passed in as fixed.
 */
export type PlannablePuzzle = {
  /** Caller-chosen identity. For queued rows the puzzle id; for new seeds the normalized answer. */
  key: string;
  answer: string;
  /**
   * The date the row holds today, if any. Advisory only: a queued daily does
   * not reserve its own date, because that is exactly how a drifted queue ends
   * up stranded behind a hole. It is carried so callers can report the move.
   */
  scheduledDate?: string | null;
};

export function planForwardPlacement({
  today,
  liveDates,
  queued,
  newSeeds,
}: {
  today: string;
  /** Dates held by anything reviewed or live, which may not be moved. */
  liveDates: (string | null)[];
  queued: PlannablePuzzle[];
  newSeeds: PlannablePuzzle[];
}): Map<string, string> {
  const taken = new Set(liveDates.filter((date): date is string => Boolean(date)));
  let cursor = taken.has(today) ? addUtcDays(today, 1) : today;

  const plan = new Map<string, string>();

  for (const item of [...queued, ...newSeeds]) {
    let day = cursor;
    while (taken.has(day)) day = addUtcDays(day, 1);
    taken.add(day);
    plan.set(item.key, day);
    cursor = addUtcDays(day, 1);
  }

  return plan;
}

/**
 * The first date from `today` onwards that nothing holds, for reporting. A plan
 * that leaves a gap here means content has been authored for a day that is no
 * longer reachable, which is worth saying out loud.
 */
export function firstUncoveredDate({
  today,
  liveDates,
  plan,
}: {
  today: string;
  liveDates: (string | null)[];
  plan: Map<string, string>;
}): string | null {
  const taken = new Set<string>([
    ...liveDates.filter((date): date is string => Boolean(date)),
    ...plan.values(),
  ]);

  let day = taken.has(today) ? addUtcDays(today, 1) : today;
  while (taken.has(day)) day = addUtcDays(day, 1);
  return day;
}

/**
 * Picks an unused puzzle id for a new draft on a given date.
 *
 * The obvious id for a daily is `pc-<date>`, which is what both the seed and
 * the editor have always used. That convention quietly breaks once an id and a
 * date can disagree: re-placing a drifted queue to fill a hole moves a row to a
 * new date but leaves its old id alone, so a later draft for the date that id
 * was originally minted for collides with it. Rather than renaming live rows,
 * which would break revision history and every id already handed out, the new
 * draft steps aside and takes a suffixed id.
 */
export function draftIdForDate(dateKey: string, takenIds: Iterable<string> = []): string {
  const taken = new Set(takenIds);
  const base = `pc-${dateKey}`;
  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
