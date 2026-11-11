/** Watchlist save state and toast feedback; the caller owns optimistic display state. */

import { useState } from "react";
import type { MovieListItem } from "@/types/movie";
import { toggleMovieWatchlist } from "@/services/movieInteractionService";
import { toaster } from "@/components/core/chakra/toaster";

interface UseMovieActionsProps {
    movie: MovieListItem;
}

interface UseMovieActionsReturn {
    /** Save the watchlist state currently requested by the caller. */
    toggleWatchlist: (desiredValue: boolean) => Promise<void>;

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

export function useMovieActions({
    movie,
}: UseMovieActionsProps): UseMovieActionsReturn {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleWatchlist = async (desiredValue: boolean): Promise<void> => {
        setIsUpdating(true);
        setError(null);

        try {
            // Service returns the updated state - use it to determine what happened
            const result = await toggleMovieWatchlist(movie, desiredValue);
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
