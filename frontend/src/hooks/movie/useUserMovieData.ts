import { useState, useEffect, useRef } from "react";
import {
    getUserMovieDataByTmdbId,
    updateUserMovieData,
} from "@/services/userMovieDataService";
import logger from "@/services/logger";
import type { components } from "@/types/api";

// Use backend schema types directly (snake_case convention)
export type UserMovieData = components["schemas"]["UserMovieDataDetailSchema"];
type UserMovieDataUpdate = components["schemas"]["UserMovieDataUpdateSchema"];

/** Runtime type guard for UserMovieData - validates required fields from API response */
function isUserMovieData(obj: unknown): obj is UserMovieData {
    if (typeof obj !== "object" || obj === null) return false;
    const data = obj as Record<string, unknown>;
    return (
        typeof data.id === "number" &&
        typeof data.tmdb_id === "number" &&
        typeof data.user_on_watchlist === "boolean" &&
        typeof data.user_watched === "boolean"
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
    const [data, setData] = useState<UserMovieData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track mounted state to prevent setState after unmount
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        const tmdbIdNum = parseValidTmdbId(tmdbId);
        if (tmdbIdNum === null) {
            setError("Invalid movie ID format");
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const req = getUserMovieDataByTmdbId({ tmdb_id: tmdbIdNum });

        req.request
            .then((res) => {
                if (!mounted.current) return;
                if (isUserMovieData(res.data)) {
                    setData(res.data);
                    setError(null);
                } else {
                    logger.error("Invalid UserMovieData response", {
                        response: res.data,
                    });
                    setError("Invalid response format from server");
                    setData(null);
                }
            })
            .catch((err: unknown) => {
                if (!mounted.current) return;
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch user movie data"
                );
                setData(null);
            })
            .finally(() => {
                if (mounted.current) setLoading(false);
            });

        return () => {
            mounted.current = false;
            if (req && typeof req.cancel === "function") {
                req.cancel();
            }
        };
    }, [tmdbId]);

    const update = async (changes: Partial<UserMovieDataUpdate>) => {
        if (!data || !data.id) {
            logger.warn("Cannot update: no user movie data loaded");
            return;
        }
        if (mounted.current) setLoading(true);
        try {
            const response = await updateUserMovieData(data.id, changes);
            if (!mounted.current) return;
            if (isUserMovieData(response.data)) {
                setData(response.data);
                setError(null);
            } else {
                logger.error("Invalid UserMovieData update response", {
                    response: response.data,
                });
                setError("Invalid response format from server");
            }
        } catch (err: unknown) {
            if (!mounted.current) return;
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update user movie data"
            );
        } finally {
            if (mounted.current) setLoading(false);
        }
    };

    return { data, loading, error, update };
}
