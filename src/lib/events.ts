/**
 * Analytics vocabulary.
 *
 * Only the events needed to answer the product questions in the guidance are
 * recorded, and the property whitelist below is the enforcement point: guess
 * text, answers, aliases, and clue text can never reach the events table.
 */

export const EVENT_NAMES = [
  "game_start",
  "first_guess_submitted",
  "round_finish",
  "hint_used",
  "share_clicked",
  "practice_start",
  "practice_list_viewed",
  "rules_opened",
  "report_submitted",
  "analytics_consent_changed",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const ALLOWED_PROPS = new Set([
  "outcome",
  "kind",
  "attempts_used",
  "attempts_allowed",
  "hints_used",
  "score",
  "category",
  "difficulty",
  "duration_bucket",
  "report_kind",
  "consent",
  "clues_revealed",
]);

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value);
}

export function sanitizeProps(
  input: unknown,
): Record<string, string | number | boolean> {
  if (!input || typeof input !== "object") return {};

  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_PROPS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, 64);
  }
  return out;
}

const DURATION_BUCKETS: [number, string][] = [
  [30, "lt_30s"],
  [120, "lt_2m"],
  [300, "lt_5m"],
  [900, "lt_15m"],
];

export function durationBucket(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  for (const [limit, label] of DURATION_BUCKETS) {
    if (seconds < limit) return label;
  }
  return "gt_15m";
}

export const EVENT_DEFINITIONS: Record<EventName, string> = {
  game_start: "A daily round board was opened.",
  first_guess_submitted: "A player submitted their first valid guess of a round.",
  round_finish: "A round ended as a win, loss, or give-up.",
  hint_used: "A player spent score to reveal a clue early.",
  share_clicked: "A player copied or shared a result.",
  practice_start: "A practice round was opened.",
  practice_list_viewed: "The practice list was opened.",
  rules_opened: "The rules view was opened.",
  report_submitted: "A player reported a problem with a puzzle.",
  analytics_consent_changed: "The player changed their analytics choice.",
};
