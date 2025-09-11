import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
	fetchSearchMoviesService,
	type PaginatedMoviesResponse,
} from "@/services/movieService";
import MovieGridPageLayout from "@/components/movie/MovieGridPageLayout";

const SearchResults = () => {
	console.log("🔍 SearchResults: COMPONENT STARTED");
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const initialQuery = searchParams.get("query") || "";

	console.log("SearchResults: Component render", {
		initialQuery,
		searchParams: searchParams.toString(),
	});

	const fetcher = useCallback(
		(page: number) => {
			// For search, we only need the query parameter
			const searchParams = {
				page,
				query: initialQuery,
			};

			console.log(
				"SearchResults: Fetcher called with page",
				page,
				"and query",
				initialQuery
			);

			return fetchSearchMoviesService.getPaginated<PaginatedMoviesResponse>(
				searchParams
			);
		},
		[initialQuery]
	);

	// Handle empty search query
	useEffect(() => {
		console.log("SearchResults: Checking for empty query", {
			initialQuery,
			searchParams: searchParams.toString(),
		});
		if (!initialQuery.trim()) {
			console.log("SearchResults: No query found, redirecting to home");
			navigate("/", { replace: true });
		}
	}, [initialQuery, navigate, searchParams]);

	// For search results, we don't need complex default filters
	// The search is purely text-based
	const defaultFilters = useMemo(
		() => ({
			query: initialQuery,
			genres: [],
			minYear: "",
			maxYear: "",
			minRating: "",
			maxRating: "",
			minRuntime: "",
			maxRuntime: "",
			sortBy: "popularity.desc" as const,
		}),
		[initialQuery]
	);

	// If no query, don't render anything (will redirect)
	if (!initialQuery.trim()) {
		return null;
	}

	console.log("SearchResults: About to render MovieGridPageLayout");

	return (
		<MovieGridPageLayout
			title={`Search Results${initialQuery ? ` for "${initialQuery}"` : ""}`}
			fetcher={fetcher}
			source="search"
			showFilters={true}
			filterStyle="minimal"
			defaultFilters={defaultFilters}
		/>
	);
};

export default SearchResults;
