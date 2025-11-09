import { useState, useEffect } from "react";
import {
    getUserMovieDataByTmdbId,
    updateUserMovieData,
} from "../services/userMovieDataService";
import type { components } from "../types/api";

// Use backend schema types directly (snake_case convention)
export type UserMovieData = components["schemas"]["UserMovieDataDetailSchema"];
type UserMovieDataUpdate = components["schemas"]["UserMovieDataUpdateSchema"];

export function useUserMovieData(tmdbId: string): {
    data: UserMovieData | null;
    loading: boolean;
    error: string | null;
    update: (changes: Partial<UserMovieDataUpdate>) => Promise<void>;
} {
    const [data, setData] = useState<UserMovieData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tmdbId) return; // don't fetch if tmdbId is empty
        setLoading(true);
        const tmdbIdNum = Number(tmdbId);
        getUserMovieDataByTmdbId({ tmdb_id: tmdbIdNum })
            .request.then((res) => {
                setData(res.data);
                setError(null);
            })
            .catch((err: unknown) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch user movie data"
                );
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [tmdbId]);

    const update = async (changes: Partial<UserMovieDataUpdate>) => {
        if (!data || !data.id) return;
        setLoading(true);
        try {
            const response = await updateUserMovieData(data.id, changes);
            setData(response.data as UserMovieData);
            setError(null);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update user movie data"
            );
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, update };
}
