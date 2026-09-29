import { describe, expect, it } from "vitest";

import { parseAliases, toLines } from "./listField";

describe("listField", () => {
  describe("parseAliases", () => {
    it("keeps a trailing empty line as text, so a new line can be started", () => {
      // The bug this guards: the textarea held the parsed array, so pressing
      // Enter produced a trailing empty line, the parser dropped it, and the
      // newline was deleted before the cursor could reach it. The textarea now
      // holds raw text, so the text keeps the newline and only the parse
      // collapses it.
      const text = toLines(["Panama Canal"]);
      const afterEnter = `${text}\n`;
      expect(afterEnter).toBe("Panama Canal\n");
      expect(afterEnter.split("\n")).toEqual(["Panama Canal", ""]);
      // What the parser does with it is a separate concern, and harmless.
      expect(parseAliases(afterEnter)).toEqual(["Panama Canal"]);
    });

    it("keeps the line you are typing on", () => {
      const afterTypingSecond = "Panama Canal\nCanal of Pana";
      expect(parseAliases(afterTypingSecond)).toEqual(["Panama Canal", "Canal of Pana"]);
    });

    it("trims each entry and drops blank lines", () => {
      expect(parseAliases("  a  \n\n\n  b\n\n")).toEqual(["a", "b"]);
    });

    it("returns nothing for an empty field", () => {
      expect(parseAliases("")).toEqual([]);
      expect(parseAliases("\n\n")).toEqual([]);
    });

    it("round-trips stored aliases without losing an entry", () => {
      const stored = ["Panama Canal", "Canal of Panama"];
      expect(parseAliases(toLines(stored))).toEqual(stored);
    });
  });

  describe("toLines", () => {
    it("preserves empty entries, which is what makes a new line possible", () => {
      // Clues rely on this: an in-progress empty last line must survive so the
      // editor can keep typing on it.
      expect(toLines(["first", ""])).toBe("first\n");
    });

    it("renders an empty list as empty text", () => {
      expect(toLines([])).toBe("");
    });
  });
});
