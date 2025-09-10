import type { Movie } from "@/services/movieService";
import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import type { MinimalMovieFilters } from "@/components/movie/filters/LetterboxdStyleFilters";

export type YearFilterCriteria = {
	type: "single" | "range" | "decade";
	value: string;
};

/**
 * Converts UI filter state to API parameters for TMDB
 */
export function mapFiltersToApiParams(
	filters: MovieFiltersType,
	minimalFilters: MinimalMovieFilters,
	filterStyle: "expanded" | "minimal"
): {
	filterParams: Record<string, string | number | number[]>;
	yearFilterCriteria: YearFilterCriteria | null;
} {
	const filterParams: Record<string, string | number | number[]> = {};
	let yearFilterCriteria: YearFilterCriteria | null = null;

	if (filterStyle === "minimal") {
		// Handle minimal filters
		if (minimalFilters.genres.length > 0) {
			filterParams.genres = minimalFilters.genres.join(",");
		}

		if (minimalFilters.year) {
			if (minimalFilters.year.includes("s")) {
				// Handle decade ranges like "2020s"
				const decade = minimalFilters.year.replace("s", "");
				const startYear = parseInt(decade);
				const endYear = startYear + 9;
				filterParams.release_date_gte = `${startYear}-01-01`;
				filterParams.release_date_lte = `${endYear}-12-31`;
				yearFilterCriteria = { type: "decade", value: minimalFilters.year };
			} else {
				// Use date range for better TMDB filtering
				const year = parseInt(minimalFilters.year);
				filterParams.release_date_gte = `${year}-01-01`;
				filterParams.release_date_lte = `${year}-12-31`;
				yearFilterCriteria = { type: "single", value: minimalFilters.year };
			}
		}

		if (minimalFilters.rating) {
			filterParams.min_rating = minimalFilters.rating;
		}

		if (minimalFilters.runtime) {
			if (minimalFilters.runtime === "90") {
				filterParams.max_runtime = "90";
			} else if (minimalFilters.runtime === "120") {
				filterParams.max_runtime = "120";
			} else if (minimalFilters.runtime === "121") {
				filterParams.min_runtime = "121";
			}
		}

		if (minimalFilters.query) {
			filterParams.query = minimalFilters.query;
		}

		if (minimalFilters.sortBy) {
			if (minimalFilters.sortBy === "runtime_90") {
				filterParams.max_runtime = "90";
				filterParams.sort_by = "popularity.desc";
			} else if (minimalFilters.sortBy === "runtime_120") {
				filterParams.max_runtime = "120";
				filterParams.sort_by = "popularity.desc";
			} else if (minimalFilters.sortBy === "rating_desc") {
				filterParams.sort_by = "vote_average.desc";
			} else if (minimalFilters.sortBy === "rating_asc") {
				filterParams.sort_by = "vote_average.asc";
			} else {
				filterParams.sort_by = minimalFilters.sortBy;
			}
		}
	} else {
		// Handle expanded filters
		if (filters.query) filterParams.query = filters.query;
		if (filters.genres.length > 0)
			filterParams.genres = filters.genres.join(",");

		if (filters.minYear) {
			filterParams.release_date_gte = `${filters.minYear}-01-01`;
			if (!yearFilterCriteria) {
				yearFilterCriteria = {
					type: "range",
					value: `${filters.minYear}-${filters.maxYear || "present"}`,
				};
			}
		}

		if (filters.maxYear) {
			filterParams.release_date_lte = `${filters.maxYear}-12-31`;
			if (!yearFilterCriteria) {
				yearFilterCriteria = {
					type: "range",
					value: `${filters.minYear || "past"}-${filters.maxYear}`,
				};
			}
		}

		if (filters.minRating) filterParams.min_rating = filters.minRating;
		if (filters.maxRating) filterParams.max_rating = filters.maxRating;
		if (filters.minRuntime) filterParams.min_runtime = filters.minRuntime;
		if (filters.maxRuntime) filterParams.max_runtime = filters.maxRuntime;
		if (filters.sortBy) filterParams.sort_by = filters.sortBy;
	}

	return { filterParams, yearFilterCriteria };
}

/**
 * Filters movies by year based on the provided criteria
 */
export function filterMoviesByYear(
	movies: Movie[],
	yearFilterCriteria: YearFilterCriteria | null
): Movie[] {
	if (!yearFilterCriteria || movies.length === 0) return movies;

	return movies.filter((movie: Movie) => {
		if (!movie.release_date) return false;

		const movieYear = new Date(movie.release_date).getFullYear();

		switch (yearFilterCriteria.type) {
			case "single":
				return movieYear.toString() === yearFilterCriteria.value;
			case "decade": {
				const decadeStart = parseInt(yearFilterCriteria.value.replace("s", ""));
				return movieYear >= decadeStart && movieYear <= decadeStart + 9;
			}
			case "range": {
				const [minYear, maxYear] = yearFilterCriteria.value
					.split("-")
					.map((y) =>
						y === "past"
							? 1900
							: y === "present"
							? new Date().getFullYear()
							: parseInt(y)
					);
				return movieYear >= minYear && movieYear <= maxYear;
			}
			default:
				return true;
		}
	});
}

/**
 * Calculates pagination metadata for filtered results
 */
export function calculatePaginationMetadata(
	originalTotalResults: number,
	currentPageResultCount: number,
	page: number,
	hasYearFilter: boolean,
	targetPageSize: number = 20
): {
	estimatedFilteredTotal: number;
	paginationSafeCount: number;
	totalPages: number;
} {
	// Use TMDB's total if available and valid, otherwise estimate
	let estimatedFilteredTotal: number;

	if (
		originalTotalResults &&
		!isNaN(originalTotalResults) &&
		originalTotalResults > 0
	) {
		// For unfiltered results, trust TMDB's total completely
		// Only apply conservative estimates for actual filtered results
		estimatedFilteredTotal = hasYearFilter
			? Math.floor(originalTotalResults * 0.8) // Slight conservative estimate for year filters
			: originalTotalResults; // Trust TMDB completely for unfiltered results
	} else {
		// Fallback estimation when TMDB total is unavailable
		const pageMultiplier = Math.max(0.5, Math.min(1.5, 2 - page * 0.2));
		estimatedFilteredTotal = Math.floor(
			currentPageResultCount * pageMultiplier
		);
	}

	// Ensure we don't go below current page results
	estimatedFilteredTotal = Math.max(
		estimatedFilteredTotal,
		currentPageResultCount
	);

	// For pagination UI, limit to reasonable number of pages ahead
	const paginationSafeCount = Math.min(
		estimatedFilteredTotal,
		(page + 5) * targetPageSize
	);

	const totalPages = Math.max(
		1,
		Math.ceil(paginationSafeCount / targetPageSize)
	);

	return {
		estimatedFilteredTotal,
		paginationSafeCount,
		totalPages,
	};
}
