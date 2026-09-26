# Guessee

A daily guessing hub. One short puzzle a day, published at **00:00 UTC**, plus a separate practice
and archive bank. The product rules and requirements live in [`dle_product_guidance.md`](dle_product_guidance.md).

This is the first working draft. It covers the Must requirements (BR-01 to BR-10); the human
milestones in that document still need real players.

## Running it

```bash
npm install
cp .env.example .env.local     # then set a real GUESSEE_EDITOR_KEY
npm run dev                    # http://localhost:3000
```

The SQLite file is created and seeded with the sample content set on first request. There is no
separate migration step for a fresh clone.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run db:seed` | Seeds the database and prints what loaded |
| `npm run check:coverage` | Prints the 14-day content report; exits `1` if a day is uncovered |

### Environment

| Variable | Purpose |
| --- | --- |
| `GUESSEE_DB_PATH` | SQLite location, default `./data/guessee.db` |
| `GUESSEE_EDITOR_KEY` | Required to reach `/editor`. A single shared secret; accounts are out of MVP scope |
| `GUESSEE_TOKEN_SECRET` | Signs round tokens |
| `GUESSEE_ALERT_TOKEN` | Optional separate key for the scheduled coverage check, so a cron job never needs the editor key |
| `GUESSEE_ALERT_WEBHOOK` | Optional Slack or Discord incoming webhook for the missing-puzzle alert |
| `NEXT_PUBLIC_SITE_ORIGIN` | Origin used in share links |

`data/` and `.env*` are git-ignored. Only `.env.example` is committed.

## How a round works

Five clues, five guesses, one hint, 100 points to start. A wrong guess costs 10 points and an
attempt and unlocks the next clue; a hint costs 20 points and no attempt; the score never goes below
zero. Guessing the answer ends the round immediately on any attempt.

Input handling: case, accents, apostrophes, and surrounding punctuation are forgiven, plurals are
generated in both directions, and editor aliases are accepted. A near miss is **not** a win — it is
reported as a "did you mean" note and costs an attempt, so a typo can never win a round. A repeated
guess is rejected and never costs an attempt.

### Daily, replay, and practice

| Mode | How you get there | Effect |
| --- | --- | --- |
| Daily | `/play` | One puzzle for everyone, opens at 00:00 UTC, closes at the next reset |
| Replay | `/practice` → Daily archive | A day you can still play after it ended |
| Practice | `/practice` → Practice bank | Rounds authored separately from the daily |

A daily round opened during its own day is the official one, and an unfinished one is closed at the
reset so it still gets a proper reveal. A round opened *after* that day ended is an archive replay:
it never expires, it is labelled as a replay, and it can never change what happened that day. Both
are decided server-side from the round's own `started_at`, so a client cannot ask to be treated as
the official round.

## The server never hands over the answer early

`/play` renders the category, the puzzle id, and the first clue. The answer, the explanation, the
aliases, and the unearned clues stay on the server: the client component receives a shell, not a
puzzle. `/api/reveal` answers `409` unless the session's round is genuinely finished.

A finished round is recorded in a `rounds` ledger keyed on `(session_id, puzzle_id)`. Guesses are
never stored as text — only a SHA-256 hash of the normalized guess, which is enough to detect a
repeat without keeping what someone typed.

## The editor

`/editor` is key-gated (`robots: noindex`) and covers the editorial workflow end to end: a draft
queue grouped by status, a 14-day coverage report that names every day without a reviewed puzzle,
a per-puzzle form with live validation, a revision history, and a JSON export of everything.

Nothing is scheduled until it passes validation: a second reviewer, a ticked ambiguity check, at
least three clues, and no clue that contains or begins with the answer. Errors block; warnings
(such as fewer attempts than clues) are shown but do not, because some of them are editorial
judgement rather than defects.

Status moves follow a fixed graph — `draft → in_review → playtested → scheduled → published`, with
`corrected` and `retired` alongside — and a `scheduled` puzzle publishes itself at its date.

## Catching a missing puzzle

A daily game that silently skips a day is the failure that loses an audience, so coverage is checked
by something outside the app. Run it from a laptop cron or any scheduler:

```bash
npm run check:coverage                 # exits 1 when a day is uncovered
```

or point a scheduler at the endpoint, which answers `200` either way and sets a header:

```bash
curl -H "x-guessee-key: $GUESSEE_EDITOR_KEY" https://guessee.example/api/alerts/coverage
# x-guessee-coverage: missing_puzzles
```

Set `GUESSEE_ALERT_WEBHOOK` to a Slack or Discord incoming webhook and the same check posts the
message there, so a human hears about it. `GUESSEE_ALERT_TOKEN` lets the scheduler use its own key
instead of the editor one. A day counts as covered if it has a `scheduled` or `published` daily, and
the check also complains when fewer than seven reviewed days are queued ahead.

The alert payload carries date keys and counts only, never an answer or a clue.

## When something breaks

Errors are recorded so a failed round is visible to the person who can fix it:

- `src/components/ErrorReporter.tsx` captures uncaught browser errors and unhandled rejections and
  posts them to `/api/errors`. Consent does not apply: analytics describe how someone plays, but an
  error means the game failed for them.
- The round, guess, hint, give-up, and reveal handlers record anything that is not an expected
  `RoundError`. Expected rejections, such as a wrong guess, stay out of the log.
- `/editor` shows the last ten errors and a 24-hour count, and `/api/editor/errors` returns them as
  JSON.

Two deliberate choices are worth knowing before changing this:

- There is no `instrumentation.ts`. Next compiles that file into an edge bundle as well as the node
  one, and `better-sqlite3` cannot be resolved there, so server errors are captured in the handlers
  (`src/server/withErrorCapture.ts` and `recordServerError`) instead.
- Message and stack are length-capped and whitespace-flattened when written, and a session that
  reports more than twenty times in ten minutes is dropped rather than stored.

## Analytics

Nothing is recorded before a choice is made, and declining is permanent and equally supported. With
consent, only which puzzle was played and how the round ended are sent: no guesses, no answers, no
clue text.

## Layout

```
src/app/          routes (pages and route handlers)
src/components/   client components
src/lib/          pure rules: normalize, match, score, round state machine, validation, sharing
src/db/           schema, mapping, queries, seed
src/server/       round service, editor auth, coverage alert, error log
src/content/      the sample puzzle set
```

`src/lib/round.ts` is the single implementation of the rules. The server persists through it, so
scoring and the end conditions cannot drift between the client and the server. The tests in
`src/**/*.test.ts` cover the rule set directly, and `src/server/roundService.test.ts` covers the
same rules against a real in-memory database.
