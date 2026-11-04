import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client configuration for CineXplorer.
 *
 * Default settings optimized for movie discovery data:
 * - staleTime: 5 minutes (movie data doesn't change frequently)
 * - gcTime: 30 minutes (keep cached data available for back navigation)
 * - retry: 2 attempts with exponential backoff
 * - refetchOnWindowFocus: false (avoid unnecessary refetches during browsing)
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Movie data is relatively stable - 5 minute stale time
            staleTime: 5 * 60 * 1000,

            // Keep unused data in cache for 30 minutes
            // Supports scroll position restoration on back navigation
            gcTime: 30 * 60 * 1000,

            // Retry failed requests twice with exponential backoff
            retry: 2,
            retryDelay: (attemptIndex) =>
                Math.min(1000 * 2 ** attemptIndex, 30000),

            // Don't refetch on window focus - browsing shouldn't trigger reloads
            refetchOnWindowFocus: false,

            // Don't refetch on reconnect by default
            refetchOnReconnect: false,
        },
    },
});
