/**
 * Brings a database that already has rows up to the current content.
 *
 * `npm run db:seed` only loads an empty database, so a developer or a tester
 * with rounds already in progress would never see new puzzles. This fills the
 * forward daily buffer without destroying anything.
 *
 * What is already there is identified by answer rather than by the seed's id,
 * because the seed derives ids from offsets relative to today and a database
 * that has drifted no longer agrees with it.
 *
 * Dates come from `planForwardPlacement`, which is unit tested. Only dailies
 * still in `draft`, `in_review` or `playtested` are ever re-placed: those
 * cannot be played, because `getPlayablePuzzle` only serves `published`, so
 * moving them cannot strand a round or leak an unreviewed answer. Anything
 * reviewed or live is passed to the planner as a fixed date and never touched.
 */
import { getDb } from "../src/db/client";
import { listAllPuzzles } from "../src/db/queries";
import { insertPuzzle } from "../src/db/seed";
import { buildSeedPuzzles } from "../src/content/puzzles";
import { todayUtc } from "@/lib/dates";
import {
  draftIdForDate,
  firstUncoveredDate,
  occupyingDateKeys,
  planForwardPlacement,
  QUEUED_DAILY_STATUSES,
} from "@/lib/forwardBuffer";
import { normalizeGuess } from "@/lib/normalize";
import { GAME_ID, type Puzzle } from "@/lib/types";

const db = getDb();
const now = new Date();
const nowIso = now.toISOString();
const today = todayUtc(now);

const existing = listAllPuzzles(db);
const existingIds = new Set(existing.map((puzzle) => puzzle.id));
const seeds = buildSeedPuzzles(now);

const existingAnswers = new Set(
  existing.filter((puzzle) => puzzle.kind === "daily").map((puzzle) => normalizeGuess(puzzle.answer)),
);

// Dailies already in the database that nobody has approved yet, oldest target
// date first so the intended running order is preserved.
const queued: Puzzle[] = existing
  .filter((puzzle) => puzzle.kind === "daily" && QUEUED_DAILY_STATUSES.includes(puzzle.status))
  .sort((a, b) => {
    const left = a.scheduledDate ?? "9999-12-31";
    const right = b.scheduledDate ?? "9999-12-31";
    if (left !== right) return left < right ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

const newSeeds = seeds.filter(
  (seed) =>
    seed.kind === "daily" &&
    seed.status === "in_review" &&
    !existingAnswers.has(normalizeGuess(seed.answer)),
);

const liveDates = occupyingDateKeys(existing);

const plan = planForwardPlacement({
  today,
  liveDates,
  queued: queued.map((puzzle) => ({ key: puzzle.id, answer: puzzle.answer })),
  newSeeds: newSeeds.map((seed) => ({ key: normalizeGuess(seed.answer), answer: seed.answer })),
});

const inserted: { id: string; dateKey: string; answer: string }[] = [];
const moved: { id: string; from: string | null; to: string }[] = [];

for (const stored of queued) {
  const dateKey = plan.get(stored.id);
  if (!dateKey || stored.scheduledDate === dateKey) continue;

  db.prepare(
    `UPDATE puzzles SET scheduled_date = ?, revision = revision + 1, updated_at = ? WHERE id = ?`,
  ).run(dateKey, nowIso, stored.id);
  db.prepare(
    `INSERT INTO puzzle_revisions (puzzle_id, revision, snapshot, changed_by, note, changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    stored.id,
    stored.revision + 1,
    JSON.stringify({ ...stored, scheduledDate: dateKey }),
    stored.author,
    "Re-placed onto the first free day",
    nowIso,
  );
  moved.push({ id: stored.id, from: stored.scheduledDate, to: dateKey });
}

for (const seed of newSeeds) {
  const key = normalizeGuess(seed.answer);
  const dateKey = plan.get(key);
  if (!dateKey) continue;

  // The editor names a daily `pc-<date>`. A re-placed queue can leave an id on
  // an earlier date than the one it was minted for, so that id may already be
  // taken; `draftIdForDate` then steps aside to a suffixed id rather than
  // deriving one from the answer, which would bake a space into a primary key.
  const id = draftIdForDate(dateKey, existingIds);
  insertPuzzle(db, {
    id,
    gameId: GAME_ID,
    kind: seed.kind,
    scheduledDate: dateKey,
    language: "en",
    category: seed.category,
    answer: seed.answer,
    aliases: seed.aliases,
    clues: seed.clues,
    explanation: seed.explanation,
    difficulty: seed.difficulty,
    sourceNotes: seed.sourceNotes,
    status: seed.status,
    attemptsAllowed: seed.attemptsAllowed,
    hintsAllowed: seed.hintsAllowed,
    author: seed.author,
    reviewer: seed.reviewer,
    ambiguityCheckedAt: seed.ambiguityCheckedAt,
    correctionNote: null,
    revision: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
  });
  db.prepare(
    `INSERT INTO puzzle_revisions (puzzle_id, revision, snapshot, changed_by, note, changed_at)
     VALUES (?, 1, ?, ?, ?, ?)`,
  ).run(
    id,
    JSON.stringify({ ...seed, id, scheduledDate: dateKey }),
    seed.author,
    "Forward buffer content drop",
    nowIso,
  );

  inserted.push({ id, dateKey, answer: seed.answer });
}

console.log(`Forward buffer: ${inserted.length} added, ${moved.length} re-placed.`);
for (const row of inserted) {
  console.log(`  + ${row.id}  ${row.dateKey}  ${row.answer}`);
}
for (const row of moved) {
  console.log(`  ~ ${row.id}  ${row.from ?? "undated"} -> ${row.to}`);
}
if (inserted.length === 0 && moved.length === 0) {
  console.log("  already in place");
}

console.log(`${inserted.length + queued.length} daily puzzle(s) are dated and waiting on a second reviewer.`);
console.log("Open each in /editor, add a reviewer, tick the ambiguity check, and move it");
console.log("to scheduled; the coverage alert stays red until you do.");
console.log(`Next day with nothing on it at all: ${firstUncoveredDate({ today, liveDates, plan })}`);

db.close();
