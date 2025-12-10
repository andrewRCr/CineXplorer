/**
 * Tests for searchUrlSync utilities
 *
 * Tests URL parsing and generation for search parameters.
 */

import { describe, it, expect } from "vitest";
import {
  parseSearchParamsFromUrl,
  generateSearchUrl,
  hasActiveSearch,
} from "../searchUrlSync";

describe("searchUrlSync", () => {
  describe("parseSearchParamsFromUrl", () => {
    it("should parse query from URL", () => {
      const result = parseSearchParamsFromUrl("?query=batman");
      expect(result.query).toBe("batman");
    });

    it("should handle URL-encoded query", () => {
      const result = parseSearchParamsFromUrl("?query=the%20dark%20knight");
      expect(result.query).toBe("the dark knight");
    });

    it("should return empty string for missing query", () => {
      const result = parseSearchParamsFromUrl("?page=1");
      expect(result.query).toBe("");
    });

    it("should return empty string for empty search string", () => {
      const result = parseSearchParamsFromUrl("");
      expect(result.query).toBe("");
    });

    it("should handle query with special characters", () => {
      const result = parseSearchParamsFromUrl("?query=star%3A+wars");
      expect(result.query).toBe("star: wars");
    });
  });

  describe("generateSearchUrl", () => {
    it("should generate URL with query", () => {
      const result = generateSearchUrl({ query: "batman" });
      expect(result).toBe("query=batman");
    });

    it("should return empty string for empty query", () => {
      const result = generateSearchUrl({ query: "" });
      expect(result).toBe("");
    });

    it("should URL-encode special characters", () => {
      const result = generateSearchUrl({ query: "the dark knight" });
      expect(result).toBe("query=the+dark+knight");
    });

    // Note: page param tests removed - pagination is now handled by paginationUrlSync.ts
  });

  describe("hasActiveSearch", () => {
    it("should return true for non-empty query", () => {
      expect(hasActiveSearch({ query: "batman" })).toBe(true);
    });

    it("should return false for empty query", () => {
      expect(hasActiveSearch({ query: "" })).toBe(false);
    });

    it("should return false for whitespace-only query", () => {
      expect(hasActiveSearch({ query: "   " })).toBe(false);
    });
  });
});
