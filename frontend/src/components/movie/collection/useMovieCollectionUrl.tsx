import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { type MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import { initializeFiltersFromUrl } from "@/utilities/urlSync";

export const useMovieCollectionUrl = (
	defaultFilters?: Partial<MovieFiltersType>,
	actualSource?: string
) => {
	const location = useLocation();
	const navigate = useNavigate();

	// This is now the single source of truth for all filters.
	const [unifiedFilters, setUnifiedFilters] = useState<MovieFiltersType>({
		query: "",
		genres: [],
		minYear: "",
		maxYear: "",
		minRating: "",
		maxRating: "",
		minRuntime: "",
		maxRuntime: "",
		sortBy: "popularity.desc",
		...defaultFilters,
	});

	// Parse current page from URL
	const getCurrentPageFromUrl = useCallback((): number | undefined => {
		if (typeof window === "undefined") return undefined;
		const params = new URLSearchParams(location.search);
		const pageParam = params.get("page");
		const page = pageParam ? parseInt(pageParam, 10) : undefined;
		return page && !isNaN(page) && page > 0 ? page : undefined;
	}, [location.search]);

	const [currentPageFromUrl, setCurrentPageFromUrl] = useState<
		number | undefined
	>(getCurrentPageFromUrl());

	// This effect is the SINGLE SOURCE OF TRUTH for filters and page number.
	// It runs whenever the URL's search parameters change.
	useEffect(() => {
		const newPage = getCurrentPageFromUrl();
		setCurrentPageFromUrl(newPage);

		const { filters: urlFilters, minimalFilters: urlMinimalFilters } =
			initializeFiltersFromUrl(location.search);

		// Combine the filters. Note: This is a shallow merge.
		// You might need a more sophisticated merge strategy if there are overlapping fields
		// that need to be handled in a specific way (e.g., `year` vs `minYear`/`maxYear`).
		const newUnifiedFilters = {
			...unifiedFilters, // Start with existing state to not lose anything
			...urlFilters,
			...urlMinimalFilters,
			// Explicitly handle sortBy to ensure it's correctly typed and prioritized.
			sortBy: (urlMinimalFilters.sortBy ||
				urlFilters.sortBy) as MovieFiltersType["sortBy"],
		};

		setUnifiedFilters(newUnifiedFilters);
	}, [location.search, getCurrentPageFromUrl]);

	// This callback is passed to the grid to handle page changes
	const handlePageChange = useCallback(
		(page: number) => {
			const searchParams = new URLSearchParams(location.search);
			if (page === 1) {
				searchParams.delete("page");
			} else {
				searchParams.set("page", page.toString());
			}
			navigate(`${location.pathname}?${searchParams.toString()}`, {});
		},
		[location.pathname, location.search, navigate]
	);

	// This callback is passed to ALL filter components.
	// It constructs a new URL and uses navigate() to update it.
	const handleUnifiedFiltersChange = useCallback(
		(
			newFiltersOrUpdater:
				| Partial<MovieFiltersType>
				| ((prev: MovieFiltersType) => MovieFiltersType)
		) => {
			const newFilters =
				typeof newFiltersOrUpdater === "function"
					? newFiltersOrUpdater(unifiedFilters)
					: { ...unifiedFilters, ...newFiltersOrUpdater };

			const searchParams = new URLSearchParams(location.search);
			searchParams.delete("page");

			Object.entries(newFilters).forEach(([key, value]) => {
				if (
					value === "" ||
					(Array.isArray(value) && value.length === 0) ||
					(key === "sortBy" && value === "popularity.desc")
				) {
					searchParams.delete(key);
				} else if (Array.isArray(value)) {
					searchParams.set(key, value.join(","));
				} else {
					searchParams.set(key, String(value));
				}
			});

			navigate(`${location.pathname}?${searchParams.toString()}`, {
				replace: true,
			});
		},
		[unifiedFilters, location.pathname, location.search, navigate]
	);

	// Reset pagination state when route/source changes (but not on browser back/forward)
	// We use a ref to track the previous route to distinguish between programmatic navigation
	// and browser back/forward navigation
	const previousRouteRef = useRef<string | null>(null);
	
	useEffect(() => {
		const currentRouteKey = `${location.pathname}:${actualSource}`;
		
		// If this is the first visit to this component, just store the route
		if (previousRouteRef.current === null) {
			previousRouteRef.current = currentRouteKey;
			return;
		}
		
		// If the route/source has changed, this might be a forward navigation
		if (previousRouteRef.current !== currentRouteKey) {
			// Check if this looks like browser back/forward navigation
			// Browser navigation typically preserves the full URL including query params
			const hasPageParam = new URLSearchParams(location.search).has("page");
			
			// If we have page param, this is likely browser back/forward navigation
			// If no page param, this is likely a fresh navigation that should reset to page 1
			if (!hasPageParam) {
				// This appears to be a fresh navigation (clicking nav links, etc.)
				// Reset pagination state
				const searchParams = new URLSearchParams(location.search);
				searchParams.delete("page");
				navigate(`${location.pathname}?${searchParams.toString()}`, {
					replace: true,
				});
			}
			// If hasPageParam is true, we preserve it (likely browser navigation)
		}
		
		previousRouteRef.current = currentRouteKey;
	}, [actualSource, location.pathname, location.search, navigate]);

	return {
		unifiedFilters,
		currentPageFromUrl,
		handlePageChange,
		handleUnifiedFiltersChange,
	};
};