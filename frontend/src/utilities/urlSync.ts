import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import type { MinimalMovieFilters } from "@/components/movie/filters/LetterboxdStyleFilters";
import type { SortOption } from "@/components/movie/filters/SortSelector";

/**
 * Updates URL parameters based on current filter state
 */
export function updateUrlFromFilters(
	filters: MovieFiltersType,
	minimalFilters: MinimalMovieFilters,
	filterStyle: "expanded" | "minimal"
): void {
	if (typeof window === "undefined") return;

	const url = new URL(window.location.href);

	// Clear existing filter params
	url.searchParams.delete("year");
	url.searchParams.delete("rating");
	url.searchParams.delete("runtime");
	url.searchParams.delete("query");
	url.searchParams.delete("sortBy");
	url.searchParams.delete("genres");
	url.searchParams.delete("minYear");
	url.searchParams.delete("maxYear");
	url.searchParams.delete("minRating");
	url.searchParams.delete("maxRating");
	url.searchParams.delete("minRuntime");
	url.searchParams.delete("maxRuntime");

	if (filterStyle === "minimal") {
		if (minimalFilters.year) url.searchParams.set("year", minimalFilters.year);
		if (minimalFilters.rating)
			url.searchParams.set("rating", minimalFilters.rating);
		if (minimalFilters.runtime)
			url.searchParams.set("runtime", minimalFilters.runtime);
		if (minimalFilters.query)
			url.searchParams.set("query", minimalFilters.query);
		if (minimalFilters.sortBy !== "popularity.desc") {
			url.searchParams.set("sortBy", minimalFilters.sortBy);
		}
		if (minimalFilters.genres.length > 0) {
			url.searchParams.set("genres", minimalFilters.genres.join(","));
		}
	} else {
		if (filters.query) url.searchParams.set("query", filters.query);
		if (filters.minYear) url.searchParams.set("minYear", filters.minYear);
		if (filters.maxYear) url.searchParams.set("maxYear", filters.maxYear);
		if (filters.minRating) url.searchParams.set("minRating", filters.minRating);
		if (filters.maxRating) url.searchParams.set("maxRating", filters.maxRating);
		if (filters.minRuntime)
			url.searchParams.set("minRuntime", filters.minRuntime);
		if (filters.maxRuntime)
			url.searchParams.set("maxRuntime", filters.maxRuntime);
		if (filters.sortBy !== "popularity.desc") {
			url.searchParams.set("sortBy", filters.sortBy);
		}
		if (filters.genres.length > 0) {
			url.searchParams.set("genres", filters.genres.join(","));
		}
	}

	window.history.replaceState({}, "", url.toString());
}

/**
 * Initializes filter state from URL parameters
 */
export function initializeFiltersFromUrl(filterStyle: "expanded" | "minimal"): {
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

	const params = new URLSearchParams(window.location.search);

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
