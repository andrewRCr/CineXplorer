import apiClient from "./apiClient";
import { type UserMovieData } from "../hooks/useUserMovieData";

// Fetch user-specific data for a movie
export async function getUserMovieData(tmdbId: string): Promise<UserMovieData> {
	const response = await apiClient.get(
		`/user-movie-data/by-tmdb-id/?tmdb_id=${tmdbId}`
	);
	return response.data;
}

// Update user-specific data for a movie - uses PK, not TMDB ID
export async function updateUserMovieData(
	movieId: string,
	changes: Partial<UserMovieData>
): Promise<UserMovieData> {
	const response = await apiClient.patch(
		`/user-movie-data/${movieId}/`,
		changes
	);
	return response.data;
}
