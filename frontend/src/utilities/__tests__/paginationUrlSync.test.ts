/**
 * Tests for paginationUrlSync URL utilities
 *
 * Tests cover:
 * - parsePaginationFromUrl: extracting pagination state from URL query strings
 * - generatePaginationUrl: creating URL search strings from pagination params
 * - mergePaginationIntoUrl: updating existing URLs with pagination params
 */

import { describe, it, expect } from "vitest";
import {
  parsePaginationFromUrl,
  generatePaginationUrl,
  mergePaginationIntoUrl,
  DEFAULT_PAGINATION_PARAMS,
} from "../paginationUrlSync";

describe("paginationUrlSync", () => {
  describe("parsePaginationFromUrl", () => {
    /**
     * Valid URL parsing scenarios
     */
    describe("valid URL parsing", () => {
      it("returns defaults for empty search string", () => {
        const result = parsePaginationFromUrl("");
        expect(result).toEqual(DEFAULT_PAGINATION_PARAMS);
      });

      it("returns defaults for search string with only question mark", () => {
        const result = parsePaginationFromUrl("?");
        expect(result).toEqual(DEFAULT_PAGINATION_PARAMS);
      });

      it("parses page parameter", () => {
        const result = parsePaginationFromUrl("?page=3");
        expect(result.page).toBe(3);
        expect(result.tmdb_page_start).toBeUndefined();
      });

      it("parses tmdb_page_start parameter", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=9");
        expect(result.page).toBe(1); // default
        expect(result.tmdb_page_start).toBe(9);
      });

      it("parses both parameters together", () => {
        const result = parsePaginationFromUrl("?page=3&tmdb_page_start=9");
        expect(result.page).toBe(3);
        expect(result.tmdb_page_start).toBe(9);
      });

      it("ignores unknown parameters", () => {
        const result = parsePaginationFromUrl(
          "?page=2&unknownParam=value&tmdb_page_start=5"
        );
        expect(result.page).toBe(2);
        expect(result.tmdb_page_start).toBe(5);
        expect(result).not.toHaveProperty("unknownParam");
      });
    });

    /**
     * Invalid/malformed URL handling
     */
    describe("invalid/malformed URL handling", () => {
      it("returns default page for non-numeric page value", () => {
        const result = parsePaginationFromUrl("?page=abc");
        expect(result.page).toBe(1);
      });

      it("returns undefined tmdb_page_start for non-numeric value", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=invalid");
        expect(result.tmdb_page_start).toBeUndefined();
      });

      it("returns default page for zero value", () => {
        const result = parsePaginationFromUrl("?page=0");
        expect(result.page).toBe(1);
      });

      it("returns undefined tmdb_page_start for zero value", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=0");
        expect(result.tmdb_page_start).toBeUndefined();
      });

      it("returns default page for negative value", () => {
        const result = parsePaginationFromUrl("?page=-5");
        expect(result.page).toBe(1);
      });

      it("returns undefined tmdb_page_start for negative value", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=-10");
        expect(result.tmdb_page_start).toBeUndefined();
      });

      it("truncates float page value via parseInt", () => {
        const result = parsePaginationFromUrl("?page=3.7");
        expect(result.page).toBe(3);
      });

      it("truncates float tmdb_page_start value via parseInt", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=9.9");
        expect(result.tmdb_page_start).toBe(9);
      });

      it("returns default page for empty value", () => {
        const result = parsePaginationFromUrl("?page=");
        expect(result.page).toBe(1);
      });

      it("returns undefined tmdb_page_start for empty value", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=");
        expect(result.tmdb_page_start).toBeUndefined();
      });
    });

    /**
     * Edge cases - coexistence with other params
     */
    describe("edge cases", () => {
      it("ignores browse params (genres, sortBy, etc.)", () => {
        const result = parsePaginationFromUrl(
          "?genres=28,12&sortBy=vote_average.desc&page=2"
        );
        expect(result.page).toBe(2);
        expect(result.tmdb_page_start).toBeUndefined();
      });

      it("ignores search params (query)", () => {
        const result = parsePaginationFromUrl(
          "?query=batman&page=5&tmdb_page_start=15"
        );
        expect(result.page).toBe(5);
        expect(result.tmdb_page_start).toBe(15);
      });

      it("handles very large page numbers", () => {
        const result = parsePaginationFromUrl("?page=999999");
        expect(result.page).toBe(999999);
      });

      it("handles very large tmdb_page_start numbers", () => {
        const result = parsePaginationFromUrl("?tmdb_page_start=999999");
        expect(result.tmdb_page_start).toBe(999999);
      });
    });
  });

  describe("generatePaginationUrl", () => {
    /**
     * Basic generation scenarios
     */
    describe("basic generation", () => {
      it("returns empty string for page 1 with no tmdb_page_start", () => {
        const result = generatePaginationUrl({ page: 1 });
        expect(result).toBe("");
      });

      it("returns empty string for default params", () => {
        const result = generatePaginationUrl({});
        expect(result).toBe("");
      });

      it("generates URL with page only (page > 1)", () => {
        const result = generatePaginationUrl({ page: 2 });
        expect(result).toBe("page=2");
      });

      it("generates URL with tmdb_page_start only", () => {
        const result = generatePaginationUrl({ tmdb_page_start: 5 });
        expect(result).toBe("tmdb_page_start=5");
      });

      it("generates URL with both params", () => {
        const result = generatePaginationUrl({ page: 3, tmdb_page_start: 9 });
        expect(result).toBe("page=3&tmdb_page_start=9");
      });
    });

    /**
     * Omission rules
     */
    describe("omission rules", () => {
      it("omits page when value is 1", () => {
        const result = generatePaginationUrl({
          page: 1,
          tmdb_page_start: 5,
        });
        expect(result).toBe("tmdb_page_start=5");
        expect(result).not.toContain("page=");
      });

      it("omits tmdb_page_start when undefined", () => {
        const result = generatePaginationUrl({
          page: 3,
          tmdb_page_start: undefined,
        });
        expect(result).toBe("page=3");
        expect(result).not.toContain("tmdb_page_start");
      });

      it("omits both when page=1 and tmdb_page_start undefined", () => {
        const result = generatePaginationUrl({
          page: 1,
          tmdb_page_start: undefined,
        });
        expect(result).toBe("");
      });
    });

    /**
     * Edge cases
     */
    describe("edge cases", () => {
      it("includes tmdb_page_start=1 when explicitly set (edge case)", () => {
        // tmdb_page_start=1 is valid and should be preserved
        const result = generatePaginationUrl({ page: 2, tmdb_page_start: 1 });
        expect(result).toBe("page=2&tmdb_page_start=1");
      });

      it("handles large numbers correctly", () => {
        const result = generatePaginationUrl({
          page: 500,
          tmdb_page_start: 2500,
        });
        expect(result).toBe("page=500&tmdb_page_start=2500");
      });
    });
  });

  describe("mergePaginationIntoUrl", () => {
    /**
     * Merging into existing URL params
     */
    describe("preserves existing params", () => {
      it("adds pagination to existing browse params", () => {
        const result = mergePaginationIntoUrl(
          "?genres=28&sortBy=vote_average.desc",
          { page: 2, tmdb_page_start: 5 }
        );
        expect(result).toContain("genres=28");
        expect(result).toContain("sortBy=vote_average.desc");
        expect(result).toContain("page=2");
        expect(result).toContain("tmdb_page_start=5");
      });

      it("adds pagination to existing search params", () => {
        const result = mergePaginationIntoUrl("?query=batman", {
          page: 3,
          tmdb_page_start: 10,
        });
        expect(result).toContain("query=batman");
        expect(result).toContain("page=3");
        expect(result).toContain("tmdb_page_start=10");
      });

      it("preserves all existing params when adding pagination", () => {
        const result = mergePaginationIntoUrl(
          "?genres=28,12&minYear=2020&maxRating=8",
          { page: 4 }
        );
        expect(result).toContain("genres=28%2C12"); // URLSearchParams encodes comma
        expect(result).toContain("minYear=2020");
        expect(result).toContain("maxRating=8");
        expect(result).toContain("page=4");
      });
    });

    /**
     * Updating existing pagination params
     */
    describe("updates existing pagination", () => {
      it("replaces existing page param", () => {
        const result = mergePaginationIntoUrl("?page=2&genres=28", { page: 5 });
        expect(result).toContain("page=5");
        expect(result).not.toContain("page=2");
      });

      it("replaces existing tmdb_page_start param", () => {
        const result = mergePaginationIntoUrl(
          "?tmdb_page_start=5&query=test",
          { tmdb_page_start: 15 }
        );
        expect(result).toContain("tmdb_page_start=15");
        expect(result).not.toContain("tmdb_page_start=5");
      });

      it("removes page param when setting page to 1", () => {
        const result = mergePaginationIntoUrl("?page=5&genres=28", { page: 1 });
        expect(result).not.toContain("page=");
        expect(result).toContain("genres=28");
      });

      it("removes tmdb_page_start when setting to undefined", () => {
        const result = mergePaginationIntoUrl(
          "?tmdb_page_start=10&query=test",
          { tmdb_page_start: undefined }
        );
        expect(result).not.toContain("tmdb_page_start");
        expect(result).toContain("query=test");
      });
    });

    /**
     * Empty URL scenarios
     */
    describe("empty URL scenarios", () => {
      it("handles empty search string", () => {
        const result = mergePaginationIntoUrl("", { page: 2 });
        expect(result).toBe("page=2");
      });

      it("handles question mark only", () => {
        const result = mergePaginationIntoUrl("?", {
          page: 3,
          tmdb_page_start: 9,
        });
        expect(result).toBe("page=3&tmdb_page_start=9");
      });

      it("returns empty string when resetting to defaults", () => {
        const result = mergePaginationIntoUrl("?page=5&tmdb_page_start=20", {
          page: 1,
          tmdb_page_start: undefined,
        });
        expect(result).toBe("");
      });
    });
  });
});
