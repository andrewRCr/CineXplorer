import { useCallback } from "react";

/**
 * Custom hook to handle page change events
 * Provides consistent page change handling with proper logging and error handling
 *
 * @param onPageChange - Callback from parent, accepts page and optional tmdb_page_start
 * @param getTmdbPageStart - Optional getter for current tmdb_page_start metadata
 */
export function usePageChangeHandler(
    onPageChange?: (page: number, tmdb_page_start?: number) => void,
    getTmdbPageStart?: () => number | undefined
) {
    const handlePageChange = useCallback(
        (page: number) => {
            if (onPageChange) {
                const tmdbPageStart = getTmdbPageStart?.();
                console.log(
                    "MovieGrid: handlePageChange called, passing to parent with page",
                    page,
                    "tmdb_page_start",
                    tmdbPageStart
                );
                onPageChange(page, tmdbPageStart);
            } else {
                console.warn("MovieGrid: onPageChange handler is not provided.");
            }
        },
        [onPageChange, getTmdbPageStart]
    );

    return { handlePageChange };
}
