/**
 * useMovieActions Hook
 *
 * Custom hook for managing movie interactions (watchlist, watched, liked, rating, review).
 *
 * Architecture Pattern: Hook Facade
 * - Encapsulates state management (loading, error)
 * - Wraps service functions with UI-friendly API
 * - Survives state management migrations (TanStack Query target)
 *
 * Current Implementation:
 * - Manual state management with useState
 *
 * Future Implementation (Frontend Modernization):
 * - TanStack Query mutations (swap internals, keep API)
 * - Optimistic updates with automatic rollback
 * - Cache invalidation patterns
 *
 * Usage:
 * ```typescript
 * const { toggleWatchlist, isUpdating, error } = useMovieActions({ movie });
 *
 * <IconButton onClick={toggleWatchlist} disabled={isUpdating}>
 *   <RiPlayListAddLine />
 * </IconButton>
 * ```
 *
 * Related:
 * - movieInteractionService.ts: Pure service functions (business logic)
 * - MovieCard.tsx: Component integration
 */

import { useState } from "react";
import type { MovieListItem } from "@/@types/movie.d";
import { toggleMovieWatchlist } from "@/services/movieInteractionService";
import { toaster } from "@/components/core/chakra/toaster";

interface UseMovieActionsProps {
    movie: MovieListItem;
}

interface UseMovieActionsReturn {
    /**
     * Toggle movie's watchlist status
     * - Creates entry if movie.user_movie_data is null
     * - Updates entry if it exists
     * - Handles race conditions automatically
     */
    toggleWatchlist: () => Promise<void>;

    /**
     * Loading state during API calls
     * Use to disable UI elements during mutations
     */
    isUpdating: boolean;

    /**
     * Error state from failed API calls
     * Automatically cleared on next successful call
     */
    error: string | null;
}

/**
 * Hook for movie interactions with state management
 *
 * Provides action functions with built-in loading and error handling.
 * Designed to be replaced with TanStack Query mutations during
 * Frontend Modernization (component API stays identical).
 *
 * @param props - Hook configuration
 * @param props.movie - Movie object with optional user_movie_data
 * @returns Action functions and state (toggleWatchlist, isUpdating, error)
 *
 * @example
 * ```typescript
 * const { toggleWatchlist, isUpdating, error } = useMovieActions({ movie });
 *
 * const handleClick = async () => {
 *   await toggleWatchlist();
 *   // Show success notification
 * };
 * ```
 *
 * Note: Component should handle optimistic UI updates locally.
 * Hook only manages API call state (loading, error).
 */
export function useMovieActions({
    movie,
}: UseMovieActionsProps): UseMovieActionsReturn {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Toggle watchlist status with state management
     *
     * Flow:
     * 1. Set isUpdating to true
     * 2. Clear previous errors
     * 3. Call service function (handles CREATE vs UPDATE)
     * 4. On success: clear error, set isUpdating to false
     * 5. On error: set error message, set isUpdating to false
     *
     * Note: Caller should handle optimistic UI updates before calling this.
     */
    const toggleWatchlist = async (): Promise<void> => {
        setIsUpdating(true);
        setError(null);

        try {
            // Service returns the updated state - use it to determine what happened
            const result = await toggleMovieWatchlist(movie);
            const isNowOnWatchlist = result.user_on_watchlist;

            // Success toast based on new state (not stale prop)
            // Note: Undo action deferred - requires state sync infrastructure (see backlog)
            toaster.success({
                title: isNowOnWatchlist
                    ? "Added to watchlist"
                    : "Removed from watchlist",
            });
        } catch (err: unknown) {
            // Error: Extract message from various error formats
            let errorMessage = "Failed to update watchlist";
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === "object" && err !== null) {
                // Handle Axios-like errors
                const axiosErr = err as {
                    response?: { data?: { detail?: string } };
                    message?: string;
                };
                errorMessage =
                    axiosErr.response?.data?.detail ??
                    axiosErr.message ??
                    errorMessage;
            }
            setError(errorMessage);

            toaster.error({
                title: "Failed to update watchlist",
                description: "Please try again.",
            });

            throw err; // Re-throw for caller to handle rollback
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        toggleWatchlist,
        isUpdating,
        error,
    };
}
