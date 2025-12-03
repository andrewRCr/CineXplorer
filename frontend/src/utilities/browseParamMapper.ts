import type { BrowseParams } from "@/types/browseTypes";

/**
 * Converts browse parameter state to API parameters for TMDB discover/search endpoints.
 *
 * This function handles two browse layouts:
 * - **compact**: Simplified browse UI (e.g., quick browse bar)
 * - **expanded**: Full advanced filters panel with all options
 *
 * @param browseParams - Current browse state (genres, year range, rating, sort, etc.)
 * @param browseLayout - UI layout mode affecting parameter mapping
 * @returns API parameters object ready to pass to TMDB endpoints
 *
 * @example
 * ```typescript
 * const params = mapBrowseParamsToApi(
 *   { genres: [28, 12], minYear: "2020", minRating: "7.0" },
 *   "expanded"
 * );
 * // Returns: {
 * //   genres: "28,12",
 * //   release_date_gte: "2020-01-01",
 * //   release_date_lte: "2025-12-31",
 * //   vote_average_gte: "7.0"
 * // }
 * ```
 */

// Helper: Add genres filter if present
function addGenres(params: Record<string, string | number | number[]>, browseParams: BrowseParams) {
    if (browseParams.genres.length > 0) {
        params.genres = browseParams.genres.join(",");
    }
}

// Helper: Add query filter if present
function addQuery(params: Record<string, string | number | number[]>, browseParams: BrowseParams) {
    if (browseParams.query) {
        params.query = browseParams.query;
    }
}

// Helper: Add language filter if present
function addLanguage(params: Record<string, string | number | number[]>, browseParams: BrowseParams) {
    if (browseParams.language) {
        params.language = browseParams.language;
    }
}

// Helper: Add rating filters
function addRatings(params: Record<string, string | number | number[]>, browseParams: BrowseParams) {
    if (browseParams.minRating) {
        params.vote_average_gte = browseParams.minRating;
    }
    if (browseParams.maxRating) {
        params.vote_average_lte = browseParams.maxRating;
    }
}

// Helper: Add release date range with NaN validation
function addReleaseDateRange(
    params: Record<string, string | number | number[]>,
    browseParams: BrowseParams,
    browseLayout: "expanded" | "minimal"
) {
    if (!browseParams.minYear) {
        // Handle edge case: expanded mode with only maxYear
        if (browseLayout === "expanded" && browseParams.maxYear) {
            const maxYear = parseInt(browseParams.maxYear, 10);
            if (!isNaN(maxYear)) {
                params.release_date_lte = `${maxYear}-12-31`;
            }
        }
        return;
    }

    // Handle decade ranges in minimal mode (e.g., "2020s")
    if (browseLayout === "minimal" && browseParams.minYear.includes("s")) {
        const decade = browseParams.minYear.replace("s", "");
        const startYear = parseInt(decade, 10);
        // NaN check: Skip invalid decades (upstream validation expected, but defensive)
        if (isNaN(startYear)) return;

        const endYear = startYear + 9;
        params.release_date_gte = `${startYear}-01-01`;
        params.release_date_lte = `${endYear}-12-31`;
        return;
    }

    // Standard year range handling
    const startYear = parseInt(browseParams.minYear, 10);
    // NaN check: Skip invalid years (upstream validation expected, but defensive)
    if (isNaN(startYear)) return;

    const effectiveMaxYear = browseParams.maxYear
        ? parseInt(browseParams.maxYear, 10)
        : new Date().getFullYear();

    // NaN check for maxYear (fallback to current year if invalid)
    const endYear = isNaN(effectiveMaxYear) ? new Date().getFullYear() : effectiveMaxYear;

    params.release_date_gte = `${startYear}-01-01`;
    params.release_date_lte = `${endYear}-12-31`;
}

// Sort mapping configuration (for special combined filter+sort cases)
// Note: Standard sorts (popularity.desc, vote_average.desc, etc.) pass through directly
const SORT_MAP: Record<string, Record<string, string>> = {
    runtime_90: { with_runtime_lte: "90", sort_by: "popularity.desc" },
    runtime_120: { with_runtime_lte: "120", sort_by: "popularity.desc" },
};

export function mapBrowseParamsToApi(
    browseParams: BrowseParams,
    browseLayout: "expanded" | "minimal"
): Record<string, string | number | number[]> {
    const apiParams: Record<string, string | number | number[]> = {};

    // Apply shared params (work for both minimal and expanded layouts)
    addGenres(apiParams, browseParams);
    addQuery(apiParams, browseParams);
    addLanguage(apiParams, browseParams);
    addRatings(apiParams, browseParams);
    addReleaseDateRange(apiParams, browseParams, browseLayout);

    // Handle sort mapping
    if (browseParams.sortBy) {
        // Minimal layout: Use sort map for special cases, otherwise pass through
        if (browseLayout === "minimal" && browseParams.sortBy in SORT_MAP) {
            Object.assign(apiParams, SORT_MAP[browseParams.sortBy]);
        } else {
            // Expanded layout or unrecognized sort: Pass through as-is
            apiParams.sort_by = browseParams.sortBy;
        }
    }

    return apiParams;
}
