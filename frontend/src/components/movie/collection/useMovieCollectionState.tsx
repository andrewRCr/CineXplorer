import { useState, useCallback, useMemo } from "react";
import { type MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import { useMovieCollectionUrl } from "./useMovieCollectionUrl";

// Better hook composition with multiple related concerns
interface UseMovieCollectionStateConfig {
	defaultFilters?: Partial<MovieFiltersType>;
	source?: string;
	// Hook configuration
	enableUrlSync?: boolean;
	enableAdvancedFilters?: boolean;
	enableCollapsibleFilters?: boolean;
}

interface MovieCollectionState {
	// Filter state
	filters: MovieFiltersType;
	onFiltersChange: (
		filters:
			| Partial<MovieFiltersType>
			| ((prev: MovieFiltersType) => MovieFiltersType)
	) => void;
	
	// UI state
	showAdvanced: boolean;
	setShowAdvanced: (show: boolean) => void;
	toggleAdvanced: () => void;
	
	isFiltersCollapsed: boolean;
	setIsFiltersCollapsed: (collapsed: boolean) => void;
	toggleFiltersCollapsed: () => void;
	
	// Pagination state
	currentPage: number | undefined;
	onPageChange: (page: number) => void;
	
	// Derived state
	hasActiveFilters: boolean;
	hasAdvancedFilters: boolean;
	filterCount: number;
	
	// Actions
	clearFilters: () => void;
	resetToDefaults: () => void;
}

// Custom hook with better composition and TypeScript
export const useMovieCollectionState = ({
	defaultFilters,
	source,
	enableUrlSync = true,
	enableAdvancedFilters = true,
	enableCollapsibleFilters = true,
}: UseMovieCollectionStateConfig = {}): MovieCollectionState => {
	
	// URL management (only if enabled)
	const urlState = useMovieCollectionUrl(
		enableUrlSync ? defaultFilters : undefined,
		enableUrlSync ? source : undefined
	);
	
	// Extract specific functions for stable dependencies
	const { 
		unifiedFilters: urlFilters,
		handleUnifiedFiltersChange: urlHandleFiltersChange,
		currentPageFromUrl: urlCurrentPage,
		handlePageChange: urlHandlePageChange
	} = urlState;
	
	// Local UI state for non-URL-synced features
	const [localShowAdvanced, setLocalShowAdvanced] = useState(false);
	const [localIsFiltersCollapsed, setLocalIsFiltersCollapsed] = useState(false);
	
	// For non-URL-synced mode, maintain local filter state
	const [localFilters, setLocalFilters] = useState<MovieFiltersType>({
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
	
	// Local pagination state for non-URL-synced mode
	const [localCurrentPage, setLocalCurrentPage] = useState<number | undefined>(1);
	
	// Choose between URL-synced or local state
	const filters = enableUrlSync ? urlFilters : localFilters;
	const onFiltersChange = useCallback((newFilters: Partial<MovieFiltersType> | ((prev: MovieFiltersType) => MovieFiltersType)) => {
		if (enableUrlSync) {
			urlHandleFiltersChange(newFilters);
		} else {
			if (typeof newFilters === 'function') {
				setLocalFilters(newFilters);
			} else {
				setLocalFilters(prev => ({ ...prev, ...newFilters }));
			}
		}
	}, [enableUrlSync, urlHandleFiltersChange]);
	
	const currentPage = enableUrlSync ? urlCurrentPage : localCurrentPage;
	const onPageChange = enableUrlSync ? urlHandlePageChange : setLocalCurrentPage;
	
	// Advanced filters toggle with better UX
	const showAdvanced = enableAdvancedFilters ? localShowAdvanced : false;
	const setShowAdvanced = useCallback((show: boolean) => {
		if (enableAdvancedFilters) {
			setLocalShowAdvanced(show);
		}
	}, [enableAdvancedFilters]);
	
	const toggleAdvanced = useCallback(() => {
		setShowAdvanced(!showAdvanced);
	}, [showAdvanced, setShowAdvanced]);
	
	// Collapsible filters with better UX
	const isFiltersCollapsed = enableCollapsibleFilters ? localIsFiltersCollapsed : false;
	const setIsFiltersCollapsed = useCallback((collapsed: boolean) => {
		if (enableCollapsibleFilters) {
			setLocalIsFiltersCollapsed(collapsed);
		}
	}, [enableCollapsibleFilters]);
	
	const toggleFiltersCollapsed = useCallback(() => {
		setIsFiltersCollapsed(!isFiltersCollapsed);
	}, [isFiltersCollapsed, setIsFiltersCollapsed]);
	
	// Derived state with memoization for performance
	const derivedState = useMemo(() => {
		const hasActiveFilters = Boolean(
			filters.query ||
			filters.genres.length > 0 ||
			filters.minYear ||
			filters.maxYear ||
			filters.minRating ||
			filters.maxRating ||
			filters.minRuntime ||
			filters.maxRuntime ||
			(filters.sortBy && filters.sortBy !== "popularity.desc")
		);
		
		const hasAdvancedFilters = Boolean(
			filters.minRating ||
			filters.maxRating ||
			(filters.minYear && filters.maxYear && filters.minYear !== filters.maxYear) ||
			(filters.minRuntime && filters.maxRuntime && 
			 !["0-90", "90-120", "120-150"].includes(`${filters.minRuntime}-${filters.maxRuntime}`) &&
			 filters.maxRuntime !== "999")
		);
		
		const filterCount = [
			filters.query && 1,
			filters.genres.length,
			(filters.minYear || filters.maxYear) && 1,
			(filters.minRating || filters.maxRating) && 1,
			(filters.minRuntime || filters.maxRuntime) && 1,
			filters.sortBy !== "popularity.desc" && 1,
		].filter(Boolean).length;
		
		return {
			hasActiveFilters,
			hasAdvancedFilters,
			filterCount,
		};
	}, [filters]);
	
	// Actions with better error handling and validation
	const clearFilters = useCallback(() => {
		const clearedFilters: MovieFiltersType = {
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
		onFiltersChange(clearedFilters);
		setShowAdvanced(false);
	}, [onFiltersChange, setShowAdvanced]);
	
	const resetToDefaults = useCallback(() => {
		const resetFilters: MovieFiltersType = {
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
		};
		onFiltersChange(resetFilters);
		setShowAdvanced(false);
		setIsFiltersCollapsed(false);
	}, [defaultFilters, onFiltersChange, setShowAdvanced, setIsFiltersCollapsed]);
	
	return {
		// State
		filters,
		onFiltersChange,
		showAdvanced,
		setShowAdvanced,
		toggleAdvanced,
		isFiltersCollapsed,
		setIsFiltersCollapsed,
		toggleFiltersCollapsed,
		currentPage,
		onPageChange,
		
		// Derived state
		...derivedState,
		
		// Actions
		clearFilters,
		resetToDefaults,
	};
};