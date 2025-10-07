import { useState, useEffect } from "react";
import {
	getUserMovieData,
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
		getUserMovieData(tmdbId)
			.then((res) => {
				setData(res);
				setError(null);
			})
			.catch((err) => {
				setError(err.message || "Failed to fetch user movie data");
				setData(null);
			})
			.finally(() => setLoading(false));
	}, [tmdbId]);

	const update = async (changes: Partial<UserMovieDataUpdate>) => {
		if (!data || !data.id) return;
		setLoading(true);
		try {
			const updated = await updateUserMovieData(String(data.id), changes);
			setData(updated);
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
