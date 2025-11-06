import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";

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
export function mapFiltersToApiParams(
    filters: MovieFiltersType,
    filterStyle: "expanded" | "minimal"
): Record<string, string | number | number[]> {
    const filterParams: Record<string, string | number | number[]> = {};

    if (filterStyle === "minimal") {
        // Handle minimal filters
        if (filters.genres.length > 0) {
            filterParams.genres = filters.genres.join(",");
        }

        if (filters.minYear) {
            if (filters.minYear.includes("s")) {
                // Handle decade ranges like "2020s"
                const decade = filters.minYear.replace("s", "");
                const startYear = parseInt(decade);
                const endYear = startYear + 9;
                filterParams.release_date_gte = `${startYear}-01-01`;
                filterParams.release_date_lte = `${endYear}-12-31`;
            } else {
                // Handle single year or a custom range from URL params
                const startYear = parseInt(filters.minYear);
                // If no maxYear specified, default to current year for "from X onward" behavior
                const endYear = filters.maxYear
                    ? parseInt(filters.maxYear)
                    : new Date().getFullYear();

                filterParams.release_date_gte = `${startYear}-01-01`;
                filterParams.release_date_lte = `${endYear}-12-31`;
            }
        }

        if (filters.minRating) {
            filterParams.vote_average_gte = filters.minRating;
        }

        if (filters.query) {
            filterParams.query = filters.query;
        }

        if (filters.sortBy) {
            const sortBy = filters.sortBy as string;
            if (sortBy === "runtime_90") {
                filterParams.with_runtime_lte = "90";
                filterParams.sort_by = "popularity.desc";
            } else if (sortBy === "runtime_120") {
                filterParams.with_runtime_lte = "120";
                filterParams.sort_by = "popularity.desc";
            } else if (sortBy === "rating_desc") {
                filterParams.sort_by = "vote_average.desc";
            } else if (sortBy === "rating_asc") {
                filterParams.sort_by = "vote_average.asc";
            } else {
                filterParams.sort_by = sortBy;
            }
        }
    } else {
        // Handle expanded filters
        if (filters.query) filterParams.query = filters.query;
        if (filters.genres.length > 0)
            filterParams.genres = filters.genres.join(",");

        if (filters.minYear) {
            filterParams.release_date_gte = `${filters.minYear}-01-01`;

            // If no maxYear is specified, implicitly use current year ("from X onward" behavior)
            const effectiveMaxYear =
                filters.maxYear || new Date().getFullYear().toString();
            filterParams.release_date_lte = `${effectiveMaxYear}-12-31`;
        }

        if (filters.maxYear && !filters.minYear) {
            // Handle case where only maxYear is specified ("up to X" behavior)
            filterParams.release_date_lte = `${filters.maxYear}-12-31`;
        }

        if (filters.minRating) {
            filterParams.vote_average_gte = filters.minRating;
        }
        if (filters.maxRating) {
            filterParams.vote_average_lte = filters.maxRating;
        }
        if (filters.sortBy) filterParams.sort_by = filters.sortBy;
    }

    return filterParams;
}
