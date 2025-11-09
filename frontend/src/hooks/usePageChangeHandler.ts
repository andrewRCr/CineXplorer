import { useCallback } from "react";

/**
 * Custom hook to handle page change events
 * Provides consistent page change handling with proper logging and error handling
 */
export function usePageChangeHandler(onPageChange?: (page: number) => void) {
    const handlePageChange = useCallback(
        (page: number) => {
            if (onPageChange) {
                console.log(
                    "MovieGrid: handlePageChange called, passing to parent with page",
                    page
                );
                onPageChange(page);
            } else {
                console.warn("MovieGrid: onPageChange handler is not provided.");
            }
        },
        [onPageChange]
    );

    return { handlePageChange };
}
