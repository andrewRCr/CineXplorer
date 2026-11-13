import type { BrowseParams } from "@/types/browseTypes";

/**
 * Converts browse parameter state to API parameters for TMDB discover/search endpoints.
 *
 * Maps filter values directly to API parameters - no knowledge of UI layout needed.
 *
 * @param browseParams - Current browse state (genres, year range, rating, sort, etc.)
 * @returns API parameters object ready to pass to TMDB endpoints
 *
 * @example
 * ```typescript
 * const params = mapBrowseParamsToApi({
 *   genres: [28, 12],
 *   minYear: "2020",
 *   minRating: "7.0"
 * });
 * // Returns: {
 * //   genres: "28,12",
 * //   release_date_gte: "2020-01-01",
 * //   release_date_lte: "2025-12-31",
 * //   vote_average_gte: "7.0"
 * // }
 * ```
 */

// Helper: Add genres filter if present
function addGenres(
    params: Record<string, string | number | number[]>,
    browseParams: BrowseParams,
) {
    if (browseParams.genres.length > 0) {
        params.genres = browseParams.genres.join(",");
    }
}

// Helper: Add language filter if present
function addLanguage(
    params: Record<string, string | number | number[]>,
    browseParams: BrowseParams,
) {
    if (browseParams.language) {
        params.language = browseParams.language;
    }
}

// Helper: Add certification filter if present
function addCertifications(
    params: Record<string, string | number | number[]>,
    browseParams: BrowseParams,
) {
    if (browseParams.certifications && browseParams.certifications.length > 0) {
        // TMDB uses pipe (|) for OR logic between certifications
        params.certification = browseParams.certifications.join("|");
        // Always include US as certification country (MPAA ratings)
        params.certification_country = "US";
    }
}

// Helper: Add rating filters
function addRatings(
    params: Record<string, string | number | number[]>,
    browseParams: BrowseParams,
) {
    if (browseParams.minRating) {
        params.vote_average_gte = browseParams.minRating;
    }
    if (browseParams.maxRating) {
        params.vote_average_lte = browseParams.maxRating;
    }
}

/** Parse the user-supplied bounds without inventing an upper bound for an open-ended range. */
export function readYearBounds({
    minYear,
    maxYear,
}: Pick<BrowseParams, "minYear" | "maxYear">): {
    minimum?: number;
    maximum?: number;
} {
    const minimum = minYear ? parseInt(minYear, 10) : undefined;
    if (minimum !== undefined && isNaN(minimum)) return {};
    const maximum = maxYear ? parseInt(maxYear, 10) : undefined;
    return {
        minimum,
        maximum: maximum !== undefined && !isNaN(maximum) ? maximum : undefined,
    };
}

function addReleaseDateRange(
    params: Record<string, string | number | number[]>,
    browseParams: BrowseParams,
) {
    const { minimum, maximum } = readYearBounds(browseParams);
    if (minimum !== undefined) {
        params.release_date_gte = `${minimum}-01-01`;
        params.release_date_lte = `${maximum ?? new Date().getFullYear()}-12-31`;
    } else if (maximum !== undefined) {
        params.release_date_lte = `${maximum}-12-31`;
    }
}

export function mapBrowseParamsToApi(
    browseParams: BrowseParams,
): Record<string, string | number | number[]> {
    const apiParams: Record<string, string | number | number[]> = {};

    // Apply all filter params
    addGenres(apiParams, browseParams);
    addLanguage(apiParams, browseParams);
    addCertifications(apiParams, browseParams);
    addRatings(apiParams, browseParams);
    addReleaseDateRange(apiParams, browseParams);

    // Handle sort - pass through directly
    if (browseParams.sortBy) {
        apiParams.sort_by = browseParams.sortBy;
    }

    return apiParams;
}
