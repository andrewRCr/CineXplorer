import { useEffect, useState, useCallback } from "react";
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
 * Used by useMovieDetail to manage the request lifecycle.
 *
 * @param fetcher - Function that returns { request: Promise, cancel: () => void }
 * @returns Object with data, error, loading state, and state setters
 */
export function useApiRequest<T>(
    fetcher: () => FetcherResult<T>,
): ApiRequestResult<T> {
    const [data, setData] = useState<T | undefined>();
    const [state, setState] = useState({ fetcher, error: "", isLoading: true });
    const changed = state.fetcher !== fetcher;
    if (changed) setState({ fetcher, error: "", isLoading: true });
    const error = changed ? "" : state.error;
    const isLoading = changed || state.isLoading;
    const setError = useCallback<React.Dispatch<React.SetStateAction<string>>>(
        (next) => {
            setState((current) => ({
                ...current,
                error: typeof next === "function" ? next(current.error) : next,
            }));
        },
        [],
    );

    useEffect(() => {
        let active = true;

        const { request, cancel } = fetcher();

        request
            .then((res) => {
                if (!active) return;
                // Atomic update of data and loading state
                setData(res.data);
                setState((current) => ({ ...current, isLoading: false }));
            })
            .catch((err: unknown) => {
                if (!active || err instanceof CanceledError) return;

                // Safely extract error message
                const message =
                    err instanceof Error ? err.message : String(err);

                setState({ fetcher, error: message, isLoading: false });
            });

        return () => {
            active = false;
            cancel();
        };
    }, [fetcher]);

    return { data, error, setData, setError, isLoading };
}
