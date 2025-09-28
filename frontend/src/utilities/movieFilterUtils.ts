import type { MovieBase } from "../@types/movie";
import type { MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";

export type YearFilterCriteria = {
	type: "single" | "range" | "decade";
	value: string;
};

export type RatingFilterCriteria = {
	type: "min" | "range";
	minRating: number;
	maxRating?: number;
};

export type RuntimeFilterCriteria = {
	type: "min" | "max" | "range";
	minRuntime?: number;
	maxRuntime?: number;
};

/**
 * Converts UI filter state to API parameters for TMDB
 */
export function mapFiltersToApiParams(
	filters: MovieFiltersType,
	filterStyle: "expanded" | "minimal"
): {
	filterParams: Record<string, string | number | number | number[]>;
	yearFilterCriteria: YearFilterCriteria | null;
	ratingFilterCriteria: RatingFilterCriteria | null;
	runtimeFilterCriteria: RuntimeFilterCriteria | null;
} {
	const filterParams: Record<string, string | number | number[]> = {};
	let yearFilterCriteria: YearFilterCriteria | null = null;
	let ratingFilterCriteria: RatingFilterCriteria | null = null;
	const runtimeFilterCriteria: RuntimeFilterCriteria | null = null;

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
				yearFilterCriteria = { type: "decade", value: filters.minYear };
			} else {
				// Handle single year or a custom range from URL params
				const startYear = parseInt(filters.minYear);
				// If no maxYear specified, default to current year for "from X onward" behavior
				const endYear = filters.maxYear ? parseInt(filters.maxYear) : new Date().getFullYear();

				filterParams.release_date_gte = `${startYear}-01-01`;
				filterParams.release_date_lte = `${endYear}-12-31`;

				if (startYear === endYear) {
					yearFilterCriteria = { type: "single", value: filters.minYear };
				} else {
					yearFilterCriteria = {
						type: "range",
						value: `${startYear}-${endYear}`,
					};
				}
			}
		}

		if (filters.minRating) {
			filterParams.min_rating = filters.minRating;
			// Create rating filter criteria for client-side filtering
			ratingFilterCriteria = {
				type: "min",
				minRating: parseFloat(filters.minRating)
			};
		}

		// DISABLED: Runtime filtering - TMDB API returns incorrect results
		// Handle runtime filtering for both min and max
		// if (filters.minRuntime || filters.maxRuntime) {
		//	if (filters.minRuntime) {
		//		filterParams.min_runtime = filters.minRuntime;
		//	}
		//	if (filters.maxRuntime) {
		//		filterParams.max_runtime = filters.maxRuntime;
		//	}
		//	
		//	// Create runtime filter criteria for client-side filtering
		//	if (filters.minRuntime && filters.maxRuntime) {
		//		// Special case: if maxRuntime is 999, treat as "min only"
		//		if (filters.maxRuntime === "999") {
		//			runtimeFilterCriteria = {
		//				type: "min",
		//				minRuntime: parseInt(filters.minRuntime)
		//			};
		//		} else {
		//			runtimeFilterCriteria = {
		//				type: "range",
		//				minRuntime: parseInt(filters.minRuntime),
		//				maxRuntime: parseInt(filters.maxRuntime)
		//			};
		//		}
		//	} else if (filters.minRuntime) {
		//		runtimeFilterCriteria = {
		//			type: "min",
		//			minRuntime: parseInt(filters.minRuntime)
		//		};
		//	} else if (filters.maxRuntime) {
		//		runtimeFilterCriteria = {
		//			type: "max",
		//			maxRuntime: parseInt(filters.maxRuntime)
		//		};
		//	}
		// }

		if (filters.query) {
			filterParams.query = filters.query;
		}

		if (filters.sortBy) {
			const sortBy = filters.sortBy as string;
			if (sortBy === "runtime_90") {
				filterParams.max_runtime = "90";
				filterParams.sort_by = "popularity.desc";
			} else if (sortBy === "runtime_120") {
				filterParams.max_runtime = "120";
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
			const effectiveMaxYear = filters.maxYear || new Date().getFullYear().toString();
			filterParams.release_date_lte = `${effectiveMaxYear}-12-31`;
			
			if (!yearFilterCriteria) {
				yearFilterCriteria = {
					type: "range",
					value: `${filters.minYear}-${filters.maxYear || "present"}`,
				};
			}
		}

		if (filters.maxYear && !filters.minYear) {
			// Handle case where only maxYear is specified ("up to X" behavior)
			filterParams.release_date_lte = `${filters.maxYear}-12-31`;
			if (!yearFilterCriteria) {
				yearFilterCriteria = {
					type: "range",
					value: `past-${filters.maxYear}`,
				};
			}
		}

		if (filters.minRating) {
			filterParams.min_rating = filters.minRating;
			ratingFilterCriteria = {
				type: filters.maxRating ? "range" : "min",
				minRating: parseFloat(filters.minRating),
				maxRating: filters.maxRating ? parseFloat(filters.maxRating) : undefined
			};
		}
		if (filters.maxRating && !filters.minRating) {
			filterParams.max_rating = filters.maxRating;
			ratingFilterCriteria = {
				type: "range",
				minRating: 0,
				maxRating: parseFloat(filters.maxRating)
			};
		}
		// DISABLED: Runtime filtering for expanded filters - TMDB API returns incorrect results
		// if (filters.minRuntime || filters.maxRuntime) {
		//	if (filters.minRuntime) {
		//		filterParams.min_runtime = filters.minRuntime;
		//	}
		//	if (filters.maxRuntime) {
		//		filterParams.max_runtime = filters.maxRuntime;
		//	}
		//	
		//	// Create runtime filter criteria for client-side filtering
		//	if (filters.minRuntime && filters.maxRuntime) {
		//		// Special case: if maxRuntime is 999, treat as "min only"
		//		if (filters.maxRuntime === "999") {
		//			runtimeFilterCriteria = {
		//				type: "min",
		//				minRuntime: parseInt(filters.minRuntime)
		//			};
		//		} else {
		//			runtimeFilterCriteria = {
		//				type: "range",
		//				minRuntime: parseInt(filters.minRuntime),
		//				maxRuntime: parseInt(filters.maxRuntime)
		//			};
		//		}
		//	} else if (filters.minRuntime) {
		//		runtimeFilterCriteria = {
		//			type: "min",
		//			minRuntime: parseInt(filters.minRuntime)
		//		};
		//	} else if (filters.maxRuntime) {
		//		runtimeFilterCriteria = {
		//			type: "max",
		//			maxRuntime: parseInt(filters.maxRuntime)
		//		};
		//	}
		// }
		if (filters.sortBy) filterParams.sort_by = filters.sortBy;
	}


	return { filterParams, yearFilterCriteria, ratingFilterCriteria, runtimeFilterCriteria };
}

