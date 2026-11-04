import { useEffect, useState } from "react";
import { CanceledError } from "@/services/apiClient";

interface ApiRequestResult<T> {
    data: T | undefined;
    error: string;
    setData: React.Dispatch<React.SetStateAction<T | undefined>>;
    setError: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
}

interface FetcherResult<T> {
    request: Promise<{ data: T }>;
    cancel: () => void;
}

/**
 * Generic API Request Hook
 *
 * **Purpose:** Generic HTTP layer providing loading/error state management and request cancellation.
 *
 * **Responsibilities:**
 * - Executes provided fetcher function
 * - Manages loading, error, and data states
 * - Handles request cancellation on component unmount
 * - Re-fetches when fetcher reference changes
 *
 * **Data Flow Position:**
 * ```
 * [Any Hook] → useApiRequest → HTTP Request
 * ```
 *
 * **Design:** Generic reusable hook - not specific to movies or any domain.
 * Used by usePaginatedMovies, useMovieDetail, and other data-fetching hooks.
 *
 * @param fetcher - Function that returns { request: Promise, cancel: () => void }
 * @returns Object with data, error, loading state, and state setters
 */
export function useApiRequest<T>(
    fetcher: () => FetcherResult<T>,
): ApiRequestResult<T> {
    const [data, setData] = useState<T | undefined>();
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        setError("");

        const { request, cancel } = fetcher();

        request
            .then((res) => {
                // Atomic update of data and loading state
                setData(res.data);
                setIsLoading(false);
            })
            .catch((err: unknown) => {
                if (err instanceof CanceledError) return;

                // Safely extract error message
                const message =
                    err instanceof Error ? err.message : String(err);

                setError(message);
                setIsLoading(false); // Also set loading to false on error
            });

        return () => {
            cancel();
        };
    }, [fetcher]);

    return { data, error, setData, setError, isLoading };
}
