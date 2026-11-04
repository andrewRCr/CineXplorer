/**
 * Integration tests for browseParamMapper API parameter generation.
 *
 * These tests validate that the browse param mapper generates API parameters
 * that match the backend schema expectations. This is critical for ensuring the
 * frontend → backend parameter contract remains stable.
 *
 * Test Strategy: Validate parameter names and formats match what the backend
 * MovieDiscoverFilterSchema expects. This would have caught the previous
 * min_rating → vote_average_gte parameter naming bug.
 *
 * Related: Browse parameter integration testing - ensuring frontend params match backend schema
 */

import { describe, it, expect } from "vitest";
import { mapBrowseParamsToApi } from "../browseParamMapper";
import { createMockBrowseParams as createBrowseParams } from "@tests/mocks/browseParams";

describe("browseParamMapper - Backend Schema Compatibility", () => {
    describe("Year Filter Parameter Generation", () => {
        it("generates release_date_gte/lte for year range", () => {
            // Arrange: User selects year range 2020-2023
            const browseParams = createBrowseParams({
                minYear: "2020",
                maxYear: "2023",
            });

            // Act: Map to API parameters
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Parameters match backend schema expectations
            expect(params.release_date_gte).toBe("2020-01-01");
            expect(params.release_date_lte).toBe("2023-12-31");

            // Backend will extract these for both TMDB API AND backend filtering
            // TMDB API: primary filter (millions → thousands)
            // Backend: second-pass data hygiene (catch bad data)
        });

        it("generates release_date_gte only when only minYear provided", () => {
            // Arrange: User selects "From 2020" (no end year)
            const browseParams = createBrowseParams({ minYear: "2020" });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Only gte parameter present
            expect(params.release_date_gte).toBe("2020-01-01");
            expect(params.release_date_lte).toBeDefined(); // Mapper adds current year as max
            expect(params).not.toHaveProperty("year_min"); // Backend extracts this
        });

        it("generates release_date_lte only when only maxYear provided", () => {
            // Arrange: User selects "Up to 2023"
            const browseParams = createBrowseParams({ maxYear: "2023" });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Only lte parameter present
            expect(params.release_date_lte).toBe("2023-12-31");
            expect(params).not.toHaveProperty("release_date_gte");
        });

        // Note: Decade handling ("2020s" → 2020-2029) was removed from browseParamMapper
        // because the UI (ConnectedDropdowns) converts decades to year ranges BEFORE storing.
        // The mapper now receives minYear: "2020", maxYear: "2029" directly.
    });

    describe("Rating Filter Parameter Generation", () => {
        it("generates vote_average_gte for minimum rating", () => {
            // Arrange: User selects "7.5+ rating"
            const browseParams = createBrowseParams({ minRating: "7.5" });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Parameter name matches backend schema
            expect(params.vote_average_gte).toBe("7.5");
            expect(params).not.toHaveProperty("min_rating"); // OLD bug - would fail
            expect(params).not.toHaveProperty("rating_min"); // Backend extracts this
        });

        it("generates vote_average_lte for maximum rating when no minimum", () => {
            // Arrange: User selects "Up to 8.0 rating"
            const browseParams = createBrowseParams({ maxRating: "8.0" });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Only lte parameter when no min provided
            expect(params.vote_average_lte).toBe("8.0");
            expect(params).not.toHaveProperty("vote_average_gte");
        });
    });

    describe("Combined Filter Parameter Generation", () => {
        it("generates all parameters for combined year + rating filters", () => {
            // Arrange: User applies both year and rating filters
            const browseParams = createBrowseParams({
                genres: [28, 12], // Action, Adventure
                minYear: "2020",
                maxYear: "2023",
                minRating: "7.5",
                maxRating: "9.0",
                sortBy: "vote_average.desc",
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: All filter types present
            expect(params.release_date_gte).toBe("2020-01-01");
            expect(params.release_date_lte).toBe("2023-12-31");
            expect(params.vote_average_gte).toBe("7.5");
            expect(params.vote_average_lte).toBe("9.0");
            expect(params.genres).toBe("28,12");
            expect(params.sort_by).toBe("vote_average.desc");
        });

        it("handles partial filters correctly", () => {
            // Arrange: User applies only some filters
            const browseParams = createBrowseParams({
                genres: [28],
                minYear: "2020",
                minRating: "7.0",
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Only provided filters generate parameters
            expect(params.release_date_gte).toBe("2020-01-01");
            expect(params.vote_average_gte).toBe("7.0");
            expect(params.genres).toBe("28");

            // Max parameters should not be present or should be default values
            expect(params.release_date_lte).toBeDefined(); // Mapper adds current year
            expect(params).not.toHaveProperty("vote_average_lte");
        });
    });

    describe("Range Filter Parameter Generation", () => {
        it("generates precise date ranges for year filters", () => {
            // Arrange: User applies year range via advanced panel or decade preset
            // Note: Decade presets (2020's) are converted to minYear/maxYear by UI before reaching mapper
            const browseParams = createBrowseParams({
                genres: [28],
                minYear: "2020",
                maxYear: "2029",
                minRating: "7.0",
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Year range generates date range parameters
            expect(params.release_date_gte).toBe("2020-01-01");
            expect(params.release_date_lte).toBe("2029-12-31");
            expect(params.vote_average_gte).toBe("7.0");
            expect(params.genres).toBe("28");
        });

        it("generates rating range filters", () => {
            // Arrange: User applies both min and max rating
            const browseParams = createBrowseParams({
                genres: [28, 12],
                minYear: "2020",
                maxYear: "2023",
                minRating: "7.0",
                maxRating: "9.0",
                sortBy: "vote_average.desc",
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Both min and max rating parameters generated
            expect(params.release_date_gte).toBe("2020-01-01");
            expect(params.release_date_lte).toBe("2023-12-31");
            expect(params.vote_average_gte).toBe("7.0");
            expect(params.vote_average_lte).toBe("9.0");
        });
    });

    describe("Parameter Format Validation", () => {
        it("formats dates as YYYY-MM-DD (backend schema requirement)", () => {
            // Arrange
            const browseParams = createBrowseParams({
                minYear: "2022",
                maxYear: "2022",
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Date format matches backend expectations
            expect(params.release_date_gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(params.release_date_lte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(params.release_date_gte).toBe("2022-01-01");
            expect(params.release_date_lte).toBe("2022-12-31");
        });

        it("formats ratings as strings (API query param requirement)", () => {
            // Arrange
            const browseParams = createBrowseParams({
                minRating: "7.5",
                maxRating: "9.0",
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Ratings sent as strings (query params)
            expect(typeof params.vote_average_gte).toBe("string");
            expect(typeof params.vote_average_lte).toBe("string");
            expect(params.vote_average_gte).toBe("7.5");
            expect(params.vote_average_lte).toBe("9.0");
        });

        it("formats genre IDs as comma-separated string", () => {
            // Arrange
            const browseParams = createBrowseParams({ genres: [28, 12, 878] }); // Action, Adventure, Sci-Fi

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Genre array converted to comma-separated string
            expect(params.genres).toBe("28,12,878");
        });
    });

    describe("Empty/Default Filter Handling", () => {
        it("does not include parameters for empty filters", () => {
            // Arrange: All filters empty
            const browseParams = createBrowseParams();

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Only sort_by present (default behavior)
            expect(params.sort_by).toBe("popularity.desc");
            expect(params).not.toHaveProperty("release_date_gte");
            expect(params).not.toHaveProperty("release_date_lte");
            expect(params).not.toHaveProperty("vote_average_gte");
            expect(params).not.toHaveProperty("vote_average_lte");
        });
    });

    describe("Certification Filter Parameter Generation", () => {
        it("generates certification params for single rating", () => {
            // Arrange: User selects "PG-13" certification
            const browseParams = createBrowseParams({
                certifications: ["PG-13"],
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: Single certification and country code
            expect(params.certification).toBe("PG-13");
            expect(params.certification_country).toBe("US");
        });

        it("generates pipe-separated certification for multiple ratings (OR logic)", () => {
            // Arrange: User selects "G" and "PG" certifications
            const browseParams = createBrowseParams({
                certifications: ["G", "PG"],
            });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: TMDB uses pipe (|) for OR logic between certifications
            expect(params.certification).toBe("G|PG");
            expect(params.certification_country).toBe("US");
        });

        it("does not include certification params when array is empty", () => {
            // Arrange: No certifications selected
            const browseParams = createBrowseParams({ certifications: [] });

            // Act
            const params = mapBrowseParamsToApi(browseParams);

            // Assert: No certification params
            expect(params).not.toHaveProperty("certification");
            expect(params).not.toHaveProperty("certification_country");
        });
    });
});
