/**
 * Tests for conditional sort option filtering based on language selection.
 *
 * Alphabetical title sort only makes sense for Latin-script languages.
 * When "All Languages" or non-Latin languages are selected, title sort should be hidden.
 *
 * Note: Z-A sort was removed entirely due to TMDB data quality issues.
 */

import { describe, it, expect } from "vitest";
import {
  isLatinScriptLanguage,
  getAvailableSortOptions,
  isTitleSort,
} from "../sortAvailabilityUtils";

describe("sortAvailability", () => {
  describe("isLatinScriptLanguage", () => {
    it("returns false for empty string (All Languages)", () => {
      expect(isLatinScriptLanguage("")).toBe(false);
    });

    it("returns true for English", () => {
      expect(isLatinScriptLanguage("en")).toBe(true);
    });

    it("returns true for other Latin-script languages", () => {
      // European Latin-script languages
      expect(isLatinScriptLanguage("fr")).toBe(true); // French
      expect(isLatinScriptLanguage("es")).toBe(true); // Spanish
      expect(isLatinScriptLanguage("de")).toBe(true); // German
      expect(isLatinScriptLanguage("pt")).toBe(true); // Portuguese
      expect(isLatinScriptLanguage("it")).toBe(true); // Italian
      expect(isLatinScriptLanguage("nl")).toBe(true); // Dutch
      expect(isLatinScriptLanguage("sv")).toBe(true); // Swedish
      expect(isLatinScriptLanguage("da")).toBe(true); // Danish
      expect(isLatinScriptLanguage("pl")).toBe(true); // Polish
      expect(isLatinScriptLanguage("cs")).toBe(true); // Czech
      expect(isLatinScriptLanguage("tr")).toBe(true); // Turkish

      // Other Latin-script languages
      expect(isLatinScriptLanguage("tl")).toBe(true); // Tagalog
      expect(isLatinScriptLanguage("id")).toBe(true); // Indonesian
    });

    it("returns false for non-Latin-script languages", () => {
      expect(isLatinScriptLanguage("ja")).toBe(false); // Japanese
      expect(isLatinScriptLanguage("ko")).toBe(false); // Korean
      expect(isLatinScriptLanguage("zh")).toBe(false); // Chinese
      expect(isLatinScriptLanguage("ru")).toBe(false); // Russian (Cyrillic)
      expect(isLatinScriptLanguage("ar")).toBe(false); // Arabic
      expect(isLatinScriptLanguage("hi")).toBe(false); // Hindi (Devanagari)
      expect(isLatinScriptLanguage("el")).toBe(false); // Greek
      expect(isLatinScriptLanguage("fa")).toBe(false); // Persian (Arabic script)
      expect(isLatinScriptLanguage("yue")).toBe(false); // Cantonese
    });
  });

  describe("getAvailableSortOptions", () => {
    it("returns 4 options (no title sort) when language is empty", () => {
      const options = getAvailableSortOptions("");

      expect(options).toHaveLength(4);
      expect(options.map((o) => o.value)).toEqual([
        "popularity.desc",
        "vote_average.desc",
        "release_date.desc",
        "release_date.asc",
      ]);
    });

    it("returns 5 options (with title sort) for Latin-script languages", () => {
      const options = getAvailableSortOptions("en");

      expect(options).toHaveLength(5);
      expect(options.map((o) => o.value)).toContain("original_title.asc");
    });

    it("returns 4 options (no title sort) for non-Latin languages", () => {
      const options = getAvailableSortOptions("ja");

      expect(options).toHaveLength(4);
      expect(options.map((o) => o.value)).not.toContain("original_title.asc");
    });

    it("preserves option labels", () => {
      const options = getAvailableSortOptions("en");

      const titleSort = options.find((o) => o.value === "original_title.asc");
      expect(titleSort?.label).toBe("Alphabetical");
    });
  });

  describe("isTitleSort", () => {
    it("returns true for original_title.asc", () => {
      expect(isTitleSort("original_title.asc")).toBe(true);
    });

    it("returns false for popularity.desc", () => {
      expect(isTitleSort("popularity.desc")).toBe(false);
    });

    it("returns false for other sort options", () => {
      expect(isTitleSort("vote_average.desc")).toBe(false);
      expect(isTitleSort("release_date.desc")).toBe(false);
      expect(isTitleSort("release_date.asc")).toBe(false);
    });
  });
});
