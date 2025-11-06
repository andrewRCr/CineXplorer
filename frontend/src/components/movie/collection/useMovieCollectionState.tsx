import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { type MovieFilters as MovieFiltersType } from "@/components/movie/filters/AdvancedMovieFilters";
import { useMovieCollectionUrl } from "./useMovieCollectionUrl";

// Cached constants to prevent recreation
const DEFAULT_FILTERS: MovieFiltersType = {
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

// Pre-computed values for performance
const STANDARD_RUNTIME_RANGES = new Set(["0-90", "90-120", "120-150"]);
const DEFAULT_SORT = "popularity.desc";

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
}

// Minimal filter capabilities (Letterboxd-style UI)
const CORE_GENRE_IDS = [
  "28", // Action
  "35", // Comedy
  "99", // Documentary
  "18", // Drama
  "10751", // Family
  "27", // Horror
  "878", // Science Fiction
  "53", // Thriller
];

const MINIMAL_SORT_OPTIONS = [
  "popularity.desc",
  "release_date.desc",
  "original_title.asc",
  "vote_average.desc",
];

// Helper: Check if filters contain advanced filter values
// Exported for use in parent components to determine API filter style
export const hasAdvancedFilterValues = (filters: MovieFiltersType): boolean => {
  // Rating filters are advanced-only
  if (filters.minRating || filters.maxRating) return true;

  // Custom year range (not single year) is advanced-only
  if (filters.minYear && filters.maxYear && filters.minYear !== filters.maxYear) {
    return true;
  }

  // Multiple genres are advanced-only (minimal supports single genre only)
  if (filters.genres.length > 1) return true;

  // Non-core genres are advanced-only
  if (filters.genres.length === 1) {
    const genreId = String(filters.genres[0]);
    if (!CORE_GENRE_IDS.includes(genreId)) {
      return true;
    }
  }

  // Advanced sort options (minimal only has 4: popularity desc, release date desc, title asc, rating desc)
  if (filters.sortBy && !MINIMAL_SORT_OPTIONS.includes(filters.sortBy)) {
    return true;
  }

  return false;
};

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

  // Memoize initial local filter state to prevent recreation
  const initialLocalFilters = useMemo(() => ({
    ...DEFAULT_FILTERS,
    ...defaultFilters,
  }), [defaultFilters]);

  // Local UI state for non-URL-synced features
  const [localShowAdvanced, setLocalShowAdvanced] = useState(false);
  const [localIsFiltersCollapsed, setLocalIsFiltersCollapsed] = useState(false);

  // For non-URL-synced mode, maintain local filter state
  const [localFilters, setLocalFilters] = useState<MovieFiltersType>(initialLocalFilters);
  
  // Local pagination state for non-URL-synced mode
  const [localCurrentPage, setLocalCurrentPage] = useState<number | undefined>(1);
  
  // Choose between URL-synced or local state
  const filters = enableUrlSync ? urlFilters : localFilters;

  // Auto-expand advanced panel when advanced filters become active (from URL or user input)
  // This ensures panel stays expanded after navigation (remount reads filters from URL → effect detects → expands)
  useEffect(() => {
    if (enableAdvancedFilters && hasAdvancedFilterValues(filters)) {
      setLocalShowAdvanced(true);
    }
  }, [filters, enableAdvancedFilters]);

  // Optimize onFiltersChange with stable references
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
  
  // Optimize derived state with granular memoization
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.query ||
      filters.genres.length > 0 ||
      filters.minYear ||
      filters.maxYear ||
      filters.minRating ||
      filters.maxRating ||
      filters.minRuntime ||
      filters.maxRuntime ||
      (filters.sortBy && filters.sortBy !== DEFAULT_SORT)
    );
  }, [
    filters.query,
    filters.genres.length,
    filters.minYear,
    filters.maxYear,
    filters.minRating,
    filters.maxRating,
    filters.minRuntime,
    filters.maxRuntime,
    filters.sortBy,
  ]);
  
  const hasAdvancedFilters = useMemo(() => {
    // Check rating filters
    if (filters.minRating || filters.maxRating) return true;
    
    // Check custom year range (not single year)
    if (filters.minYear && filters.maxYear && filters.minYear !== filters.maxYear) {
      return true;
    }
    
    // Check custom runtime (not standard ranges)
    if (filters.minRuntime && filters.maxRuntime && filters.maxRuntime !== "999") {
      const runtimeRange = `${filters.minRuntime}-${filters.maxRuntime}`;
      return !STANDARD_RUNTIME_RANGES.has(runtimeRange);
    }
    
    return false;
  }, [
    filters.minRating,
    filters.maxRating,
    filters.minYear,
    filters.maxYear,
    filters.minRuntime,
    filters.maxRuntime,
  ]);
  
  const filterCount = useMemo(() => {
    let count = 0;
    
    if (filters.query) count++;
    if (filters.genres.length > 0) count += filters.genres.length;
    if (filters.minYear || filters.maxYear) count++;
    if (filters.minRating || filters.maxRating) count++;
    if (filters.minRuntime || filters.maxRuntime) count++;
    if (filters.sortBy !== DEFAULT_SORT) count++;
    
    return count;
  }, [
    filters.query,
    filters.genres.length,
    filters.minYear,
    filters.maxYear,
    filters.minRating,
    filters.maxRating,
    filters.minRuntime,
    filters.maxRuntime,
    filters.sortBy,
  ]);
  
  // Combined derived state for compatibility
  const derivedState = useMemo(() => ({
    hasActiveFilters,
    hasAdvancedFilters,
    filterCount,
  }), [hasActiveFilters, hasAdvancedFilters, filterCount]);
  
  // Memoize cleared filters object to prevent recreation
  const clearedFiltersRef = useRef<MovieFiltersType>(DEFAULT_FILTERS);

  // Actions with optimized object references
  const clearFilters = useCallback(() => {
    onFiltersChange(clearedFiltersRef.current);
    setShowAdvanced(false);
  }, [onFiltersChange, setShowAdvanced]);
  
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
  };
};
