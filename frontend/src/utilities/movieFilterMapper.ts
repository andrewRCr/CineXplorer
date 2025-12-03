import type { BrowseParams } from "@/types/browseTypes";

/**
 * Converts UI filter state to API parameters for TMDB discover/search endpoints.
 *
 * This function handles two filter styles:
 * - **minimal**: Simplified filter UI (e.g., Letterboxd-style quick filters)
 * - **expanded**: Full advanced filter panel with all options
 *
 * @param filters - Current UI filter state (genres, year range, rating, sort, etc.)
 * @param filterStyle - UI filter layout mode affecting parameter mapping
 * @returns API parameters object ready to pass to TMDB endpoints
 *
 * @example
 * ```typescript
 * const params = mapFiltersToApiParams(
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
function addGenres(params: Record<string, string | number | number[]>, filters: BrowseParams) {
    if (filters.genres.length > 0) {
        params.genres = filters.genres.join(",");
    }
}

// Helper: Add query filter if present
function addQuery(params: Record<string, string | number | number[]>, filters: BrowseParams) {
    if (filters.query) {
        params.query = filters.query;
    }
}

// Helper: Add language filter if present
function addLanguage(params: Record<string, string | number | number[]>, filters: BrowseParams) {
    if (filters.language) {
        params.language = filters.language;
    }
}

// Helper: Add rating filters
function addRatings(params: Record<string, string | number | number[]>, filters: BrowseParams) {
    if (filters.minRating) {
        params.vote_average_gte = filters.minRating;
    }
    if (filters.maxRating) {
        params.vote_average_lte = filters.maxRating;
    }
}

// Helper: Add release date range with NaN validation
function addReleaseDateRange(
    params: Record<string, string | number | number[]>,
    filters: BrowseParams,
    filterStyle: "expanded" | "minimal"
) {
    if (!filters.minYear) {
        // Handle edge case: expanded mode with only maxYear
        if (filterStyle === "expanded" && filters.maxYear) {
            const maxYear = parseInt(filters.maxYear, 10);
            if (!isNaN(maxYear)) {
                params.release_date_lte = `${maxYear}-12-31`;
            }
        }
        return;
    }

    // Handle decade ranges in minimal mode (e.g., "2020s")
    if (filterStyle === "minimal" && filters.minYear.includes("s")) {
        const decade = filters.minYear.replace("s", "");
        const startYear = parseInt(decade, 10);
        // NaN check: Skip invalid decades (upstream validation expected, but defensive)
        if (isNaN(startYear)) return;

        const endYear = startYear + 9;
        params.release_date_gte = `${startYear}-01-01`;
        params.release_date_lte = `${endYear}-12-31`;
        return;
    }

    // Standard year range handling
    const startYear = parseInt(filters.minYear, 10);
    // NaN check: Skip invalid years (upstream validation expected, but defensive)
    if (isNaN(startYear)) return;

    const effectiveMaxYear = filters.maxYear
        ? parseInt(filters.maxYear, 10)
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
export function mapFiltersToApiParams(
    filters: BrowseParams,
    filterStyle: "expanded" | "minimal"
): Record<string, string | number | number[]> {
    const filterParams: Record<string, string | number | number[]> = {};

    // Apply shared filters (work for both minimal and expanded)
    addGenres(filterParams, filters);
    addQuery(filterParams, filters);
    addLanguage(filterParams, filters);
    addRatings(filterParams, filters);
    addReleaseDateRange(filterParams, filters, filterStyle);

    // Handle sort mapping
    if (filters.sortBy) {
        // Minimal mode: Use sort map for special cases, otherwise pass through
        if (filterStyle === "minimal" && filters.sortBy in SORT_MAP) {
            Object.assign(filterParams, SORT_MAP[filters.sortBy]);
        } else {
            // Expanded mode or unrecognized sort: Pass through as-is
            filterParams.sort_by = filters.sortBy;
        }
    }

    return filterParams;
}
