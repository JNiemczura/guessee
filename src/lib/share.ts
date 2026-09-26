import { GAME_LABEL, HUB_LABEL, type RoundMode, type RoundOutcome } from "./types";

export type ShareInput = {
  dateKey: string | null;
  mode: RoundMode;
  label: string;
  category: string;
  outcome: RoundOutcome;
  attemptsUsed: number;
  attemptsAllowed: number;
  hintsUsed: number;
  score: number;
  url: string;
};

const OUTCOME_TEXT: Record<RoundOutcome, string> = {
  correct: "Solved",
  attempts_exhausted: "Out of guesses",
  gave_up: "Gave up",
  expired: "Finished earlier",
};

function ordinal(count: number): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${count}th`;
  switch (count % 10) {
    case 1:
      return `${count}st`;
    case 2:
      return `${count}nd`;
    case 3:
      return `${count}rd`;
    default:
      return `${count}th`;
  }
}

/**
 * Share text for BR-06. Carries the game, the puzzle identity, and the outcome,
 * and never carries the answer, a guess, or any clue text.
 */
export function buildShareText({
  dateKey,
  mode,
  label,
  category,
  outcome,
  attemptsUsed,
  attemptsAllowed,
  hintsUsed,
  score,
  url,
}: ShareInput): string {
  const identity =
    mode === "practice"
      ? `${label} (practice)`
      : mode === "replay"
        ? `${label} ${dateKey} (replay)`
        : `${label} ${dateKey}`;

  const hintPart = hintsUsed > 0 ? `, ${ordinal(hintsUsed)} hint` : "";

  return [
    `${HUB_LABEL} · ${identity}`,
    `${OUTCOME_TEXT[outcome]} — ${category} · ${ordinal(attemptsUsed)} of ${attemptsAllowed} guesses${hintPart} · ${score} pts`,
    `No spoilers. Play: ${url}`,
  ].join("\n");
}

export { GAME_LABEL };
