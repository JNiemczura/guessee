import { acceptedForms, normalizeGuess, seedForms } from "./normalize";

export const SUGGESTION_DISTANCE_SHORT = 1;
export const SUGGESTION_DISTANCE_LONG = 2;
export const LONG_WORD_LENGTH = 6;

/**
 * Levenshtein distance, abandoned early once every cell in a row exceeds
 * `maxDistance` so near-miss scans stay cheap.
 */
export function levenshtein(a: string, b: string, maxDistance = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
      if (current[j] < rowMin) rowMin = current[j];
    }

    if (rowMin > maxDistance) return maxDistance + 1;

    const swap = previous;
    previous = current;
    current = swap;
  }

  return previous[b.length];
}

export function suggestionThreshold(length: number): number {
  return length >= LONG_WORD_LENGTH
    ? SUGGESTION_DISTANCE_LONG
    : SUGGESTION_DISTANCE_SHORT;
}

export function closestForm(
  guess: string,
  candidates: readonly string[],
  maxDistance: number,
): { form: string; distance: number } | null {
  let best: { form: string; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = levenshtein(guess, candidate, maxDistance);
    if (distance > maxDistance) continue;
    if (!best || distance < best.distance) best = { form: candidate, distance };
  }

  return best;
}

export type MatchOptions = {
  acceptTypos?: boolean;
};

export type MatchResult = {
  correct: boolean;
  matchedForm: string | null;
  suggestion: string | null;
};

/**
 * Decides whether a raw guess matches the answer.
 *
 * Typos are reported as a suggestion rather than accepted by default: a near
 * miss must never be able to win the round, but the player should be told what
 * the intended spelling was. Set `acceptTypos` to flip that policy.
 */
export function matchGuess(
  rawGuess: string,
  answer: string,
  aliases: readonly string[] = [],
  options: MatchOptions = {},
): MatchResult {
  const guess = normalizeGuess(rawGuess);
  if (!guess) return { correct: false, matchedForm: null, suggestion: null };

  const forms = acceptedForms(answer, aliases);
  if (forms.includes(guess)) {
    return { correct: true, matchedForm: guess, suggestion: null };
  }

  const threshold = suggestionThreshold(guess.length);
  const suggestable = seedForms(answer, aliases);
  const near = closestForm(guess, suggestable, threshold);

  if (options.acceptTypos && near) {
    return { correct: true, matchedForm: near.form, suggestion: null };
  }

  return {
    correct: false,
    matchedForm: null,
    suggestion: near && near.form !== guess ? near.form : null,
  };
}
