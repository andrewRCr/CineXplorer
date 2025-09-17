import { useMemo } from 'react';

/**
 * Custom hook for managing pagination display logic
 * 
 * Handles:
 * - Determining when to show pagination controls
 * - Formatting pagination text and result counts
 * - Computing display states for better UX
 */
export function usePaginationDisplay(
  currentPage: number,
  total_pages?: number,
  total_results?: number,
  moviesCount: number = 0,
  isLoading: boolean = false,
  pageSize: number = 20
) {
  
  // Core display logic
  const hasMovies = moviesCount > 0;
  
  const shouldShowEmptyState = !isLoading && !hasMovies;
  
  const shouldShowPagination = hasMovies &&
    total_pages !== undefined &&
    total_pages > 1 &&
    !isNaN(total_pages) &&
    total_pages !== null &&
    total_pages > 0;

  // Result count formatting
  const resultText = useMemo(() => {
    if (!shouldShowPagination) return '';
    
    if (isLoading) return 'Loading results...';
    
    const startIndex = currentPage * pageSize - pageSize + 1;
    const endIndex = Math.min(
      currentPage * pageSize,
      (currentPage - 1) * pageSize + moviesCount
    );
    
    const totalText = !isNaN(total_results || 0)
      ? (total_results || 0) > 10000
        ? '10,000+'
        : (total_results || 0).toLocaleString()
      : '0';
    
    return `Showing ${startIndex}-${endIndex} of ${totalText} results`;
  }, [shouldShowPagination, isLoading, currentPage, pageSize, moviesCount, total_results]);

  // Pagination control visibility states
  const paginationVisibility = {
    opacity: shouldShowPagination ? 1 : 0,
    pointerEvents: shouldShowPagination ? 'auto' as const : 'none' as const,
  };

  return {
    hasMovies,
    shouldShowEmptyState,
    shouldShowPagination,
    resultText,
    paginationVisibility,
  };
}