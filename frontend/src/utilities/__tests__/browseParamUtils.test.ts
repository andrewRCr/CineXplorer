/**
 * Tests for browse parameter utility functions.
 *
 * Tests cover:
 * - hasActiveFilters: detecting active FILTER parameters (excludes sort)
 * - hasActiveBrowseParams: detecting any active parameters (includes sort)
 * - countActiveParams: counting active FILTER groups (excludes sort)
 * - isDefaultSort: checking if sort is default
 */

import { describe, it, expect } from "vitest";
import {
  hasActiveFilters,
  hasActiveBrowseParams,
  countActiveParams,
  isDefaultSort,
} from "../browseParamUtils";
import { DEFAULT_BROWSE_PARAMS, DEFAULT_SORT } from "@/constants/browseDefaults";
import type { BrowseParams } from "@/types/browseTypes";

/** Helper to create params with specific overrides */
const createParams = (overrides: Partial<BrowseParams> = {}): BrowseParams => ({
  ...DEFAULT_BROWSE_PARAMS,
  ...overrides,
});

describe("browseParamUtils", () => {
  /**
   * hasActiveFilters - Core filter detection (EXCLUDES sort)
   *
   * This is the base function used by "Clear Filters" button visibility.
   * Sort is NOT a filter - it's a user preference that should persist.
   */
  describe("hasActiveFilters", () => {
    it("returns false for default params", () => {
      expect(hasActiveFilters(DEFAULT_BROWSE_PARAMS)).toBe(false);
    });

    it("returns true when genres has items", () => {
      expect(hasActiveFilters(createParams({ genres: [28] }))).toBe(true);
      expect(hasActiveFilters(createParams({ genres: [28, 12] }))).toBe(true);
    });

    it("returns true when minYear is set", () => {
      expect(hasActiveFilters(createParams({ minYear: "2020" }))).toBe(true);
    });

    it("returns true when maxYear is set", () => {
      expect(hasActiveFilters(createParams({ maxYear: "2024" }))).toBe(true);
    });

    it("returns true when minRating is set", () => {
      expect(hasActiveFilters(createParams({ minRating: "7" }))).toBe(true);
    });

    it("returns true when maxRating is set", () => {
      expect(hasActiveFilters(createParams({ maxRating: "9" }))).toBe(true);
    });

    it("returns true when language is set", () => {
      expect(hasActiveFilters(createParams({ language: "en" }))).toBe(true);
    });

    // KEY TEST: Sort should NOT trigger hasActiveFilters
    it("returns false when ONLY sortBy differs from default", () => {
      expect(
        hasActiveFilters(createParams({ sortBy: "vote_average.desc" }))
      ).toBe(false);
      expect(
        hasActiveFilters(createParams({ sortBy: "release_date.desc" }))
      ).toBe(false);
    });

    it("returns true with filters active even if sort is also non-default", () => {
      expect(
        hasActiveFilters(
          createParams({
            genres: [878],
            sortBy: "vote_average.desc",
          })
        )
      ).toBe(true);
    });

    it("handles empty arrays and strings correctly", () => {
      expect(hasActiveFilters(createParams({ genres: [] }))).toBe(false);
      expect(hasActiveFilters(createParams({ language: "" }))).toBe(false);
    });
  });

  /**
   * hasActiveBrowseParams - Full param detection (INCLUDES sort)
   *
   * Builds on hasActiveFilters + adds sort check.
   * Used where we need to know if ANY param differs from default.
   */
  describe("hasActiveBrowseParams", () => {
    it("returns false for default params", () => {
      expect(hasActiveBrowseParams(DEFAULT_BROWSE_PARAMS)).toBe(false);
    });

    // Filter checks delegate to hasActiveFilters - spot check a few
    it("returns true when filters are active", () => {
      expect(hasActiveBrowseParams(createParams({ genres: [28] }))).toBe(true);
      expect(hasActiveBrowseParams(createParams({ minYear: "2020" }))).toBe(true);
    });

    // Sort-specific tests for hasActiveBrowseParams
    it("returns true when sortBy differs from default", () => {
      expect(
        hasActiveBrowseParams(createParams({ sortBy: "vote_average.desc" }))
      ).toBe(true);
      expect(
        hasActiveBrowseParams(createParams({ sortBy: "release_date.desc" }))
      ).toBe(true);
    });

    it("returns false when sortBy is default", () => {
      expect(
        hasActiveBrowseParams(createParams({ sortBy: "popularity.desc" }))
      ).toBe(false);
    });

    it("returns true with multiple active params including sort", () => {
      expect(
        hasActiveBrowseParams(
          createParams({
            genres: [878],
            minYear: "2020",
            sortBy: "vote_average.desc",
          })
        )
      ).toBe(true);
    });
  });

  /**
   * countActiveParams - Count active FILTER groups (EXCLUDES sort)
   *
   * Sort is not counted because it's not a filter - it's a user preference.
   * Maximum count: 5 (genres, year, rating, language, certifications)
   */
  describe("countActiveParams", () => {
    it("returns 0 for default params", () => {
      expect(countActiveParams(DEFAULT_BROWSE_PARAMS)).toBe(0);
    });

    it("counts genres as 1 regardless of count", () => {
      expect(countActiveParams(createParams({ genres: [28] }))).toBe(1);
      expect(countActiveParams(createParams({ genres: [28, 12, 878] }))).toBe(1);
    });

    it("counts year range as 1 when minYear set", () => {
      expect(countActiveParams(createParams({ minYear: "2020" }))).toBe(1);
    });

    it("counts year range as 1 when maxYear set", () => {
      expect(countActiveParams(createParams({ maxYear: "2024" }))).toBe(1);
    });

    it("counts year range as 1 when both set", () => {
      expect(
        countActiveParams(createParams({ minYear: "2020", maxYear: "2024" }))
      ).toBe(1);
    });

    it("counts rating range as 1 when minRating set", () => {
      expect(countActiveParams(createParams({ minRating: "7" }))).toBe(1);
    });

    it("counts rating range as 1 when maxRating set", () => {
      expect(countActiveParams(createParams({ maxRating: "9" }))).toBe(1);
    });

    it("counts rating range as 1 when both set", () => {
      expect(
        countActiveParams(createParams({ minRating: "7", maxRating: "9" }))
      ).toBe(1);
    });

    // KEY TEST: Sort should NOT be counted
    it("does NOT count non-default sort", () => {
      expect(
        countActiveParams(createParams({ sortBy: "vote_average.desc" }))
      ).toBe(0);
    });

    it("counts language as 1", () => {
      expect(countActiveParams(createParams({ language: "en" }))).toBe(1);
    });

    it("correctly counts all 5 filter groups (excludes sort)", () => {
      // All 5 filter groups active + sort (sort not counted)
      expect(
        countActiveParams(
          createParams({
            genres: [28],
            minYear: "2020",
            minRating: "7",
            sortBy: "vote_average.desc", // Not counted
            language: "en",
            certifications: ["PG-13"],
          })
        )
      ).toBe(5); // genres, year, rating, language, certifications
    });

    it("correctly counts mix of active params", () => {
      expect(
        countActiveParams(
          createParams({
            genres: [28, 12],
            minYear: "2020",
            maxYear: "2024",
            language: "fr",
          })
        )
      ).toBe(3); // genres + year range + language
    });
  });

  describe("isDefaultSort", () => {
    it("returns true for popularity.desc", () => {
      expect(isDefaultSort("popularity.desc")).toBe(true);
      expect(isDefaultSort(DEFAULT_SORT)).toBe(true);
    });

    it("returns false for other sort values", () => {
      expect(isDefaultSort("vote_average.desc")).toBe(false);
      expect(isDefaultSort("release_date.desc")).toBe(false);
      expect(isDefaultSort("release_date.asc")).toBe(false);
      expect(isDefaultSort("original_title.asc")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isDefaultSort("")).toBe(false);
    });

    it("returns false for invalid values", () => {
      expect(isDefaultSort("invalid")).toBe(false);
      expect(isDefaultSort("popularity.asc")).toBe(false);
    });
  });
});
