const COMBINING_MARKS = /[\u0300-\u036f]/g;
const APOSTROPHES = /['\u2018\u2019\u02bc]/g;
const NON_WORD = /[^\p{L}\p{N}\s]/gu;

/**
 * Latin letters that carry no combining mark, so NFKD leaves them intact.
 * Folding them keeps "Łódź" and "lodz" comparable instead of silently failing.
 */
const LETTER_FOLD: Record<string, string> = {
  "\u0141": "l",
  "\u0142": "l",
  "\u0110": "d",
  "\u0111": "d",
  "\u00f8": "o",
  "\u00fe": "th",
  "\u00f0": "d",
  "\u00df": "ss",
  "\u00e6": "ae",
  "\u0153": "oe",
};

const FOLDED_LETTERS = new RegExp(Object.keys(LETTER_FOLD).join("|"), "gu");

/**
 * Folds a guess or an accepted answer into a comparable form.
 *
 * Order matters: apostrophes are dropped before punctuation becomes a space so
 * that "don't" and "dont" agree, while "star-wars" and "star wars" both reduce
 * to "star wars".
 */
export function normalizeGuess(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(FOLDED_LETTERS, (char) => LETTER_FOLD[char.toLowerCase()] ?? char)
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(NON_WORD, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SIBILANT = /(s|x|z|ch|sh)$/;
const CONSONANT_Y = /[^aeiou]y$/;
const CONSONANT_O = /[^aeiou]o$/;
const PLURAL_IES = /ies$/;
const PLURAL_ES = /(ches|shes|sses|xes|zes)$/;

/**
 * English plural and singular variants of a single already-normalized word.
 *
 * Deliberately generous: extra accepted spellings only widen what a player can
 * type, and editors can always narrow the set with an explicit alias list.
 * Already-plural words are only walked backwards, so no nonsense doubling such
 * as "expectationses" is ever accepted.
 */
export function pluralForms(word: string): string[] {
  if (word.length < 3) return [];

  const forms = new Set<string>();
  const add = (form: string) => {
    if (form && form !== word) forms.add(form);
  };

  if (!word.endsWith("s")) {
    if (SIBILANT.test(word) || CONSONANT_O.test(word)) add(`${word}es`);
    else if (CONSONANT_Y.test(word)) add(`${word.slice(0, -1)}ies`);
    else add(`${word}s`);
  }

  if (word.endsWith("ss")) add(`${word}es`);
  else if (PLURAL_IES.test(word) && word.length > 4) add(`${word.slice(0, -3)}y`);
  else if (PLURAL_ES.test(word)) add(word.slice(0, -2));
  else if (word.endsWith("s")) add(word.slice(0, -1));

  return [...forms];
}

function phrasePluralVariants(phrase: string): string[] {
  const parts = phrase.split(" ");
  if (parts.length === 0) return [];
  if (parts.length === 1) return pluralForms(parts[0]);

  const head = parts.slice(0, -1).join(" ");
  const last = parts[parts.length - 1];
  return pluralForms(last).map((variant) => `${head} ${variant}`);
}

export function seedForms(answer: string, aliases: readonly string[] = []): string[] {
  const forms = new Set<string>();
  for (const seed of [answer, ...aliases]) {
    const normalized = normalizeGuess(seed);
    if (normalized) forms.add(normalized);
  }
  return [...forms];
}

/**
 * Every form a guess may match, including auto-generated plural variants.
 */
export function acceptedForms(answer: string, aliases: readonly string[] = []): string[] {
  const forms = new Set<string>();
  for (const seed of seedForms(answer, aliases)) {
    forms.add(seed);
    for (const variant of phrasePluralVariants(seed)) forms.add(variant);
  }
  return [...forms];
}
