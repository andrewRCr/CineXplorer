import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import type { MinimalMovieFilters } from "@/components/movie/filters/LetterboxdStyleFilters";
import type { SortOptionValue } from "@/constants/movieFilterOptions";

/**
 * Initializes filter state from a URL search string.
 * @param filterStyle - The type of filter UI being used.
 * @param search - The search string from the URL (e.g., location.search).
 * @returns An object containing the populated filter states.
 */
export function initializeFiltersFromUrl(search: string): {
    filters: MovieFiltersType;
    minimalFilters: MinimalMovieFilters;
} {
    const params = new URLSearchParams(search);

    // Always parse all possible filter values from the URL.
    const query = params.get("query") || "";
    const genres =
        params
            .get("genres")
            ?.split(",")
            .filter(Boolean)
            .map((g) => parseInt(g))
            .filter((g) => !isNaN(g)) || [];
    const sortBy = (params.get("sortBy") as SortOptionValue) || "popularity.desc";
    const year = params.get("year") || "";
    const rating = params.get("rating") || "";
    const minYear = params.get("minYear") || "";
    const maxYear = params.get("maxYear") || "";
    const minRating = params.get("minRating") || "";
    const maxRating = params.get("maxRating") || "";
    const minRuntime = params.get("minRuntime") || "";
    const maxRuntime = params.get("maxRuntime") || "";
    const language = params.get("language") || "";

    // Populate both filter objects from the parsed URL params.
    const filters: MovieFiltersType = {
        query,
        genres,
        minYear,
        maxYear,
        minRating,
        maxRating,
        minRuntime,
        maxRuntime,
        sortBy,
        language,
    };

    const minimalFilters: MinimalMovieFilters = {
        genres,
        year,
        rating,
        // runtime removed - TMDB API returns incorrect results
        query,
        sortBy,
    };

    return { filters, minimalFilters };
}
