"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSessionId, trackEvent } from "@/lib/clientAnalytics";
import { durationBucket } from "@/lib/events";
import { buildShareText } from "@/lib/share";
import type { GuessResponse, RevealPayload, RoundMode } from "@/lib/types";
import { GAME_LABEL } from "@/lib/types";

type Clue = { text: string; unlockedByHint: boolean };

type StoredRound = {
  guesses: { text: string; correct: boolean; at: number }[];
  startedAt: number;
};

function storageKey(puzzleId: string): string {
  return `guessee.round.${puzzleId}`;
}

function readStored(puzzleId: string): StoredRound | null {
  try {
    const raw = window.localStorage.getItem(storageKey(puzzleId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<StoredRound>;
    if (!Array.isArray(value.guesses) || typeof value.startedAt !== "number") return null;
    return { guesses: value.guesses, startedAt: value.startedAt };
  } catch {
    return null;
  }
}

function writeStored(puzzleId: string, value: StoredRound): void {
  try {
    window.localStorage.setItem(storageKey(puzzleId), JSON.stringify(value));
  } catch {
    /* storage can be full or blocked; the round still works without it */
  }
}

function clearStored(puzzleId: string): void {
  try {
    window.localStorage.removeItem(storageKey(puzzleId));
  } catch {
    /* ignore */
  }
}

export type BoardProps = {
  puzzleId: string;
  mode: RoundMode;
  dateKey: string | null;
  category: string;
  attemptsAllowed: number;
  hintsAllowed: number;
  clueCount: number;
  initialClues: string[];
  nextResetAtUtc: string;
  resetAtUtc: string;
  correctionNote: string | null;
  shareOrigin: string;
};

type Tone = "neutral" | "good" | "bad";

const MODE_LABEL: Record<RoundMode, string> = {
  daily: "Daily puzzle",
  replay: "Archive replay",
  practice: "Practice round",
};

const MODE_NOTE: Record<RoundMode, string | null> = {
  daily: null,
  replay:
    "This day is over, so this replay is separate from the official daily result. It cannot change what happened that day.",
  practice: null,
};

export function RoundBoard(props: BoardProps) {
  /**
   * The stored round is read during the first client render. Nothing depends on
   * it before the mount effect finishes, so the server-rendered markup is
   * unaffected and there is no hydration mismatch.
   */
  const [stored] = useState(() => readStored(props.puzzleId));

  const [clues, setClues] = useState<Clue[]>(() =>
    props.initialClues.map((text) => ({ text, unlockedByHint: false })),
  );
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [guesses, setGuesses] = useState<StoredRound["guesses"]>(stored?.guesses ?? []);
  const [startedAt] = useState(() => stored?.startedAt ?? Date.now());

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"playing" | "finished">("playing");

  const [feedback, setFeedback] = useState<{ text: string; tone: Tone } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef("");
  const firstGuessSent = useRef(false);

  const attemptsLeft = Math.max(0, props.attemptsAllowed - attemptsUsed);
  const hintsLeft = Math.max(0, props.hintsAllowed - hintsUsed);

  const applyServerState = useCallback(
    (data: {
      round: {
        attemptsUsed: number;
        hintsUsed: number;
        cluesRevealed: number;
        status: "playing" | "finished";
      };
      clues: string[];
    }) => {
      setAttemptsUsed(data.round.attemptsUsed);
      setHintsUsed(data.round.hintsUsed);
      setStatus(data.round.status);
      setClues(
        data.clues.map((text, index) => ({
          text,
          unlockedByHint: index > 0 && index < data.round.cluesRevealed && data.round.hintsUsed > 0,
        })),
      );
    },
    [],
  );

  const loadReveal = useCallback(async () => {
    const response = await fetch(
      `/api/reveal?session=${encodeURIComponent(sessionIdRef.current)}&puzzle=${encodeURIComponent(props.puzzleId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const data = (await response.json()) as { reveal: RevealPayload };
    setReveal(data.reveal);
  }, [props.puzzleId]);

  useEffect(() => {
    const sessionId = getSessionId();
    sessionIdRef.current = sessionId;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/round", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, puzzleId: props.puzzleId }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setLoadError(data.error ?? "This puzzle could not be opened.");
          return;
        }

        if (cancelled) return;

        applyServerState(data);
        setLoading(false);

        if (data.round.status === "finished") {
          await loadReveal();
        } else {
          trackEvent("game_start", {
            kind: props.dateKey ? "daily" : "practice",
            puzzle_id: props.puzzleId,
          });
        }
      } catch {
        if (!cancelled) setLoadError("This puzzle could not be opened. Check your connection.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyServerState, loadReveal, props.dateKey, props.puzzleId]);

  const persist = useCallback(
    (next: StoredRound["guesses"]) => {
      writeStored(props.puzzleId, { guesses: next, startedAt });
    },
    [props.puzzleId, startedAt],
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || status === "finished") return;

    const form = event.currentTarget;
    const input = form.elements.namedItem("guess") as HTMLInputElement | null;
    const guess = input?.value.trim() ?? "";
    const text = guess || input?.value || "";

    if (!text.trim()) {
      setFeedback({ text: "Enter a word to search for.", tone: "bad" });
      setAnnouncement("Enter a word to search for.");
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setShareState("idle");

    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, puzzleId: props.puzzleId, guess: text }),
      });

      const data = (await response.json()) as GuessResponse & { clues?: string[]; error?: string };

      if (!response.ok) {
        setFeedback({ text: data.error ?? "That guess could not be recorded.", tone: "bad" });
        setAnnouncement(data.error ?? "That guess could not be recorded.");
        return;
      }

      if (data.verdict !== "rejected") {
        const next = [
          ...guesses,
          { text: text.trim(), correct: data.verdict === "correct", at: Date.now() },
        ];
        setGuesses(next);
        persist(next);
      }

      if (data.clues) {
        setClues(
          data.clues.map((clueText, index) => ({
            text: clueText,
            unlockedByHint:
              index > 0 && index < data.cluesRevealed && data.hintUsed && index === data.cluesRevealed - 1,
          })),
        );
      }

      setAttemptsUsed(data.attemptsUsed);
      setStatus(data.status);
      setFeedback({
        text: data.message,
        tone: data.verdict === "correct" ? "good" : data.verdict === "rejected" ? "bad" : "neutral",
      });
      setAnnouncement(data.message);

      if (!firstGuessSent.current) {
        firstGuessSent.current = true;
        trackEvent("first_guess_submitted", {
          kind: props.dateKey ? "daily" : "practice",
          puzzle_id: props.puzzleId,
        });
      }

      if (data.status === "finished") {
        await loadReveal();
        trackEvent("round_finish", {
          outcome: data.outcome ?? "expired",
          kind: props.dateKey ? "daily" : "practice",
          puzzle_id: props.puzzleId,
          attempts_used: data.attemptsUsed,
          attempts_allowed: props.attemptsAllowed,
          hints_used: data.hintUsed ? hintsUsed + 1 : hintsUsed,
          score: data.score ?? 0,
          category: props.category,
          duration_bucket: durationBucket((Date.now() - startedAt) / 1000),
        });
        clearStored(props.puzzleId);
      }
    } catch {
      setFeedback({ text: "That did not reach the server. Try again.", tone: "bad" });
    } finally {
      setBusy(false);
      if (input) input.value = "";
      inputRef.current?.focus();
    }
  };

  const onHint = async () => {
    if (busy || status === "finished" || hintsLeft === 0) return;
    setBusy(true);

    try {
      const response = await fetch("/api/hint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, puzzleId: props.puzzleId }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        const message = data.error ?? data.message ?? "No hint available.";
        setFeedback({ text: message, tone: "bad" });
        setAnnouncement(message);
        return;
      }

      setHintsUsed(data.hintsUsed);
      setClues((current) =>
        current.some((clue) => clue.text === data.nextClue)
          ? current.map((clue) =>
              clue.text === data.nextClue ? { ...clue, unlockedByHint: true } : clue,
            )
          : [...current, { text: data.nextClue, unlockedByHint: true }],
      );
      setFeedback({ text: data.message, tone: "neutral" });
      setAnnouncement(`Hint used. New clue: ${data.nextClue}`);
      trackEvent("hint_used", { puzzle_id: props.puzzleId, hints_used: data.hintsUsed });
    } finally {
      setBusy(false);
    }
  };

  const onGiveUp = async () => {
    if (busy || status === "finished") return;
    setBusy(true);

    try {
      const response = await fetch("/api/giveup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, puzzleId: props.puzzleId }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setFeedback({ text: data.error ?? data.message ?? "Could not close the round.", tone: "bad" });
        return;
      }

      setStatus("finished");
      await loadReveal();
      clearStored(props.puzzleId);
      trackEvent("round_finish", {
        outcome: "gave_up",
        kind: props.dateKey ? "daily" : "practice",
        puzzle_id: props.puzzleId,
        attempts_used: attemptsUsed,
        attempts_allowed: props.attemptsAllowed,
        hints_used: hintsUsed,
        score: 0,
        category: props.category,
        duration_bucket: durationBucket((Date.now() - startedAt) / 1000),
      });
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!reveal) return;

    const text = buildShareText({
      dateKey: props.dateKey,
      mode: props.mode,
      label: GAME_LABEL,
      category: props.category,
      outcome: reveal.outcome,
      attemptsUsed: reveal.attemptsUsed,
      attemptsAllowed: reveal.attemptsAllowed,
      hintsUsed: reveal.hintsUsed,
      score: reveal.score,
      url: `${props.shareOrigin}/play${props.dateKey ? `?date=${props.dateKey}` : `?puzzle=${props.puzzleId}`}`,
    });

    try {
      await navigator.clipboard.writeText(text);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }

    trackEvent("share_clicked", {
      outcome: reveal.outcome,
      kind: props.mode,
      puzzle_id: props.puzzleId,
    });
  };

  if (loadError) {
    return (
      <section aria-labelledby="board-heading" className="rounded-lg border border-line bg-surface p-5">
        <h1 id="board-heading" className="text-xl font-semibold">
          Puzzle unavailable
        </h1>
        <p className="mt-2 text-muted">{loadError}</p>
      </section>
    );
  }

  if (loading) {
    return (
      <p className="text-muted" role="status">
        Loading today&rsquo;s puzzle&hellip;
      </p>
    );
  }

  if (status === "finished" && reveal) {
    return (
      <ResultView
        reveal={reveal}
        shareState={shareState}
        onShare={onShare}
        category={props.category}
        mode={props.mode}
        dateKey={props.dateKey}
      />
    );
  }

  return (
    <section aria-labelledby="board-heading">
      <header className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm uppercase tracking-wide text-muted">{MODE_LABEL[props.mode]}</p>
        <h1 id="board-heading" className="mt-1 text-2xl font-semibold">
          {props.category}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Puzzle {props.puzzleId} &middot; {attemptsLeft} of {props.attemptsAllowed} guesses left
          {hintsLeft > 0 ? ` · ${hintsLeft} hint available` : " · no hints left"}
        </p>
        {MODE_NOTE[props.mode] ? (
          <p className="mt-3 rounded border border-line bg-surface-sunken p-3 text-sm">
            {MODE_NOTE[props.mode]}
          </p>
        ) : null}
        {props.correctionNote ? (
          <p className="mt-3 rounded border border-warning/40 bg-warning/10 p-3 text-sm">
            <strong className="font-semibold">Correction: </strong>
            {props.correctionNote}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="clues-heading" className="mt-4 rounded-lg border border-line bg-surface p-5">
        <h2 id="clues-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Clues ({clues.length} of {props.clueCount})
        </h2>
        <ol className="mt-3 space-y-3">
          {clues.map((clue, index) => (
            <li key={`${index}-${clue.text}`} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold"
              >
                {index + 1}
              </span>
              <span>
                {clue.text}
                {clue.unlockedByHint ? (
                  <span className="ml-2 text-xs uppercase tracking-wide text-muted">hint</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guess-heading" className="mt-4 rounded-lg border border-line bg-surface p-5">
        <h2 id="guess-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Your guess
        </h2>

        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="guess" className="sr-only">
              Answer for {props.category}
            </label>
            <input
              ref={inputRef}
              id="guess"
              name="guess"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={80}
              disabled={busy}
              aria-describedby="guess-help"
              className="min-h-11 w-full rounded border border-line bg-background px-3 py-2 text-base"
            />
            <p id="guess-help" className="mt-1 text-xs text-muted">
              Spelling, accents, and punctuation are forgiving. A repeated guess never costs an
              attempt.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded bg-accent px-5 py-2 font-medium text-accent-contrast hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Guess"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onHint}
            disabled={busy || hintsLeft === 0 || clues.length >= props.clueCount}
            className="min-h-11 rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken disabled:opacity-50"
          >
            Use a hint ({hintsLeft} left, costs 20 points)
          </button>
          <button
            type="button"
            onClick={onGiveUp}
            disabled={busy}
            className="min-h-11 rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken disabled:opacity-50"
          >
            Give up and see the answer
          </button>
        </div>

        {feedback ? (
          <p
            className={`mt-4 rounded border p-3 text-sm ${
              feedback.tone === "good"
                ? "border-positive/40 bg-positive/10"
                : feedback.tone === "bad"
                  ? "border-negative/40 bg-negative/10"
                  : "border-line bg-surface-sunken"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </section>

      {guesses.length > 0 ? (
        <section aria-labelledby="history-heading" className="mt-4 rounded-lg border border-line bg-surface p-5">
          <h2 id="history-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
            Your guesses
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {guesses.map((guess, index) => (
              <li
                key={`${guess.at}-${index}`}
                className="rounded bg-surface-sunken px-2 py-1 text-sm"
              >
                {guess.text}
                <span className="ml-1 text-xs text-muted">{guess.correct ? "correct" : "no"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Attempts used: {attemptsUsed}</p>
        </section>
      ) : null}

      <p className="mt-4 text-xs text-muted">
        Category and puzzle id are shown before your first guess.{" "}
        <a href={`/report/${props.puzzleId}`} className="underline">
          Report a problem with this puzzle
        </a>
      </p>
    </section>
  );
}

function ResultView({
  reveal,
  shareState,
  onShare,
  category,
  mode,
  dateKey,
}: {
  reveal: RevealPayload;
  shareState: "idle" | "copied" | "failed";
  onShare: () => void;
  category: string;
  mode: RoundMode;
  dateKey: string | null;
}) {
  const heading =
    reveal.outcome === "correct"
      ? "Solved"
      : reveal.outcome === "gave_up"
        ? "Round closed"
        : reveal.outcome === "expired"
          ? "Yesterday's puzzle"
          : "Out of guesses";

  return (
    <section aria-labelledby="result-heading" className="space-y-4">
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm uppercase tracking-wide text-muted">
          {dateKey ? `${MODE_LABEL[mode]} ${dateKey}` : MODE_LABEL[mode]} &middot; {category}
        </p>
        <h1 id="result-heading" className="mt-1 text-2xl font-semibold">
          {heading}
        </h1>

        <p className="mt-3 text-lg">
          The answer was{" "}
          <strong className="font-semibold underline decoration-dotted underline-offset-4">
            {reveal.answer}
          </strong>
          .
        </p>

        {reveal.aliases.length > 0 ? (
          <p className="mt-1 text-sm text-muted">
            Also accepted: {reveal.aliases.join(", ")}
          </p>
        ) : null}

        <p className="mt-3 text-sm text-muted">
          {reveal.attemptsUsed} of {reveal.attemptsAllowed} guesses used
          {reveal.hintsUsed > 0 ? `, ${reveal.hintsUsed} hint used` : ", no hints"} &middot;{" "}
          <strong className="font-semibold text-foreground">{reveal.score} points</strong>
        </p>

        <div className="mt-4 rounded border border-line bg-surface-sunken p-3">
          <h2 className="text-sm font-semibold">Why it is the answer</h2>
          <p className="mt-1 text-sm">{reveal.explanation}</p>
        </div>

        {reveal.correctionNote ? (
          <p className="mt-3 rounded border border-warning/40 bg-warning/10 p-3 text-sm">
            <strong className="font-semibold">Correction: </strong>
            {reveal.correctionNote}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onShare}
            className="min-h-11 rounded bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90"
          >
            Copy a spoiler-free result
          </button>
          <a
            href="/practice"
            className="inline-flex min-h-11 items-center rounded border border-line px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
          >
            Play a practice round
          </a>
        </div>

        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-muted">
          {shareState === "copied" ? "Copied. Nothing in it reveals the answer." : null}
          {shareState === "failed" ? "Copy failed. Select the text manually." : null}
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Clue path</h2>
        <ol className="mt-2 space-y-2">
          {reveal.clues.map((clue, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs"
              >
                {index + 1}
              </span>
              <span>{clue}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
