import { describe, expect, it } from "vitest";

import { acceptedForms, normalizeGuess, pluralForms } from "./normalize";

describe("normalizeGuess", () => {
  it("ignores case, accents, and surrounding punctuation", () => {
    expect(normalizeGuess("  Penicillin! ")).toBe("penicillin");
    expect(normalizeGuess("PI")).toBe("pi");
    expect(normalizeGuess("Café")).toBe("cafe");
  });

  it("drops apostrophes so dont and don't agree", () => {
    expect(normalizeGuess("don't")).toBe("dont");
    expect(normalizeGuess("Dont")).toBe("dont");
  });

  it("turns punctuation into a space so hyphenated and spaced forms agree", () => {
    expect(normalizeGuess("star-wars")).toBe("star wars");
    expect(normalizeGuess("star wars")).toBe("star wars");
  });

  it("collapses repeated whitespace and strips diacritics", () => {
    expect(normalizeGuess("  the   answer \n ")).toBe("the answer");
    expect(normalizeGuess("Łódź")).toBe("lodz");
  });

  it("returns an empty string for input with nothing comparable", () => {
    expect(normalizeGuess("   ")).toBe("");
    expect(normalizeGuess("!!!")).toBe("");
  });
});

describe("pluralForms", () => {
  it("adds a regular plural", () => {
    expect(pluralForms("canyon")).toEqual(["canyons"]);
  });

  it("handles sibilants and consonant y", () => {
    expect(pluralForms("church")).toEqual(["churches"]);
    expect(pluralForms("tulip")).toEqual(["tulips"]);
    expect(pluralForms("city")).toEqual(["cities"]);
  });

  it("handles words ending in a double s", () => {
    expect(pluralForms("glass")).toEqual(["glasses"]);
  });

  it("reverses plural forms back to the singular", () => {
    expect(pluralForms("boxes")).toEqual(["box"]);
    expect(pluralForms("cities")).toEqual(["city"]);
    expect(pluralForms("expectations")).toEqual(["expectation"]);
  });

  it("never produces nonsense doublings of an already-plural word", () => {
    expect(pluralForms("expectations")).not.toContain("expectationss");
    expect(pluralForms("expectations")).not.toContain("expectationses");
  });

  it("returns nothing for a word too short to pluralise safely", () => {
    expect(pluralForms("ox")).toEqual([]);
  });
});

describe("acceptedForms", () => {
  it("includes the answer, its aliases, and generated plurals", () => {
    const forms = acceptedForms("Great Expectations", ["Dickens novel"]);
    expect(forms).toContain("great expectations");
    expect(forms).toContain("great expectation");
    expect(forms).toContain("dickens novel");
    expect(forms).toContain("dickens novels");
  });

  it("only pluralises the head of a multi-word answer", () => {
    const forms = acceptedForms("Tubular Bells");
    expect(forms).toContain("tubular bells");
    expect(forms).toContain("tubular bell");
    expect(forms.some((form) => form.startsWith("tubulars"))).toBe(false);
  });
});
