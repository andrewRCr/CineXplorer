import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import type { MinimalMovieFilters } from "@/components/movie/filters/LetterboxdStyleFilters";
import type { SortOption } from "@/components/movie/filters/SortSelector";

/**
 * Initializes filter state from a URL search string.
 * @param filterStyle - The type of filter UI being used.
 * @param search - The search string from the URL (e.g., location.search).
 * @returns An object containing the populated filter states.
 */
export function initializeFiltersFromUrl(
	filterStyle: "expanded" | "minimal",
	search: string
): {
	filters: MovieFiltersType;
	minimalFilters: MinimalMovieFilters;
} {
	const defaultFilters: MovieFiltersType = {
		query: "",
		genres: [],
		minYear: "",
		maxYear: "",
		minRating: "",
		maxRating: "",
		minRuntime: "",
		maxRuntime: "",
		sortBy: "popularity.desc",
	};

	const defaultMinimalFilters: MinimalMovieFilters = {
		genres: [],
		year: "",
		rating: "",
		runtime: "",
		query: "",
		sortBy: "popularity.desc",
	};

	if (typeof window === "undefined") {
		return {
			filters: defaultFilters,
			minimalFilters: defaultMinimalFilters,
		};
	}

	const params = new URLSearchParams(search);

	if (filterStyle === "minimal") {
		const year = params.get("year") || "";
		const rating = params.get("rating") || "";
		const runtime = params.get("runtime") || "";
		const query = params.get("query") || "";
		const sortBy = params.get("sortBy") || "popularity.desc";
		const genres =
			params
				.get("genres")
				?.split(",")
				.filter(Boolean)
				.map((g) => parseInt(g))
				.filter((g) => !isNaN(g)) || [];

		return {
			filters: defaultFilters,
			minimalFilters: {
				genres,
				year,
				rating,
				runtime,
				query,
				sortBy: sortBy as SortOption,
			},
		};
	} else {
		const query = params.get("query") || "";
		const minYear = params.get("minYear") || "";
		const maxYear = params.get("maxYear") || "";
		const minRating = params.get("minRating") || "";
		const maxRating = params.get("maxRating") || "";
		const minRuntime = params.get("minRuntime") || "";
		const maxRuntime = params.get("maxRuntime") || "";
		const sortBy = params.get("sortBy") || "popularity.desc";
		const genres =
			params
				.get("genres")
				?.split(",")
				.filter(Boolean)
				.map((g) => parseInt(g))
				.filter((g) => !isNaN(g)) || [];

		return {
			filters: {
				query,
				genres,
				minYear,
				maxYear,
				minRating,
				maxRating,
				minRuntime,
				maxRuntime,
				sortBy: sortBy as SortOption,
			},
			minimalFilters: defaultMinimalFilters,
		};
	}
}
