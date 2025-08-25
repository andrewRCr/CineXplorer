import { useState, useEffect } from "react";
import {
	getUserMovieData,
	updateUserMovieData,
} from "../services/userMovieDataService";

export interface UserMovieData {
	pk: string;
	movieId: string;
	inWatchlist: boolean;
	watched: boolean;
	liked: boolean;
}

export function useUserMovieData(tmdbId: string) {
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

	const update = async (changes: Partial<UserMovieData>) => {
		if (!data || !data.pk) return;
		setLoading(true);
		try {
			const updated = await updateUserMovieData(data.pk, changes);
			setData(updated);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to update user movie data");
		} finally {
			setLoading(false);
		}
	};

	return { data, loading, error, update };
}
