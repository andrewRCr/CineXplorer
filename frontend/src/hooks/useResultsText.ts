import { useMemo } from "react";

/**
 * Format total results count for display
 * - Numbers <= 10,000 shown with locale formatting (e.g., "1,234")
 * - Numbers > 10,000 shown as "10,000+" (TMDB API caps at 10,000)
 */
function formatTotalResults(total: number | undefined): string {
  if (total === undefined || isNaN(total)) return "0";
  if (total > 10000) return "10,000+";
  return total.toLocaleString();
}

/**
 * Generate results text for infinite scroll mode
 *
 * Shows: "X results" - simple total count
 * Handles the 10,000+ cap for large result sets
 */
export function useInfiniteResultsText(
  totalResults: number | undefined,
  isLoading: boolean
): string {
  return useMemo(() => {
    if (isLoading && totalResults === undefined) return "Loading results...";
    if (totalResults === undefined || totalResults === 0) return "";

    const totalText = formatTotalResults(totalResults);
    return `${totalText} results`;
  }, [totalResults, isLoading]);
}

/**
 * Generate results text for sequential pagination mode
 *
 * Shows: "Showing X-Y of Z results" for discrete page ranges
 */
export function useSequentialResultsText(
  pageIndex: number,
  pageSize: number,
  currentPageCount: number,
  totalResults: number | undefined,
  isLoading: boolean
): string {
  return useMemo(() => {
    if (isLoading && currentPageCount === 0) return "Loading results...";
    if (currentPageCount === 0) return "";

    const startIndex = pageIndex * pageSize + 1;
    const endIndex = pageIndex * pageSize + currentPageCount;
    const totalText = formatTotalResults(totalResults);

    return `Showing ${startIndex.toLocaleString()}-${endIndex.toLocaleString()} of ${totalText} results`;
  }, [pageIndex, pageSize, currentPageCount, totalResults, isLoading]);
}
