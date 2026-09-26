import { isDateKey } from "./dates";
import { acceptedForms, normalizeGuess } from "./normalize";
import type { Puzzle } from "./types";

export type IssueSeverity = "error" | "warning";

export type ValidationIssue = {
  severity: IssueSeverity;
  field: string;
  code: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export const MAX_CLUES = 8;
export const MIN_CLUES = 3;
export const MAX_ANSWER_LENGTH = 60;

function containsWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.split(" ").some((word) => word === needle || word.startsWith(`${needle} `));
}

/**
 * Editorial checks run before a puzzle can be scheduled.
 *
 * Errors block scheduling. Warnings are shown but do not, because some of them
 * (a deliberately very short answer, say) are an editorial decision rather than
 * a defect.
 */
export function validatePuzzle(puzzle: Puzzle, allPuzzles: readonly Puzzle[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (severity: IssueSeverity, field: string, code: string, message: string) =>
    issues.push({ severity, field, code, message });

  const answer = puzzle.answer.trim();
  const normalizedAnswer = normalizeGuess(answer);

  if (!answer) {
    push("error", "answer", "answer_missing", "A canonical answer is required.");
  } else if (normalizedAnswer.length < 3) {
    push(
      "error",
      "answer",
      "answer_too_short",
      "Normalized answer is shorter than 3 characters, which is too easy to hit by accident.",
    );
  } else if (answer.length > MAX_ANSWER_LENGTH) {
    push("error", "answer", "answer_too_long", `Keep the answer under ${MAX_ANSWER_LENGTH} characters.`);
  }

  if (puzzle.kind === "daily" && !isDateKey(puzzle.scheduledDate)) {
    push("error", "scheduledDate", "date_invalid", "A daily puzzle needs a YYYY-MM-DD scheduled date.");
  }

  if (!puzzle.category.trim()) {
    push("error", "category", "category_missing", "A category is required so players know the answer format.");
  }

  const clues = puzzle.clues.map((clue) => clue.trim());
  const nonEmptyClues = clues.filter(Boolean);

  if (nonEmptyClues.length < MIN_CLUES) {
    push("error", "clues", "clues_too_few", `Provide at least ${MIN_CLUES} clues.`);
  }
  if (nonEmptyClues.length > MAX_CLUES) {
    push("error", "clues", "clues_too_many", `Provide at most ${MAX_CLUES} clues.`);
  }
  if (puzzle.attemptsAllowed < nonEmptyClues.length) {
    push(
      "warning",
      "attemptsAllowed",
      "attempts_below_clues",
      "Fewer attempts than clues means the last clues can never be reached.",
    );
  }

  const seenClues = new Set<string>();
  nonEmptyClues.forEach((clue, index) => {
    const normalized = normalizeGuess(clue);
    if (seenClues.has(normalized)) {
      push("warning", `clues.${index}`, "clue_duplicate", "Two clues say the same thing.");
    }
    seenClues.add(normalized);

    if (normalizedAnswer && normalized.includes(normalizedAnswer)) {
      push(
        "error",
        `clues.${index}`,
        "clue_contains_answer",
        "This clue contains the answer, which gives the round away.",
      );
    } else if (normalizedAnswer && containsWord(normalized, normalizedAnswer)) {
      push("error", `clues.${index}`, "clue_starts_with_answer", "This clue begins with the answer.");
    }
  });

  if (normalizedAnswer) {
    const firstClue = normalizeGuess(nonEmptyClues[0] ?? "");
    if (firstClue === normalizedAnswer) {
      push("error", "clues.0", "first_clue_is_answer", "Clue one must not be the answer itself.");
    }
  }

  if (!puzzle.explanation.trim()) {
    push(
      "error",
      "explanation",
      "explanation_missing",
      "An explanation is required so a finished round is satisfying (BR-04).",
    );
  }

  if (!puzzle.author.trim()) {
    push("error", "author", "author_missing", "Record who wrote the puzzle.");
  }

  if (!puzzle.reviewer?.trim()) {
    push("error", "reviewer", "reviewer_missing", "A second person must review before scheduling.");
  }
  if (!puzzle.ambiguityCheckedAt) {
    push(
      "error",
      "ambiguityCheckedAt",
      "ambiguity_unchecked",
      "Tick the ambiguity check: confirm the accepted answers are the only fair ones.",
    );
  }

  if (puzzle.difficulty < 1 || puzzle.difficulty > 5) {
    push("error", "difficulty", "difficulty_range", "Difficulty must be between 1 and 5.");
  }

  if (puzzle.attemptsAllowed < 1) {
    push("error", "attemptsAllowed", "attempts_invalid", "At least one attempt is required.");
  }
  if (puzzle.hintsAllowed < 0) {
    push("error", "hintsAllowed", "hints_invalid", "Hints cannot be negative.");
  }

  const aliasForms = acceptedForms(answer, puzzle.aliases);
  if (aliasForms.length === 0 && normalizedAnswer) {
    push("error", "aliases", "no_accepted_form", "No acceptable answer form could be derived.");
  }

  const normalizedAliases = puzzle.aliases.map((alias) => normalizeGuess(alias));
  if (normalizedAliases.includes(normalizedAnswer)) {
    push("warning", "aliases", "alias_redundant", "The canonical answer is already accepted; drop the alias.");
  }
  if (new Set(normalizedAliases).size !== normalizedAliases.length) {
    push("warning", "aliases", "alias_duplicate", "Two aliases normalize to the same text.");
  }

  const rivals = allPuzzles.filter(
    (other) =>
      other.id !== puzzle.id &&
      other.status !== "retired" &&
      normalizeGuess(other.answer) === normalizedAnswer,
  );
  if (rivals.length > 0) {
    push(
      "warning",
      "answer",
      "answer_reused",
      `The same answer already appears in ${rivals.map((rival) => rival.id).join(", ")}. Players will notice.`,
    );
  }

  const otherClueOwner = allPuzzles.find(
    (other) =>
      other.id !== puzzle.id &&
      other.status !== "retired" &&
      other.clues.some((clue) => normalizeGuess(clue) === normalizeGuess(nonEmptyClues[0] ?? "")) &&
      nonEmptyClues.length > 0,
  );
  if (otherClueOwner) {
    push(
      "warning",
      "clues.0",
      "clue_reused",
      `Clue one is also used by ${otherClueOwner.id}.`,
    );
  }

  if (!puzzle.sourceNotes.trim()) {
    push("warning", "sourceNotes", "source_missing", "Note the source or confirm the facts are common knowledge.");
  }

  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}

export function errorsOf(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter((issue) => issue.severity === "error");
}

export function warningsOf(result: ValidationResult): ValidationIssue[] {
  return result.issues.filter((issue) => issue.severity === "warning");
}