/**
 * Filters movies by year based on the provided criteria
 */
export function filterMoviesByYear(
	movies: MovieBase[],
	yearFilterCriteria: YearFilterCriteria | null
): MovieBase[] {
	if (!yearFilterCriteria || movies.length === 0) return movies;

	return movies.filter((movie: MovieBase) => {
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
 * Filters movies by runtime based on the provided criteria
 */
export function filterMoviesByRuntime(
	movies: MovieBase[],
	runtimeFilterCriteria: RuntimeFilterCriteria | null
): MovieBase[] {
	if (!runtimeFilterCriteria || movies.length === 0) return movies;

	return movies.filter((movie: MovieBase) => {
		// Handle missing runtime data - need to fetch it from the movie details if not available
		// For now, we'll skip movies without runtime data
		if (!movie.runtime && movie.runtime !== 0) return false;

		const movieRuntime = movie.runtime;

		switch (runtimeFilterCriteria.type) {
			case "min":
				// For "150+ minutes" type filtering
				return movieRuntime >= (runtimeFilterCriteria.minRuntime || 0);
			case "max":
				// For "under X minutes" type filtering
				return movieRuntime <= (runtimeFilterCriteria.maxRuntime || Infinity);
			case "range":
				// For specific range filtering
				return movieRuntime >= (runtimeFilterCriteria.minRuntime || 0) && 
					   movieRuntime <= (runtimeFilterCriteria.maxRuntime || Infinity);
			default:
				return true;
		}
	});
}

/**
 * Filters movies by rating based on the provided criteria (to fix TMDB leakage)
 */
export function filterMoviesByRating(
	movies: MovieBase[],
	ratingFilterCriteria: RatingFilterCriteria | null
): MovieBase[] {
	if (!ratingFilterCriteria || movies.length === 0) return movies;

	return movies.filter((movie: MovieBase) => {
		// Handle missing ratings - TMDB sometimes has 0 or null ratings
		if (!movie.vote_average && movie.vote_average !== 0) return false;

		const movieRating = movie.vote_average;

		switch (ratingFilterCriteria.type) {
			case "min":
				// For "75% and above" type filtering
				return movieRating >= ratingFilterCriteria.minRating;
			case "range":
				// For specific range filtering
				return movieRating >= ratingFilterCriteria.minRating && 
					   (!ratingFilterCriteria.maxRating || movieRating <= ratingFilterCriteria.maxRating);
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
	hasRatingFilter: boolean = false,
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
		if (hasYearFilter || hasRatingFilter) {
			// Apply more conservative estimate for rating filters since TMDB has more leakage
			const conservativeMultiplier = hasRatingFilter ? 0.7 : 0.8;
			estimatedFilteredTotal = Math.floor(originalTotalResults * conservativeMultiplier);
		} else {
			estimatedFilteredTotal = originalTotalResults; // Trust TMDB completely for unfiltered results
		}
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

	// For pagination UI, only limit for filtered results
	// For unfiltered results, trust TMDB's actual pagination limits
	const paginationSafeCount = (hasYearFilter || hasRatingFilter)
		? Math.min(estimatedFilteredTotal, (page + 5) * targetPageSize)
		: estimatedFilteredTotal;

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
