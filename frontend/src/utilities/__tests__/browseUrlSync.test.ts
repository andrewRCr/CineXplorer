/**
 * Tests for browseUrlSync URL parsing utilities.
 *
 * Tests cover:
 * - parseBrowseParamsFromUrl: extracting browse state from URL query strings
 *   - Valid URL parsing (all params, partial params, defaults)
 *   - Invalid/malformed URL handling (graceful degradation)
 *   - Edge cases (empty values, encoding, whitespace)
 */

import { describe, it, expect } from "vitest";
import { parseBrowseParamsFromUrl } from "../browseUrlSync";
import { DEFAULT_BROWSE_PARAMS, DEFAULT_SORT } from "@/constants/browseDefaults";

describe("parseBrowseParamsFromUrl", () => {
  /**
   * Valid URL parsing scenarios
   *
   * Tests that well-formed URL parameters are correctly parsed into BrowseParams.
   */
  describe("valid URL parsing", () => {
    it("returns all defaults for empty search string", () => {
      const result = parseBrowseParamsFromUrl("");
      expect(result).toEqual(DEFAULT_BROWSE_PARAMS);
    });

    it("returns all defaults for search string with only question mark", () => {
      const result = parseBrowseParamsFromUrl("?");
      expect(result).toEqual(DEFAULT_BROWSE_PARAMS);
    });

    it("parses query parameter", () => {
      const result = parseBrowseParamsFromUrl("?query=batman");
      expect(result.query).toBe("batman");
    });

    it("parses single genre as array", () => {
      const result = parseBrowseParamsFromUrl("?genres=28");
      expect(result.genres).toEqual([28]);
    });

    it("parses multiple genres as comma-separated integers", () => {
      const result = parseBrowseParamsFromUrl("?genres=28,12,878");
      expect(result.genres).toEqual([28, 12, 878]);
    });

    it("parses sortBy parameter", () => {
      const result = parseBrowseParamsFromUrl("?sortBy=vote_average.desc");
      expect(result.sortBy).toBe("vote_average.desc");
    });

    it("parses year range parameters", () => {
      const result = parseBrowseParamsFromUrl("?minYear=2020&maxYear=2024");
      expect(result.minYear).toBe("2020");
      expect(result.maxYear).toBe("2024");
    });

    it("parses rating range parameters", () => {
      const result = parseBrowseParamsFromUrl("?minRating=7.0&maxRating=9.5");
      expect(result.minRating).toBe("7.0");
      expect(result.maxRating).toBe("9.5");
    });

    it("parses language parameter", () => {
      const result = parseBrowseParamsFromUrl("?language=en");
      expect(result.language).toBe("en");
    });

    it("parses single certification as array", () => {
      const result = parseBrowseParamsFromUrl("?certifications=PG-13");
      expect(result.certifications).toEqual(["PG-13"]);
    });

    it("parses multiple certifications as comma-separated strings", () => {
      const result = parseBrowseParamsFromUrl("?certifications=PG,PG-13,R");
      expect(result.certifications).toEqual(["PG", "PG-13", "R"]);
    });

    it("parses all parameters together", () => {
      const search =
        "?query=sci-fi&genres=878,28&sortBy=release_date.desc&minYear=2020&maxYear=2024&minRating=7&maxRating=10&language=en&certifications=PG-13,R";
      const result = parseBrowseParamsFromUrl(search);

      expect(result).toEqual({
        query: "sci-fi",
        genres: [878, 28],
        sortBy: "release_date.desc",
        minYear: "2020",
        maxYear: "2024",
        minRating: "7",
        maxRating: "10",
        language: "en",
        certifications: ["PG-13", "R"],
      });
    });

    it("applies defaults for missing parameters", () => {
      const result = parseBrowseParamsFromUrl("?query=action&genres=28");

      expect(result.query).toBe("action");
      expect(result.genres).toEqual([28]);
      // All other fields should be defaults
      expect(result.sortBy).toBe(DEFAULT_SORT);
      expect(result.minYear).toBe("");
      expect(result.maxYear).toBe("");
      expect(result.minRating).toBe("");
      expect(result.maxRating).toBe("");
      expect(result.language).toBe("");
      expect(result.certifications).toEqual([]);
    });
  });

  /**
   * Invalid/malformed URL handling
   *
   * Tests graceful degradation when URL parameters contain invalid values.
   * The parser should not throw and should return sensible defaults for invalid input.
   */
  describe("invalid/malformed URL handling", () => {
    it("filters invalid genre IDs from mixed valid/invalid input", () => {
      const result = parseBrowseParamsFromUrl("?genres=abc,28,xyz,12");
      expect(result.genres).toEqual([28, 12]);
    });

    it("returns empty array when all genre IDs are invalid", () => {
      const result = parseBrowseParamsFromUrl("?genres=abc,xyz,def");
      expect(result.genres).toEqual([]);
    });

    it("filters float genre values to integers via parseInt", () => {
      // parseInt("28.5") returns 28
      const result = parseBrowseParamsFromUrl("?genres=28.5,12.9");
      expect(result.genres).toEqual([28, 12]);
    });

    it("passes through non-numeric year values as-is", () => {
      // Current behavior: no validation on year strings
      const result = parseBrowseParamsFromUrl("?minYear=abc&maxYear=xyz");
      expect(result.minYear).toBe("abc");
      expect(result.maxYear).toBe("xyz");
    });

    it("passes through non-numeric rating values as-is", () => {
      // Current behavior: no validation on rating strings
      const result = parseBrowseParamsFromUrl("?minRating=high&maxRating=low");
      expect(result.minRating).toBe("high");
      expect(result.maxRating).toBe("low");
    });

    it("passes through unknown sortBy value as-is (type coercion)", () => {
      const result = parseBrowseParamsFromUrl("?sortBy=invalid_sort_value");
      expect(result.sortBy).toBe("invalid_sort_value");
    });

    it("handles negative genre IDs (parsed as valid integers)", () => {
      const result = parseBrowseParamsFromUrl("?genres=-1,28,-99");
      expect(result.genres).toEqual([-1, 28, -99]);
    });

    it("handles negative year values as strings", () => {
      const result = parseBrowseParamsFromUrl("?minYear=-100");
      expect(result.minYear).toBe("-100");
    });

    it("ignores unknown parameters", () => {
      const result = parseBrowseParamsFromUrl(
        "?query=test&unknownParam=value&anotherUnknown=123"
      );
      expect(result.query).toBe("test");
      // Unknown params should not appear in result
      expect(result).not.toHaveProperty("unknownParam");
      expect(result).not.toHaveProperty("anotherUnknown");
    });
  });

  /**
   * Edge cases
   *
   * Tests boundary conditions and special handling for unusual but valid inputs.
   */
  describe("edge cases", () => {
    it("treats empty param value as missing (genres=)", () => {
      const result = parseBrowseParamsFromUrl("?genres=");
      expect(result.genres).toEqual([]);
    });

    it("treats empty param value as missing (query=)", () => {
      const result = parseBrowseParamsFromUrl("?query=");
      expect(result.query).toBe("");
    });

    it("treats empty param value as missing (certifications=)", () => {
      const result = parseBrowseParamsFromUrl("?certifications=");
      expect(result.certifications).toEqual([]);
    });

    it("handles URL-encoded special characters in query", () => {
      // "action & adventure" URL-encoded
      const result = parseBrowseParamsFromUrl("?query=action%20%26%20adventure");
      expect(result.query).toBe("action & adventure");
    });

    it("handles URL-encoded spaces in query", () => {
      const result = parseBrowseParamsFromUrl("?query=star%20wars");
      expect(result.query).toBe("star wars");
    });

    it("handles plus signs as spaces in query (form encoding)", () => {
      // URLSearchParams treats + as space (application/x-www-form-urlencoded)
      const result = parseBrowseParamsFromUrl("?query=star+wars");
      expect(result.query).toBe("star wars");
    });

    it("preserves leading/trailing whitespace in values", () => {
      const result = parseBrowseParamsFromUrl("?query=%20padded%20");
      expect(result.query).toBe(" padded ");
    });

    it("handles very long query values", () => {
      const longQuery = "a".repeat(1000);
      const result = parseBrowseParamsFromUrl(`?query=${longQuery}`);
      expect(result.query).toBe(longQuery);
      expect(result.query.length).toBe(1000);
    });

    it("handles many genres", () => {
      const manyGenres = Array.from({ length: 50 }, (_, i) => i + 1).join(",");
      const result = parseBrowseParamsFromUrl(`?genres=${manyGenres}`);
      expect(result.genres.length).toBe(50);
      expect(result.genres[0]).toBe(1);
      expect(result.genres[49]).toBe(50);
    });

    it("handles genres with trailing comma", () => {
      const result = parseBrowseParamsFromUrl("?genres=28,12,");
      // filter(Boolean) removes empty strings from split
      expect(result.genres).toEqual([28, 12]);
    });

    it("handles genres with leading comma", () => {
      const result = parseBrowseParamsFromUrl("?genres=,28,12");
      expect(result.genres).toEqual([28, 12]);
    });

    it("handles genres with multiple consecutive commas", () => {
      const result = parseBrowseParamsFromUrl("?genres=28,,,,12");
      expect(result.genres).toEqual([28, 12]);
    });

    it("handles certifications with empty values in sequence", () => {
      const result = parseBrowseParamsFromUrl("?certifications=PG,,R,");
      expect(result.certifications).toEqual(["PG", "R"]);
    });

    it("handles unicode characters in query", () => {
      const result = parseBrowseParamsFromUrl("?query=%E6%98%A0%E7%94%BB"); // "映画" (movie in Japanese)
      expect(result.query).toBe("映画");
    });

    it("preserves case sensitivity in all string values", () => {
      const result = parseBrowseParamsFromUrl(
        "?query=BaTmAn&language=EN&sortBy=Vote_Average.Desc"
      );
      expect(result.query).toBe("BaTmAn");
      expect(result.language).toBe("EN");
      expect(result.sortBy).toBe("Vote_Average.Desc");
    });
  });
});
