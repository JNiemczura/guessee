/**
 * Editing a one-per-line field in a textarea.
 *
 * The obvious shape is to store the parsed array and re-derive the text on every
 * keystroke. That cannot work for a list, because parsing cannot represent the
 * half-finished line a user is standing on: pressing Enter produces a trailing
 * empty line, any parser that drops empties deletes it again, and the newline
 * vanishes before the cursor can land on it. An editor then cannot start a new
 * line at all, and the field looks frozen.
 *
 * So the raw text is what the textarea holds, and it is parsed on the way out.
 */
export function toLines(values: readonly string[]): string {
  return values.join("\n");
}

/**
 * Turns the textarea contents into stored aliases.
 *
 * Blank lines are dropped and each entry is trimmed, so trailing newlines and
 * stray spaces typed while editing never reach the database as an empty alias.
 */
export function parseAliases(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
