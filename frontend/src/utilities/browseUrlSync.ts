import type { BrowseParams, SortOptionValue } from "@/types/browseTypes";
import { DEFAULT_SORT } from "@/constants/browseDefaults";
import { isDefaultSort } from "@/utilities/browseParamUtils";

/**
 * Parses browse parameters from URL query string
 *
 * Extracts all browse state from URL query parameters, returning a complete
 * BrowseParams object. Missing parameters receive their default values.
 *
 * @param search - The URL query string (location.search)
 * @returns Complete BrowseParams object populated from URL (or defaults for missing params)
 */
export function parseBrowseParamsFromUrl(search: string): BrowseParams {
    const params = new URLSearchParams(search);

    // Note: Movie search query is NOT parsed here - it flows through a separate path
    // (URL ?query= → searchQuery memo in MovieCollectionLayout → context.query)
    const genres =
        params
            .get("genres")
            ?.split(",")
            .filter(Boolean)
            .map((g) => parseInt(g))
            .filter((g) => !isNaN(g)) || [];
    const sortBy = (params.get("sortBy") as SortOptionValue) || DEFAULT_SORT;
    const minYear = params.get("minYear") || "";
    const maxYear = params.get("maxYear") || "";
    const minRating = params.get("minRating") || "";
    const maxRating = params.get("maxRating") || "";
    const language = params.get("language") || "";
    const certifications =
        params.get("certifications")?.split(",").filter(Boolean) || [];

    return {
        genres,
        minYear,
        maxYear,
        minRating,
        maxRating,
        sortBy,
        language,
        certifications,
    };
}

/**
 * Generates URL query string from browse parameters
 *
 * Only includes non-default values to keep URLs clean:
 * - Empty strings and empty arrays are omitted
 * - Default sort is omitted
 *
 * Note: This generates only browse params. Movie search query is handled
 * separately via searchUrlSync.ts.
 *
 * @param browseParams - Browse parameters to serialize
 * @returns URL query string (without leading "?")
 *
 * @example
 * generateBrowseUrl({ genres: [28, 35], sortBy: "vote_average.desc", ... })
 * // => "genres=28,35&sortBy=vote_average.desc"
 */
export function generateBrowseUrl(browseParams: BrowseParams): string {
    const params = new URLSearchParams();

    // Genres (array)
    if (browseParams.genres.length > 0) {
        params.set("genres", browseParams.genres.join(","));
    }

    // Sort (only if non-default)
    if (!isDefaultSort(browseParams.sortBy)) {
        params.set("sortBy", browseParams.sortBy);
    }

    // Year range
    if (browseParams.minYear) {
        params.set("minYear", browseParams.minYear);
    }
    if (browseParams.maxYear) {
        params.set("maxYear", browseParams.maxYear);
    }

    // Rating range
    if (browseParams.minRating) {
        params.set("minRating", browseParams.minRating);
    }
    if (browseParams.maxRating) {
        params.set("maxRating", browseParams.maxRating);
    }

    // Language
    if (browseParams.language) {
        params.set("language", browseParams.language);
    }

    // Certifications (array)
    if (browseParams.certifications && browseParams.certifications.length > 0) {
        params.set("certifications", browseParams.certifications.join(","));
    }

    return params.toString();
}
