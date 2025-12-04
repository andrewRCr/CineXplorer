import type { BrowseParams } from "@/types/browseTypes";

/**
 * Converts browse parameter state to API parameters for TMDB discover/search endpoints.
 *
 * This function handles two browse layouts:
 * - **compact**: Simplified browse UI (e.g., quick browse bar) - decade presets, limited sorts
 * - **expanded**: Full advanced filters panel with all options
 *
 * @param browseParams - Current browse state (genres, year range, rating, sort, etc.)
 * @param browseLayout - UI layout mode affecting parameter mapping ("expanded" | "compact")
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

// Helper: Add query filter if present (reserved for future use)
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
    browseLayout: "expanded" | "compact"
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

    // Handle decade ranges in compact mode (e.g., "2020s")
    if (browseLayout === "compact" && browseParams.minYear.includes("s")) {
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

export function mapBrowseParamsToApi(
    browseParams: BrowseParams,
    browseLayout: "expanded" | "compact"
): Record<string, string | number | number[]> {
    const apiParams: Record<string, string | number | number[]> = {};

    // Apply shared params (work for both compact and expanded layouts)
    addGenres(apiParams, browseParams);
    addQuery(apiParams, browseParams);
    addLanguage(apiParams, browseParams);
    addRatings(apiParams, browseParams);
    addReleaseDateRange(apiParams, browseParams, browseLayout);

    // Handle sort - pass through directly
    if (browseParams.sortBy) {
        apiParams.sort_by = browseParams.sortBy;
    }

    return apiParams;
}
