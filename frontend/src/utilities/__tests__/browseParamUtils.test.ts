/**
 * Tests for browse parameter utility functions.
 *
 * Tests cover:
 * - hasActiveBrowseParams: detecting any active parameters
 * - countActiveParams: counting active parameter groups
 * - isDefaultSort: checking if sort is default
 */

import { describe, it, expect } from "vitest";
import {
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
  describe("hasActiveBrowseParams", () => {
    it("returns false for default params", () => {
      expect(hasActiveBrowseParams(DEFAULT_BROWSE_PARAMS)).toBe(false);
    });

    it("returns true when query is set", () => {
      expect(hasActiveBrowseParams(createParams({ query: "batman" }))).toBe(
        true
      );
    });

    it("returns true when genres has items", () => {
      expect(hasActiveBrowseParams(createParams({ genres: [28] }))).toBe(true);
      expect(hasActiveBrowseParams(createParams({ genres: [28, 12] }))).toBe(
        true
      );
    });

    it("returns true when minYear is set", () => {
      expect(hasActiveBrowseParams(createParams({ minYear: "2020" }))).toBe(
        true
      );
    });

    it("returns true when maxYear is set", () => {
      expect(hasActiveBrowseParams(createParams({ maxYear: "2024" }))).toBe(
        true
      );
    });

    it("returns true when minRating is set", () => {
      expect(hasActiveBrowseParams(createParams({ minRating: "7" }))).toBe(true);
    });

    it("returns true when maxRating is set", () => {
      expect(hasActiveBrowseParams(createParams({ maxRating: "9" }))).toBe(true);
    });

    it("returns true when minRuntime is set", () => {
      expect(hasActiveBrowseParams(createParams({ minRuntime: "90" }))).toBe(
        true
      );
    });

    it("returns true when maxRuntime is set", () => {
      expect(hasActiveBrowseParams(createParams({ maxRuntime: "120" }))).toBe(
        true
      );
    });

    it("returns true when language is set", () => {
      expect(hasActiveBrowseParams(createParams({ language: "en" }))).toBe(true);
    });

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

    it("returns true with multiple active params", () => {
      expect(
        hasActiveBrowseParams(
          createParams({
            query: "sci-fi",
            genres: [878],
            minYear: "2020",
            sortBy: "vote_average.desc",
          })
        )
      ).toBe(true);
    });

    it("handles empty arrays and strings correctly", () => {
      expect(hasActiveBrowseParams(createParams({ genres: [] }))).toBe(false);
      expect(hasActiveBrowseParams(createParams({ query: "" }))).toBe(false);
      expect(hasActiveBrowseParams(createParams({ language: "" }))).toBe(false);
    });
  });

  describe("countActiveParams", () => {
    it("returns 0 for default params", () => {
      expect(countActiveParams(DEFAULT_BROWSE_PARAMS)).toBe(0);
    });

    it("counts query as 1", () => {
      expect(countActiveParams(createParams({ query: "batman" }))).toBe(1);
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

    it("counts runtime range as 1 when minRuntime set", () => {
      expect(countActiveParams(createParams({ minRuntime: "90" }))).toBe(1);
    });

    it("counts runtime range as 1 when maxRuntime set", () => {
      expect(countActiveParams(createParams({ maxRuntime: "120" }))).toBe(1);
    });

    it("counts runtime range as 1 when both set", () => {
      expect(
        countActiveParams(createParams({ minRuntime: "90", maxRuntime: "120" }))
      ).toBe(1);
    });

    it("counts non-default sort as 1", () => {
      expect(
        countActiveParams(createParams({ sortBy: "vote_average.desc" }))
      ).toBe(1);
    });

    it("counts language as 1", () => {
      expect(countActiveParams(createParams({ language: "en" }))).toBe(1);
    });

    it("correctly counts multiple distinct param groups", () => {
      // All 7 possible groups active
      expect(
        countActiveParams(
          createParams({
            query: "test",
            genres: [28],
            minYear: "2020",
            minRating: "7",
            minRuntime: "90",
            sortBy: "vote_average.desc",
            language: "en",
          })
        )
      ).toBe(7);
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
