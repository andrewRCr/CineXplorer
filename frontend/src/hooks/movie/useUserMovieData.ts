import { useState, useEffect, useRef } from "react";
import {
    getUserMovieDataByTmdbId,
    saveUserMovieData,
} from "@/services/userMovieDataService";
import { getErrorStatus } from "@/utilities/axiosErrorUtils";
import logger from "@/services/logger";
import type { components } from "@/types/api";

// Use backend schema types directly (snake_case convention)
export type UserMovieData = components["schemas"]["UserMovieDataSchema"];
type UserMovieDataUpdate = components["schemas"]["UserMovieDataPatchSchema"];

/** Runtime type guard for UserMovieData - validates required fields from API response */
function isUserMovieData(obj: unknown): obj is UserMovieData {
    if (typeof obj !== "object" || obj === null) return false;
    const data = obj as Record<string, unknown>;
    return (
        typeof data.tmdb_id === "number" &&
        typeof data.user_on_watchlist === "boolean" &&
        typeof data.user_watched === "boolean" &&
        typeof data.user_liked === "boolean"
    );
}

/** Parse and validate tmdbId string to number, returns null if invalid */
function parseValidTmdbId(tmdbId: string): number | null {
    const trimmed = tmdbId.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null;
}

export function useUserMovieData(tmdbId: string): {
    data: UserMovieData | null;
    loading: boolean;
    error: string | null;
    update: (changes: Partial<UserMovieDataUpdate>) => Promise<void>;
} {
    const id = parseValidTmdbId(tmdbId);
    const [state, setState] = useState<{
        tmdbId: string;
        data: UserMovieData | null;
        loading: boolean;
        error: string | null;
    }>(() => ({
        tmdbId,
        data: null,
        loading: id !== null,
        error: id === null ? "Invalid movie ID format" : null,
    }));
    const changed = state.tmdbId !== tmdbId;
    const current = changed
        ? {
              ...state,
              tmdbId,
              data: id === null ? null : state.data,
              loading: id !== null,
              error: id === null ? "Invalid movie ID format" : state.error,
          }
        : state;
    if (changed) setState(current);
    const { data, loading, error } = current;
    const activeRequest = useRef<{ active: boolean } | null>(null);

    useEffect(() => {
        const scope = { active: true };
        activeRequest.current = scope;
        if (id === null)
            return () => {
                scope.active = false;
            };
        const req = getUserMovieDataByTmdbId({ tmdb_id: id });
        req.request
            .then((res) => {
                if (!scope.active) return;
                if (isUserMovieData(res.data)) {
                    setState({
                        tmdbId,
                        data: res.data,
                        error: null,
                        loading: false,
                    });
                } else {
                    logger.error("Invalid UserMovieData response");
                    setState({
                        tmdbId,
                        data: null,
                        error: "Invalid response format from server",
                        loading: false,
                    });
                }
            })
            .catch((err: unknown) => {
                if (!scope.active) return;
                setState({
                    tmdbId,
                    data: null,
                    error:
                        getErrorStatus(err) === 404
                            ? null
                            : err instanceof Error
                              ? err.message
                              : "Failed to fetch user movie data",
                    loading: false,
                });
            });
        return () => {
            scope.active = false;
            req.cancel();
        };
    }, [tmdbId, id]);

    const update = async (changes: Partial<UserMovieDataUpdate>) => {
        const scope = activeRequest.current;
        if (id === null || !scope?.active) {
            logger.warn("Cannot save: no active movie");
            return;
        }
        setState((previous) => ({ ...previous, loading: true }));
        try {
            const response = await saveUserMovieData(id, changes);
            if (!scope.active) return;
            if (isUserMovieData(response.data)) {
                setState({
                    tmdbId,
                    data: response.data,
                    error: null,
                    loading: false,
                });
            } else {
                logger.error("Invalid UserMovieData update response");
                setState((previous) => ({
                    ...previous,
                    error: "Invalid response format from server",
                    loading: false,
                }));
            }
        } catch (err: unknown) {
            if (!scope.active) return;
            logger.error("Failed to update user movie data", {
                errorType: err instanceof Error ? err.name : "unknown",
            });
            setState((previous) => ({
                ...previous,
                error:
                    err instanceof Error
                        ? err.message
                        : "Failed to update user movie data",
                loading: false,
            }));
        }
    };

    return { data, loading, error, update };
}
